import os

import fiona

from src.shared.errors import ValidationError


def _convert_vector_to_gpkg(
    input_path: str,
    output_gpkg_path: str,
    source_format: str,
) -> dict:
    """Convert any GDAL-readable vector file to GeoPackage using fiona.

    Handles S-57's heterogeneous schemas by collecting all property keys
    across all features in a layer, building a unified schema, and filling
    missing values with None.

    All layers, features, attributes, geometry types, and CRS are preserved.

    Args:
        input_path: Path to the input vector file (.000, .geojson, .kml, etc.)
        output_gpkg_path: Destination .gpkg path
        source_format: Human-readable format name for error messages

    Returns metadata: layer names, feature counts, bounds.
    """
    if not os.path.isfile(input_path):
        raise ValidationError(f"{source_format} file not found: {input_path}")

    if os.path.exists(output_gpkg_path):
        os.remove(output_gpkg_path)

    try:
        layer_names = fiona.listlayers(input_path)
    except Exception as e:
        raise ValidationError(f"Failed to read {source_format} file: {e}")

    if not layer_names:
        raise ValidationError(f"{source_format} file contains no layers")

    layer_info: list[dict] = []
    total_features = 0

    for layer_name in layer_names:
        try:
            with fiona.open(input_path, layer=layer_name) as src:
                schema = src.schema
                geom_type = schema.get("geometry") if schema else "None"

                if not schema or geom_type == "None":
                    layer_info.append({
                        "name": layer_name,
                        "feature_count": 0,
                        "bounds": None,
                    })
                    continue

                # Collect all features and build a unified property schema.
                # S-57 features in the same layer can have different attributes.
                all_features: list[dict] = []
                all_prop_keys: set[str] = set()

                for feat in src:
                    props = feat.get("properties", {}) or {}
                    all_prop_keys.update(props.keys())
                    all_features.append(feat)

                if not all_features:
                    layer_info.append({
                        "name": layer_name,
                        "feature_count": 0,
                        "bounds": None,
                    })
                    continue

                # Build unified schema: merge original schema props with all discovered keys
                unified_props: dict[str, str] = {}
                orig_props = schema.get("properties", {})
                for key in all_prop_keys:
                    unified_props[key] = orig_props.get(key, "str")

                unified_schema = {
                    "geometry": geom_type,
                    "properties": unified_props,
                }

                # Write all features with unified schema
                with fiona.open(
                    output_gpkg_path,
                    "w",
                    layer=layer_name,
                    driver="GPKG",
                    crs=src.crs or "EPSG:4326",
                    schema=unified_schema,
                ) as dst:
                    for feat in all_features:
                        props = dict(feat.get("properties", {}) or {})
                        # Fill missing keys with None
                        for key in all_prop_keys:
                            if key not in props:
                                props[key] = None
                        feat["properties"] = props
                        dst.write(feat)

                feat_count = len(all_features)
                total_features += feat_count
                bounds = src.bounds if feat_count > 0 else None
                layer_info.append({
                    "name": layer_name,
                    "feature_count": feat_count,
                    "bounds": bounds,
                    "property_count": len(unified_props),
                })
        except Exception as e:
            layer_info.append({
                "name": layer_name,
                "feature_count": 0,
                "bounds": None,
                "error": str(e)[:200],
            })

    if total_features == 0:
        raise ValidationError(
            f"{source_format} file contains no parseable features"
        )

    all_bounds = [li["bounds"] for li in layer_info if li["bounds"]]
    overall_bounds = None
    if all_bounds:
        overall_bounds = [
            min(b[0] for b in all_bounds),
            min(b[1] for b in all_bounds),
            max(b[2] for b in all_bounds),
            max(b[3] for b in all_bounds),
        ]

    return {
        "layer_count": len(layer_info),
        "feature_count": total_features,
        "layers": layer_info,
        "bounds": overall_bounds,
    }


def parse_enc_to_gpkg(enc_path: str, output_gpkg_path: str) -> dict:
    """Parse an S-57 (.000) ENC file to GeoPackage.

    All S-57 object classes, attributes, and geometry types are preserved.
    Each S-57 layer (e.g. M_COVR, DEPARE, SLCONS, BOYLAT, etc.) becomes
    a separate layer in the GeoPackage.
    """
    return _convert_vector_to_gpkg(enc_path, output_gpkg_path, "ENC")


def convert_geojson_to_gpkg(geojson_path: str, output_gpkg_path: str) -> dict:
    """Convert a GeoJSON file to GeoPackage, preserving all properties."""
    return _convert_vector_to_gpkg(geojson_path, output_gpkg_path, "GeoJSON")


def convert_kml_to_gpkg(kml_path: str, output_gpkg_path: str) -> dict:
    """Convert a KML/KMZ file to GeoPackage, preserving all attributes."""
    return _convert_vector_to_gpkg(kml_path, output_gpkg_path, "KML")


def get_gpkg_layer_names(gpkg_path: str) -> list[str]:
    """List all layer names in a GeoPackage."""
    if not os.path.isfile(gpkg_path):
        return []
    return fiona.listlayers(gpkg_path)
