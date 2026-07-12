import os
import re
import logging

import requests
from requests.auth import HTTPBasicAuth

from src.shared.config import settings
from src.shared.sld_templates import get_sld_for_layer, get_default_sld_for_geometry

logger = logging.getLogger(__name__)


class GeoServerClient:
    def __init__(
        self,
        base_url: str = "",
        username: str = "",
        password: str = "",
        workspace: str = "",
    ):
        self.base_url = (base_url or settings.GEOSERVER_URL).rstrip("/")
        self.username = username or settings.GEOSERVER_USER
        self.password = password or settings.GEOSERVER_PASSWORD
        self.workspace = workspace or settings.GEOSERVER_WORKSPACE
        self.auth = HTTPBasicAuth(self.username, self.password)
        self.enabled = bool(self.base_url) and self._check_connection()

    def _rest(self, path: str) -> str:
        return f"{self.base_url}/rest/{path.lstrip('/')}"

    def _check_connection(self) -> bool:
        try:
            resp = requests.get(self._rest("about/status"), auth=self.auth, timeout=10)
            return resp.status_code == 200
        except requests.RequestException:
            return False

    def _ensure_workspace(self) -> None:
        resp = requests.get(
            self._rest(f"workspaces/{self.workspace}"), auth=self.auth, timeout=10
        )
        if resp.status_code == 200:
            return
        requests.post(
            self._rest("workspaces"),
            headers={"Content-Type": "application/json"},
            json={"workspace": {"name": self.workspace}},
            auth=self.auth,
            timeout=10,
        )

    @staticmethod
    def _store_name(overlay_id: str, name: str) -> str:
        safe = re.sub(r"[^a-zA-Z0-9_]", "_", name).strip("_")
        return f"overlay_{overlay_id}_{safe}"[:60]

    def publish_gpkg(self, overlay_id: str, name: str, gpkg_path: str) -> dict | None:
        """Upload a GeoPackage to GeoServer and publish all its layers.

        Returns dict with:
          - mvt_url: GeoServer MVT tile endpoint
          - wms_url: GeoServer WMS endpoint
          - wfs_url: GeoServer WFS endpoint
          - layer_names: list of published layer names (workspace:layer)
        """
        if not self.enabled or not self.base_url:
            return None

        self._ensure_workspace()
        store_name = self._store_name(overlay_id, name)

        # Remove existing store if present
        self._delete_store(store_name)

        # Upload GeoPackage via REST API
        url = self._rest(
            f"workspaces/{self.workspace}/datastores/{store_name}/file.gpkg"
        )
        with open(gpkg_path, "rb") as f:
            resp = requests.put(
                url,
                params={"configure": "all", "update": "overwrite"},
                headers={"Content-Type": "application/geopackage+sqlite3"},
                data=f,
                auth=self.auth,
                timeout=120,
            )

        if resp.status_code not in (200, 201):
            raise RuntimeError(
                f"Failed to upload GeoPackage: {resp.status_code} {resp.text[:300]}"
            )

        # Discover published layer names
        layer_names = self._get_store_layers(store_name)

        # Publish S-52 compliant SLD styles for each layer
        self._publish_sld_styles(layer_names)

        return {
            "wms_url": f"{self.base_url}/{self.workspace}/wms",
            "wfs_url": f"{self.base_url}/{self.workspace}/wfs",
            "layer_names": [f"{self.workspace}:{ln}" for ln in layer_names],
            "store_name": store_name,
        }

    def _get_store_layers(self, store_name: str) -> list[str]:
        """Get list of published feature type names from a datastore."""
        url = self._rest(
            f"workspaces/{self.workspace}/datastores/{store_name}/featuretypes.json"
        )
        resp = requests.get(url, auth=self.auth, timeout=10)
        if resp.status_code != 200:
            return []
        data = resp.json()
        types = data.get("featureTypes", {}).get("featureType", [])
        return [t["name"] for t in types] if types else []

    def _delete_store(self, store_name: str) -> None:
        url = self._rest(f"workspaces/{self.workspace}/datastores/{store_name}")
        requests.delete(
            url, params={"recurse": "true"}, auth=self.auth, timeout=30
        )

    def _publish_sld_styles(self, layer_names: list[str]) -> None:
        """Create S-52 compliant SLD styles for each layer and assign them."""
        for layer_name in layer_names:
            sld_xml = get_sld_for_layer(layer_name)
            if sld_xml is None:
                geom_type = self._get_layer_geometry_type(layer_name)
                sld_xml = get_default_sld_for_geometry(geom_type)

            style_name = f"s52_{layer_name.lower()}"
            self._publish_sld(style_name, sld_xml)
            self._assign_style_to_layer(layer_name, style_name)

    def _publish_sld(self, style_name: str, sld_xml: str) -> None:
        """Create or update an SLD style in GeoServer."""
        url = self._rest(f"styles/{style_name}")
        # Check if style exists
        resp = requests.get(url, auth=self.auth, timeout=10,
                            params={"accept": "application/json"})
        if resp.status_code == 404:
            # Create new style
            create_url = self._rest("styles")
            requests.post(
                create_url,
                params={"name": style_name},
                headers={"Content-Type": "application/vnd.ogc.sld+xml"},
                data=sld_xml.encode("utf-8"),
                auth=self.auth,
                timeout=30,
            )
        else:
            # Update existing style
            requests.put(
                url,
                headers={"Content-Type": "application/vnd.ogc.sld+xml"},
                data=sld_xml.encode("utf-8"),
                auth=self.auth,
                timeout=30,
            )

    def _assign_style_to_layer(self, layer_name: str, style_name: str) -> None:
        """Assign a style as the default style for a layer."""
        url = self._rest(f"layers/{self.workspace}:{layer_name}")
        body = {
            "layer": {
                "name": f"{self.workspace}:{layer_name}",
                "defaultStyle": {"name": style_name},
            }
        }
        try:
            requests.put(
                url,
                headers={"Content-Type": "application/json"},
                json=body,
                auth=self.auth,
                timeout=15,
            )
        except requests.RequestException as e:
            logger.warning(f"Failed to assign style {style_name} to {layer_name}: {e}")

    def _get_layer_geometry_type(self, layer_name: str) -> str:
        """Get the geometry type of a published layer from GeoServer REST API."""
        url = self._rest(
            f"workspaces/{self.workspace}/datastores"
        )
        try:
            # Query the feature type resource for this layer
            ft_url = self._rest(
                f"workspaces/{self.workspace}/featuretypes/{layer_name}.json"
            )
            resp = requests.get(ft_url, auth=self.auth, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                ft = data.get("featureType", {})
                # GeoServer doesn't always expose geometry type in REST,
                # so fall back to checking the layer's type attribute
                layer_url = self._rest(f"layers/{self.workspace}:{layer_name}.json")
                lr = requests.get(layer_url, auth=self.auth, timeout=10)
                if lr.status_code == 200:
                    ld = lr.json().get("layer", {})
                    ltype = ld.get("type", "")
                    if "Point" in ltype:
                        return "Point"
                    if "Line" in ltype:
                        return "LineString"
                    if "Polygon" in ltype:
                        return "Polygon"
        except requests.RequestException:
            pass
        return "Polygon"

    def get_overlay_bounds(self, overlay_id: str, name: str) -> list[float] | None:
        """Get the combined bounding box [min_lon, min_lat, max_lon, max_lat] for an overlay.

        Queries GeoServer WMS GetCapabilities for the layer bbox in EPSG:4326.
        Returns None if the overlay or its layers cannot be found.
        """
        if not self.enabled or not self.base_url:
            return None
        store_name = self._store_name(overlay_id, name)
        layer_names = self._get_store_layers(store_name)
        if not layer_names:
            return None

        min_lon, min_lat = 180.0, 90.0
        max_lon, max_lat = -180.0, -90.0
        found = False

        for ln in layer_names:
            url = self._rest(f"workspaces/{self.workspace}/featuretypes/{ln}.json")
            try:
                resp = requests.get(url, auth=self.auth, timeout=15)
                if resp.status_code != 200:
                    continue
                ft = resp.json().get("featureType", {})
                bbox = ft.get("nativeBoundingBox")
                if not bbox:
                    continue
                found = True
                min_lon = min(min_lon, float(bbox.get("minx", 180.0)))
                min_lat = min(min_lat, float(bbox.get("miny", 90.0)))
                max_lon = max(max_lon, float(bbox.get("maxx", -180.0)))
                max_lat = max(max_lat, float(bbox.get("maxy", -90.0)))
            except (requests.RequestException, ValueError, KeyError):
                continue

        if not found:
            return None
        return [min_lon, min_lat, max_lon, max_lat]

    def delete_overlay(self, overlay_id: str, name: str) -> None:
        """Remove a published overlay from GeoServer."""
        if not self.enabled or not self.base_url:
            return
        store_name = self._store_name(overlay_id, name)
        self._delete_store(store_name)
