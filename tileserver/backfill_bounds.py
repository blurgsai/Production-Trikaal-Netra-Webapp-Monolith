#!/usr/bin/env python3
from src.features.overlays.repository import get_overlay, backfill_overlay_bounds
from src.shared.geoserver_client import GeoServerClient

gs = GeoServerClient()
for oid in ["97596b6708c1", "c3b5d05a7408", "b48d520ad274", "fafc72850121", "ce071ffe63b8"]:
    overlay = get_overlay(oid)
    if not overlay:
        print(f"{oid}: not found")
        continue
    bounds = gs.get_overlay_bounds(oid, overlay["name"])
    print(f"{oid}: {bounds}")
    if bounds:
        backfill_overlay_bounds(oid, bounds)
