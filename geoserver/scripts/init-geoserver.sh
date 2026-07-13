#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# init-geoserver.sh — Provision GeoServer via REST API
#
# Creates:
#   - Workspace: trikaalx
#   - PostGIS datastore: vessel_tracking (connected to local postgis container)
#   - Publishes layer: vessels
#
# Idempotent: skips creation if resource already exists (HTTP 409).
#
# Usage: init-geoserver.sh [geoserver_port]
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

GEOSERVER_PORT="${1:-8080}"
GEOSERVER_URL="http://localhost:${GEOSERVER_PORT}/geoserver/rest"
GS_USER="${GEOSERVER_ADMIN_USER:-admin}"
GS_PASS="${GEOSERVER_ADMIN_PASSWORD:-geoserver}"

WORKSPACE="trikaalx"
NAMESPACE_URI="http://trikaalx"
DATASTORE="vessel_tracking"

# PostGIS connection (matches docker-compose service name)
DB_HOST="postgis"
DB_PORT="5432"
DB_NAME="${POSTGRES_DB:-vessel_tracking}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_PASS="${POSTGRES_PASSWORD:-postgres}"

echo "[init-geoserver] Provisioning GeoServer at ${GEOSERVER_URL}"

# ── Create workspace ──────────────────────────────────────────────────────────
echo "[init-geoserver] Creating workspace: $WORKSPACE"
response=$(curl -s -o /dev/null -w "%{http_code}" \
    -u "${GS_USER}:${GS_PASS}" \
    -X POST \
    -H "Content-type: application/xml" \
    -d "<workspace><name>${WORKSPACE}</name></workspace>" \
    "${GEOSERVER_URL}/workspaces")

case "$response" in
    201) echo "[init-geoserver]   Workspace created" ;;
    409) echo "[init-geoserver]   Workspace already exists — skipping" ;;
    *)   echo "[init-geoserver]   ERROR: HTTP $response"; exit 1 ;;
esac

# ── Create namespace ──────────────────────────────────────────────────────────
echo "[init-geoserver] Creating namespace: $WORKSPACE ($NAMESPACE_URI)"
response=$(curl -s -o /dev/null -w "%{http_code}" \
    -u "${GS_USER}:${GS_PASS}" \
    -X POST \
    -H "Content-type: application/xml" \
    -d "<namespace><prefix>${WORKSPACE}</prefix><uri>${NAMESPACE_URI}</uri></namespace>" \
    "${GEOSERVER_URL}/namespaces")

case "$response" in
    201) echo "[init-geoserver]   Namespace created" ;;
    409) echo "[init-geoserver]   Namespace already exists — skipping" ;;
    *)   echo "[init-geoserver]   WARN: HTTP $response (may already exist)" ;;
esac

# ── Create PostGIS datastore ──────────────────────────────────────────────────
echo "[init-geoserver] Creating PostGIS datastore: $DATASTORE"
response=$(curl -s -o /dev/null -w "%{http_code}" \
    -u "${GS_USER}:${GS_PASS}" \
    -X POST \
    -H "Content-type: application/xml" \
    -d "
    <dataStore>
      <name>${DATASTORE}</name>
      <type>PostGIS</type>
      <enabled>true</enabled>
      <workspace><name>${WORKSPACE}</name></workspace>
      <connectionParameters>
        <entry key=\"schema\">public</entry>
        <entry key=\"Estimated extends\">false</entry>
        <entry key=\"Expose primary keys\">true</entry>
        <entry key=\"validate connections\">false</entry>
        <entry key=\"Support on the fly geometry simplification\">false</entry>
        <entry key=\"create database\">false</entry>
        <entry key=\"preparedStatements\">false</entry>
        <entry key=\"database\">${DB_NAME}</entry>
        <entry key=\"port\">${DB_PORT}</entry>
        <entry key=\"passwd\">${DB_PASS}</entry>
        <entry key=\"host\">${DB_HOST}</entry>
        <entry key=\"dbtype\">postgis</entry>
        <entry key=\"namespace\">${NAMESPACE_URI}</entry>
        <entry key=\"Loose bbox\">false</entry>
        <entry key=\"Test while idle\">false</entry>
        <entry key=\"user\">${DB_USER}</entry>
      </connectionParameters>
    </dataStore>" \
    "${GEOSERVER_URL}/workspaces/${WORKSPACE}/datastores")

case "$response" in
    201) echo "[init-geoserver]   Datastore created" ;;
    409) echo "[init-geoserver]   Datastore already exists — skipping" ;;
    *)   echo "[init-geoserver]   ERROR: HTTP $response"; exit 1 ;;
esac

# ── Publish vessels layer ─────────────────────────────────────────────────────
echo "[init-geoserver] Publishing layer: vessels"
response=$(curl -s -o /dev/null -w "%{http_code}" \
    -u "${GS_USER}:${GS_PASS}" \
    -X POST \
    -H "Content-type: application/xml" \
    -d "
    <featureType>
      <name>vessels</name>
      <nativeName>vessels</nativeName>
      <title>Vessels</title>
      <description>Vessel tracking data from PostGIS</description>
      <keywords>
        <string>vessel</string>
        <string>tracking</string>
        <string>maritime</string>
      </keywords>
      <srs>EPSG:4326</srs>
      <nativeBoundingBox>
        <minx>-180.0</minx>
        <maxx>180.0</maxx>
        <miny>-90.0</miny>
        <maxy>90.0</maxy>
        <crs>EPSG:4326</crs>
      </nativeBoundingBox>
      <latLonBoundingBox>
        <minx>-180.0</minx>
        <maxx>180.0</maxx>
        <miny>-90.0</miny>
        <maxy>90.0</maxy>
        <crs>EPSG:4326</crs>
      </latLonBoundingBox>
      <projectionPolicy>FORCE_DECLARED</projectionPolicy>
      <enabled>true</enabled>
      <advertised>true</advertised>
    </featureType>" \
    "${GEOSERVER_URL}/workspaces/${WORKSPACE}/datastores/${DATASTORE}/featuretypes")

case "$response" in
    201) echo "[init-geoserver]   Layer 'vessels' published" ;;
    409) echo "[init-geoserver]   Layer 'vessels' already exists — skipping" ;;
    *)   echo "[init-geoserver]   WARN: HTTP $response (table may not exist yet)" ;;
esac

echo "[init-geoserver] Done!"
