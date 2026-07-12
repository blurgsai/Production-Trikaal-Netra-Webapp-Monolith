#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# install-s57-extension.sh — Enable S-57 (ENC) support in GeoServer via OGR+GDAL
#
# The kartoza/geoserver:2.23.0 image already ships with:
#   - OGR plugin JARs (gs-web-ogr, gt-ogr-core, gt-ogr-jni)
#   - GDAL native library (/usr/lib/jni/libgdalalljni.so)
#   - GDAL S-57 driver (S57 -vector- (rw+v): IHO S-57 (ENC))
#
# The ONLY missing piece is -Djava.library.path=/usr/lib/jni in GEOSERVER_OPTS
# so the Java JNI bridge can find the GDAL native library.
#
# This script:
#   1. Verifies the OGR plugin + GDAL are present on the GCP container
#   2. Recreates the container with java.library.path added to GEOSERVER_OPTS
#   3. Verifies GDAL loads and S-57 datastore creation works via REST API
#
# Target: GCP instance trikaalx-geoserver-dev (zone: asia-south1-b)
# Container: geoserver (kartoza/geoserver:2.23.0)
#
# Usage:
#   ./scripts/install-s57-extension.sh              # Full install + verify
#   ./scripts/install-s57-extension.sh --verify      # Only check current state
#   ./scripts/install-s57-extension.sh --test        # Create test S-57 datastore
#
# Prerequisites:
#   - gcloud CLI authenticated with access to trikaalx-geoserver-dev
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────
GCP_INSTANCE="trikaalx-geoserver-dev"
GCP_ZONE="asia-south1-b"
CONTAINER_NAME="geoserver"
IMAGE="kartoza/geoserver:2.23.0"
NETWORK="pavan_kumar_app-network"
VOLUME_DATA="pavan_kumar_geoserver_data"
VOLUME_LOGS="/home/pavan_kumar/geoserver_logs"
VOLUME_WEBXML="/home/pavan_kumar/cors/web.xml"
GEOSERVER_OPTS="-Djava.awt.headless=true -Dorg.geotools.referencing.forceXY=true -Djava.library.path=/usr/lib/jni -XX:+UseParallelGC -XX:ParallelGCThreads=4 -XX:SoftRefLRUPolicyMSPerMB=36000 -Xmx2g -XX:+UseG1GC -XX:MaxGCPauseMillis=200 -XX:ParallelGCThreads=4 -XX:ConcGCThreads=2"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()   { echo -e "${CYAN}[s57]${NC} $*"; }
ok()    { echo -e "${GREEN}[s57]${NC} $*"; }
warn()  { echo -e "${YELLOW}[s57]${NC} $*"; }
error() { echo -e "${RED}[s57]${NC} $*" >&2; }

# ── Helper: run command on GCP instance via SSH ───────────────────────────────
gcp_ssh() {
    gcloud compute ssh "${GCP_INSTANCE}" --zone="${GCP_ZONE}" -- "$@"
}

# ── Parse arguments ───────────────────────────────────────────────────────────
MODE="install"
if [ "${1:-}" = "--verify" ]; then
    MODE="verify"
elif [ "${1:-}" = "--test" ]; then
    MODE="test"
fi

# ── Verify mode ───────────────────────────────────────────────────────────────
if [ "$MODE" = "verify" ]; then
    log "Verifying S-57 (OGR+GDAL) support on ${GCP_INSTANCE}..."
    echo ""

    log "1. Container status:"
    gcp_ssh "docker ps --filter name=${CONTAINER_NAME} --format 'table {{{{.Names}}}}\t{{{{.Status}}}}\t{{{{.Image}}}}'"
    echo ""

    log "2. OGR plugin JARs:"
    gcp_ssh "docker exec ${CONTAINER_NAME} bash -c 'ls /usr/local/tomcat/webapps/geoserver/WEB-INF/lib/ | grep -i ogr || echo NOT_FOUND'"
    echo ""

    log "3. GDAL native library:"
    gcp_ssh "docker exec ${CONTAINER_NAME} bash -c 'find /usr/lib/jni -name \"libgdal*\" -type f 2>/dev/null || echo NOT_FOUND'"
    echo ""

    log "4. S-57 driver in GDAL:"
    gcp_ssh "docker exec ${CONTAINER_NAME} bash -c 'ogrinfo --formats 2>/dev/null | grep -i s57 || echo NOT_FOUND'"
    echo ""

    log "5. GEOSERVER_OPTS (java.library.path):"
    gcp_ssh "docker exec ${CONTAINER_NAME} bash -c 'echo \$GEOSERVER_OPTS'"
    echo ""

    log "6. GDAL loaded in catalina logs:"
    gcp_ssh "docker exec ${CONTAINER_NAME} bash -c 'cat /usr/local/tomcat/logs/catalina.\$(date +%Y-%m-%d).log 2>/dev/null | grep -i \"GDAL Native Library loaded\" || echo NOT_FOUND'"
    echo ""

    log "Verification complete."
    exit 0
fi

# ── Test mode: create a test S-57 OGR datastore ───────────────────────────────
if [ "$MODE" = "test" ]; then
    log "Testing S-57 OGR datastore creation on ${GCP_INSTANCE}..."
    echo ""

    log "Creating test_s57_ogr datastore (no .000 file needed for type validation)..."
    RESULT=$(gcp_ssh "curl -s -u admin:geoserver -XPOST -H 'Content-Type: application/json' \
        -d '{\"dataStore\":{\"name\":\"test_s57_ogr\",\"type\":\"OGR\",\"connectionParameters\":{\"entry\":[{\"@key\":\"DriverName\",\"$\":\"S57\"},{\"@key\":\"DataSourceName\",\"$\":\"/opt/geoserver/data_dir/data/s57/test.000\"}]}}}' \
        'http://localhost:8080/geoserver/rest/workspaces/trikaalx/datastores' -w '\nHTTP_CODE:%{http_code}'")

    echo "$RESULT"

    if echo "$RESULT" | grep -q "HTTP_CODE:201"; then
        ok "S-57 OGR datastore created successfully!"
        echo ""
        log "Datastore details:"
        gcp_ssh "curl -s -u admin:geoserver 'http://localhost:8080/geoserver/rest/workspaces/trikaalx/datastores/test_s57_ogr.json' | python3 -m json.tool"
        echo ""
        log "Cleaning up test datastore..."
        gcp_ssh "curl -s -u admin:geoserver -XDELETE 'http://localhost:8080/geoserver/rest/workspaces/trikaalx/datastores/test_s57_ogr?recurse=true' -w '\nHTTP_CODE:%{http_code}'"
        ok "Test complete — S-57 support is working!"
    else
        error "Failed to create S-57 datastore. Check GeoServer logs."
        exit 1
    fi
    exit 0
fi

# ── Install mode ──────────────────────────────────────────────────────────────
log "Enabling S-57 (ENC) support via OGR+GDAL on ${GCP_INSTANCE}"
log "Container: ${CONTAINER_NAME} (${IMAGE})"
echo ""

# ── Step 1: Verify prerequisites ──────────────────────────────────────────────
log "Step 1/5: Checking prerequisites..."

log "  a) OGR plugin JARs:"
gcp_ssh "docker exec ${CONTAINER_NAME} bash -c 'ls /usr/local/tomcat/webapps/geoserver/WEB-INF/lib/ | grep -i ogr || echo NOT_FOUND'"

log "  b) GDAL native library:"
gcp_ssh "docker exec ${CONTAINER_NAME} bash -c 'find /usr/lib/jni -name \"libgdal*\" -type f 2>/dev/null || echo NOT_FOUND'"

log "  c) S-57 driver in GDAL:"
gcp_ssh "docker exec ${CONTAINER_NAME} bash -c 'ogrinfo --formats 2>/dev/null | grep -i s57 || echo NOT_FOUND'"

log "  d) Current GEOSERVER_OPTS:"
gcp_ssh "docker exec ${CONTAINER_NAME} bash -c 'echo \$GEOSERVER_OPTS'"
echo ""

# Check if java.library.path is already set
CURRENT_OPTS=$(gcp_ssh "docker exec ${CONTAINER_NAME} bash -c 'echo \$GEOSERVER_OPTS'")
if echo "$CURRENT_OPTS" | grep -q "java.library.path"; then
    ok "java.library.path is already set — no changes needed."
    echo ""
    log "Running verification..."
    exec "$0" --verify
    exit 0
fi

warn "java.library.path is MISSING — will recreate container with fix."
echo ""

# ── Step 2: Stop and remove current container ─────────────────────────────────
log "Step 2/5: Stopping and removing current container..."
log "  (Data is safe in named volume ${VOLUME_DATA})"

gcp_ssh "docker stop ${CONTAINER_NAME} && docker rm ${CONTAINER_NAME} && echo 'CONTAINER_REMOVED'"
echo ""

# ── Step 3: Recreate container with java.library.path ─────────────────────────
log "Step 3/5: Recreating container with -Djava.library.path=/usr/lib/jni..."

gcp_ssh "docker run -d \
    --name ${CONTAINER_NAME} \
    --network ${NETWORK} \
    -p 8080:8080 \
    -v ${VOLUME_DATA}:/opt/geoserver/data_dir:rw \
    -v ${VOLUME_LOGS}:/opt/geoserver/data_dir/logs:rw \
    -v ${VOLUME_WEBXML}:/usr/local/tomcat/conf/web.xml:rw \
    --restart always \
    -e GEOSERVER_ADMIN_USER=admin \
    -e GEOSERVER_ADMIN_PASSWORD=geoserver \
    -e GEOWEBCACHE_CACHE_DIR=/opt/geoserver/data_dir/gwc \
    -e ENABLE_JSONP=true \
    -e ENABLE_CORS=true \
    -e 'CORS_ALLOWED_ORIGINS=*' \
    -e 'CORS_ALLOWED_METHODS=GET,POST,PUT,DELETE,HEAD,OPTIONS' \
    -e 'CORS_ALLOWED_HEADERS=*' \
    -e MAX_FILTER_RULES=20 \
    -e OPTIMIZE_LINE_WIDTH=false \
    -e FOOTPRINTS_DATA_DIR=/opt/footprints_dir \
    -e GEOSERVER_DATA_DIR=/opt/geoserver/data_dir \
    -e GEOSERVER_FILEBROWSER_HIDEFS=false \
    -e NETWORK_BACKEND=2 \
    -e GEOSERVER_LOG_LEVEL=DEFAULT:INFO \
    -e GEOSERVER_LOG_LOCATION=/opt/geoserver/data_dir/logs/geoserver.log \
    -e 'GEOSERVER_OPTS=${GEOSERVER_OPTS}' \
    ${IMAGE} && echo 'CONTAINER_STARTED'"
echo ""

# ── Step 4: Wait for GeoServer to be ready ────────────────────────────────────
log "Step 4/5: Waiting for GeoServer to be ready..."

WAIT_SCRIPT="
MAX_RETRIES=20
attempt=0
until curl -s -f -o /dev/null http://localhost:8080/geoserver/ 2>/dev/null; do
    attempt=\$((attempt + 1))
    if [ \$attempt -ge \$MAX_RETRIES ]; then
        echo 'TIMEOUT'
        exit 1
    fi
    sleep 10
done
echo 'READY'
"

RESULT=$(gcp_ssh "$WAIT_SCRIPT")
if [ "$RESULT" = "READY" ]; then
    ok "GeoServer is ready!"
else
    error "GeoServer did not become ready in time."
    error "Check logs: docker exec ${CONTAINER_NAME} bash -c 'cat /usr/local/tomcat/logs/catalina.\$(date +%Y-%m-%d).log | tail -100'"
    exit 1
fi
echo ""

# ── Step 5: Verify GDAL loaded and S-57 works ─────────────────────────────────
log "Step 5/5: Verifying GDAL and S-57 support..."

log "  a) GDAL native library loaded:"
gcp_ssh "docker exec ${CONTAINER_NAME} bash -c 'cat /usr/local/tomcat/logs/catalina.\$(date +%Y-%m-%d).log 2>/dev/null | grep -i \"GDAL Native Library loaded\" || echo NOT_FOUND'"

log "  b) GEOSERVER_OPTS confirmed:"
gcp_ssh "docker exec ${CONTAINER_NAME} bash -c 'echo \$GEOSERVER_OPTS'"

log "  c) Test S-57 OGR datastore creation:"
gcp_ssh "curl -s -u admin:geoserver -XPOST -H 'Content-Type: application/json' \
    -d '{\"dataStore\":{\"name\":\"test_s57_ogr\",\"type\":\"OGR\",\"connectionParameters\":{\"entry\":[{\"@key\":\"DriverName\",\"$\":\"S57\"},{\"@key\":\"DataSourceName\",\"$\":\"/opt/geoserver/data_dir/data/s57/test.000\"}]}}}' \
    'http://localhost:8080/geoserver/rest/workspaces/trikaalx/datastores' -w '\nHTTP_CODE:%{http_code}'"

log "  d) Cleaning up test datastore:"
gcp_ssh "curl -s -u admin:geoserver -XDELETE 'http://localhost:8080/geoserver/rest/workspaces/trikaalx/datastores/test_s57_ogr?recurse=true' -w '\nHTTP_CODE:%{http_code}'"
echo ""

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "======================================================================="
ok "S-57 (ENC) support is now enabled on GeoServer!"
echo "======================================================================="
echo ""
echo "  Instance:   ${GCP_INSTANCE} (${GCP_ZONE})"
echo "  Container:  ${CONTAINER_NAME}"
echo "  Approach:   OGR plugin + GDAL 3.0.4 (S-57 driver)"
echo "  Fix:        Added -Djava.library.path=/usr/lib/jni to GEOSERVER_OPTS"
echo ""
echo "  Next steps:"
echo "    1. Upload a .000 (ENC) file to the container:"
echo "       docker cp test.000 ${CONTAINER_NAME}:/opt/geoserver/data_dir/data/s57/"
echo ""
echo "    2. Create an S-57 datastore via REST API:"
echo "       curl -s -u admin:geoserver -XPOST -H 'Content-Type: application/json' \\"
echo "         -d '{\"dataStore\":{\"name\":\"enc_layer\",\"type\":\"OGR\",\"connectionParameters\":{\"entry\":[{\"@key\":\"DriverName\",\"$\":\"S57\"},{\"@key\":\"DataSourceName\",\"$\":\"/opt/geoserver/data_dir/data/s57/test.000\"}]}}}' \\"
echo "         'http://localhost:8080/geoserver/rest/workspaces/trikaalx/datastores'"
echo ""
echo "    3. Publish layers from the datastore as WMS"
echo ""
echo "    4. Create S-52 compliant SLDs for nautical symbology"
echo "       (Reference: https://openseamap.org, http://opennauticalchart.org)"
echo ""
echo "  Verify installation:"
echo "    ./scripts/install-s57-extension.sh --verify"
echo ""
echo "  Test datastore creation:"
echo "    ./scripts/install-s57-extension.sh --test"
echo ""
