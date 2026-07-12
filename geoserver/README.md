# GeoServer Service Replication Template

This directory contains the offline GeoServer replication service for ENC and overlay rendering.

## Quick Start

```bash
./start.sh
./stop.sh
```

## Architecture

GeoServer runs in a Docker container alongside PostGIS and pgAdmin. Vector data uploaded as GeoPackage is published to GeoServer, which renders server-side S-52 SLD styles and serves WMS PNG tiles. The tileserver proxies these tiles to the frontend.

## Configuration

- `docker-compose.yml` — PostGIS + GeoServer + pgAdmin stack
- `start.sh` — Single-command startup with provisioning
- `stop.sh` — Clean shutdown
- `config/` — GeoServer config data and workspace definitions
- `scripts/` — Provisioning and helper scripts

## Notes

GeoServer is used to render ENC (S-52) overlays and vector layers as WMS PNG tiles consumed by the tileserver proxy.
