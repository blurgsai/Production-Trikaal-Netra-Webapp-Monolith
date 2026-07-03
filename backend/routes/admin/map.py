import os
import uuid
import shutil
import re
import httpx

from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from utils.auth import check_admin_role

router = APIRouter(prefix="/map", tags=["admin"])

GEOSERVER_URL = os.getenv("GEOSERVER_URL")
WORKSPACE = os.getenv("GEOSERVER_WORKSPACE")
USERNAME = os.getenv("GEOSERVER_USERNAME")
PASSWORD = os.getenv("GEOSERVER_PASSWORD")

# -----------------------------
# FILE SIZE LIMIT (10 MB)
# -----------------------------
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


@router.post("/layers/upload")
async def upload_layer(
    file: UploadFile = File(...),
    layer_name: str = Form(...),
    current_user: dict = Depends(check_admin_role)
):

    temp_dir = None
    size = 0

    try:
        if not file:
            raise HTTPException(status_code=400, detail="File required")

        if not layer_name or not layer_name.strip():
            raise HTTPException(status_code=400, detail="layer_name is required")

        # -----------------------------
        # SANITIZE LAYER NAME
        # -----------------------------
        desired_layer_name = re.sub(r'[^a-zA-Z0-9_]', '_', layer_name.strip())

        filename = file.filename
        ext = filename.split(".")[-1].lower()

        # -----------------------------
        # STORE NAME (UUID)
        # -----------------------------
        store_name = str(uuid.uuid4())

        temp_dir = f"/tmp/{store_name}"
        os.makedirs(temp_dir, exist_ok=True)

        file_path = os.path.join(temp_dir, filename)

        # -----------------------------
        # STREAM FILE WRITE + SIZE CHECK
        # -----------------------------
        with open(file_path, "wb") as f:
            while chunk := await file.read(1024 * 1024):
                size += len(chunk)

                if size > MAX_FILE_SIZE:
                    raise HTTPException(
                        status_code=413,
                        detail="File too large. Max allowed size is 10MB."
                    )

                f.write(chunk)

        # =====================================================
        # VECTOR: SHAPEFILE / GEOJSON ONLY
        # =====================================================
        if ext in ["zip", "geojson", "json"]:

            if ext == "zip":
                store_url = f"{GEOSERVER_URL}/rest/workspaces/{WORKSPACE}/datastores/{store_name}/file.shp"
                headers = {"Content-type": "application/zip"}
            else:
                store_url = f"{GEOSERVER_URL}/rest/workspaces/{WORKSPACE}/datastores/{store_name}/file.geojson"
                headers = {"Content-type": "application/json"}

            async with httpx.AsyncClient() as client:

                # -----------------------------
                # UPLOAD TO GEOSERVER
                # -----------------------------
                with open(file_path, "rb") as f:
                    response = await client.put(
                        store_url,
                        content=f.read(),
                        headers=headers,
                        auth=(USERNAME, PASSWORD)
                    )

                if response.status_code not in [200, 201]:
                    raise HTTPException(status_code=500, detail=response.text)

                # -----------------------------
                # GET FEATURE TYPES
                # -----------------------------
                featuretypes_url = f"{GEOSERVER_URL}/rest/workspaces/{WORKSPACE}/datastores/{store_name}/featuretypes.json"

                ft_response = await client.get(
                    featuretypes_url,
                    auth=(USERNAME, PASSWORD)
                )

                if ft_response.status_code != 200:
                    raise HTTPException(status_code=500, detail="Failed to fetch feature types")

                ft_data = ft_response.json()
                feature_types = ft_data.get("featureTypes", {}).get("featureType", [])

                if not feature_types:
                    raise HTTPException(status_code=500, detail="No feature type found")

                actual_layer_name = feature_types[0]["name"]
                original_filename = file.filename

                # -----------------------------
                # RENAME FEATURE TYPE
                # -----------------------------
                rename_url = f"{GEOSERVER_URL}/rest/workspaces/{WORKSPACE}/datastores/{store_name}/featuretypes/{actual_layer_name}"

                # Add the <title> tag with the original filename
                payload = f"""
                <featureType>
                    <name>{desired_layer_name}</name>
                    <title>{original_filename}</title>
                </featureType>
                """

                rename_response = await client.put(
                    rename_url,
                    content=payload,
                    headers={"Content-Type": "text/xml"},
                    auth=(USERNAME, PASSWORD)
                )

                if rename_response.status_code not in [200, 201]:
                    raise HTTPException(status_code=500, detail="Failed to rename layer")

        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: {ext}. Only zip and geojson allowed."
            )

        # -----------------------------
        # FINAL RESPONSE
        # -----------------------------
        layer_full_name = f"{WORKSPACE}:{desired_layer_name}"

        return {
            "message": "Layer published successfully",
            "store_name": store_name,
            "layer_name": layer_full_name,
            "wms_url": f"{GEOSERVER_URL}/{WORKSPACE}/wms"
        }

    finally:
        if temp_dir:
            shutil.rmtree(temp_dir, ignore_errors=True)

@router.get("/layers")
async def list_layers(
    page: int = 1,
    limit: int = 10,
    current_user: dict = Depends(check_admin_role)
):
    """
    List all layers in GeoServer workspace with pagination
    """
    try:
        async with httpx.AsyncClient() as client:
            # -----------------------------
            # VALIDATION
            # -----------------------------
            page = max(1, page)
            limit = max(1, min(limit, 100))
            offset = (page - 1) * limit

            # -----------------------------
            # GET LAYERS LIST
            # -----------------------------
            layers_url = f"{GEOSERVER_URL}/rest/workspaces/{WORKSPACE}/layers.json"
            layers_res = await client.get(layers_url, auth=(USERNAME, PASSWORD))

            if layers_res.status_code != 200:
                raise HTTPException(status_code=502, detail="Failed to fetch layers from GeoServer")

            layers_data = layers_res.json()
            raw_layers = layers_data.get("layers")

            layers_list = []
            
            if isinstance(raw_layers, dict):
                layers_list = raw_layers.get("layer", [])
                if isinstance(layers_list, dict):
                    layers_list = [layers_list]
            else:
                raise HTTPException(status_code=500, detail="Invalid layers format from GeoServer")

            total_layers = len(layers_list)

            # -----------------------------
            # PAGINATION
            # -----------------------------
            paginated_layers = layers_list[offset : offset + limit]

            result = []
            errors = []

            # -----------------------------
            # PROCESS PAGINATED LAYERS
            # -----------------------------
            for layer in paginated_layers:
                try:
                    if not isinstance(layer, dict):
                        errors.append({"layer": None, "error": "Invalid layer format"})
                        continue

                    layer_name = layer.get("name")
                    href = layer.get("href")

                    if not href:
                        errors.append({"layer": layer_name, "error": "Missing href"})
                        continue

                    layer_detail_res = await client.get(href, auth=(USERNAME, PASSWORD))
                    if layer_detail_res.status_code != 200:
                        errors.append({"layer": layer_name, "error": "Failed to fetch layer_detail"})
                        continue

                    layer_detail = layer_detail_res.json().get("layer", {})

                    if not isinstance(layer_detail, dict):
                        errors.append({"layer": layer_name, "error": "Invalid layer_detail format"})
                        continue

                    resource = layer_detail.get("resource", {})

                    if not isinstance(resource, dict):
                        resource_href = None
                    else:
                        resource_href = resource.get("href")

                    title = None
                    geometry_type = "Unknown"
                    store = None
                    workspace = WORKSPACE

                    if resource_href:
                        ft_res = await client.get(resource_href, auth=(USERNAME, PASSWORD))
                        if ft_res.status_code == 200:
                            ft = ft_res.json().get("featureType", {})

                            if not isinstance(ft, dict):
                                errors.append({"layer": layer_name, "error": "Invalid featureType format"})
                                continue

                            title = ft.get("title")

                            store_obj = ft.get("store", {})
                            if not isinstance(store_obj, dict):
                                errors.append({"layer": layer_name, "error": "Invalid store format"})
                                continue
                            else:
                                store = store_obj.get("name")
                            
                            attributes_parent = ft.get("attributes", {})

                            if not isinstance(attributes_parent, dict):
                                attributes = []
                            else:
                                attributes = attributes_parent.get("attribute", [])

                                if isinstance(attributes, dict):
                                    attributes = [attributes]
                                elif not isinstance(attributes, list):
                                    attributes = []

                            for attr in attributes:
                                if not isinstance(attr, dict):
                                    continue

                                binding = attr.get("binding", "")

                                if "Point" in binding:
                                    geometry_type = "Point"
                                    break
                                elif "Polygon" in binding:
                                    geometry_type = "Polygon"
                                    break
                                elif "Line" in binding:
                                    geometry_type = "LineString"
                                    break
                        else:
                            errors.append({"layer": layer_name, "error": "Failed to fetch featureType"})
                            continue
                    else:
                        errors.append({"layer": layer_name, "error": "No resource_href"})
                        continue

                    result.append({
                        "layer_name": layer_name,
                        "title": title or layer_name,
                        "geometry_type": geometry_type,
                        "store": store,
                        "workspace": workspace,
                        "file_name": title if title else f"{store}.zip"
                    })

                except Exception as layer_error:
                    errors.append({
                        "layer": layer.get("name") if isinstance(layer, dict) else None,
                        "error": str(layer_error)
                    })
                    continue

            return {
                "workspace": WORKSPACE,
                "total": total_layers,
                "page": page,
                "limit": limit,
                "count": len(result),
                "layers": result,
                "errors": errors
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/layers/{layer_name}")
async def delete_layer(
    layer_name: str,
    current_user: dict = Depends(check_admin_role)
):
    """
    Delete layer from GeoServer
    """

    try:
        async with httpx.AsyncClient() as client:

            delete_url = f"{GEOSERVER_URL}/rest/layers/{layer_name}?recurse=true"

            response = await client.delete(
                delete_url,
                auth=(USERNAME, PASSWORD)
            )

            if response.status_code not in [200, 202]:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to delete layer: {response.text}"
                )

        return {"message": f"{layer_name} deleted successfully"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))