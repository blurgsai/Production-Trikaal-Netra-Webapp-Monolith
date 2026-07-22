# URL Parameters Reference — Trikaal Netra Webapp

> **Purpose**: This document gives full context on all URL query parameters supported across the three main pages of the application. It is intended for LLMs and humans to construct shareable/bookmarkable links that pre-configure page state directly from the URL.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Data Sources](#data-sources)
- [Design Principles](#design-principles)
- [Map Page (`/map`)](#map-page-map)
- [World Monitoring Page (`/world-monitoring`)](#world-monitoring-page-world-monitoring)
- [Historical Playback Page (`/historical-playback`)](#historical-playback-page-historical-playback)
- [Quick Reference Tables](#quick-reference-tables)

---

## Architecture Overview

The application has three main pages, each with a dedicated `use*UrlParams` hook that parses URL search parameters into structured state on mount.

| Page | Route | Hook | File |
|------|-------|------|------|
| Map | `/map` | `useMapUrlParams` | `frontend/src/features/map/hooks/useMapUrlParams.ts` |
| World Monitoring | `/world-monitoring` | `useWorldMonitoringUrlParams` | `frontend/src/features/worldMonitoring/hooks/useWorldMonitoringUrlParams.ts` |
| Historical Playback | `/historical-playback` | `usePlaybackUrlParams` | `frontend/src/features/historicalPlayback/hooks/usePlaybackUrlParams.ts` |

---

## Data Sources

### 1. PostGIS / GeoServer (Vessel Tracking)

- **Database**: `vessel_tracking` (PostgreSQL + PostGIS, EPSG:4326)
- **Table**: `public.vessels` — 100+ columns mirroring MongoDB `integration_test` vessel data
- **GeoServer Workspace**: `trikaalx`
- **GeoServer Datastore**: `vessel_tracking` (PostGIS)
- **Published Layer**: `trikaalx:vessels`
- **WMS Endpoint**: `{GEOSERVER_BASE_URL}/trikaalx/wms`
- **WFS Endpoint**: `{GEOSERVER_BASE_URL}/trikaalx/ows`
- **Geometry Column**: `geom` (PostGIS Point, EPSG:4326)

#### Key Vessel Table Columns (filterable via WFS CQL)

| Column | Type | Description |
|--------|------|-------------|
| `id` | text PK | Vessel ID (vesselId from MongoDB) |
| `identification_mmsi` | bigint | MMSI number |
| `identification_imo` | bigint | IMO number |
| `identification_callsign` | text | Callsign |
| `identification_shipname` | text | Ship/vessel name |
| `identification_flag` | text | Flag state |
| `identification_portofregistry` | text | Port of registry |
| `navigationstatus` | text | Navigation status text |
| `status_navstatus` | bigint | Numeric nav status (0-15) |
| `status_navstatusparsed` | text | Parsed nav status |
| `location_current_lat` | double | Current latitude |
| `location_current_lon` | double | Current longitude |
| `heading_current_consensusvalue` | double | Current heading (degrees) |
| `course_current_consensusvalue` | double | Current course over ground |
| `speed_current_consensusvalue` | double | Current speed |
| `kinematics_speedovergroundmps` | double | Speed over ground (m/s) |
| `kinematics_headingdeg` | double | Kinematics heading (degrees) |
| `kinematics_distance_m` | double | Distance traveled (meters) |
| `kinematics_accelerationmps2` | double | Acceleration (m/s²) |
| `destination_reported` | text | Reported destination |
| `destination_estimatedroute` | text | Estimated route destination |
| `voyage_destination` | text | Voyage destination |
| `voyage_eta` | text | Estimated time of arrival |
| `category` | text | Vessel category |
| `subcategory` | text | Vessel subcategory |
| `polygonid` | text | Polygon/zone ID |
| `s2_level` | bigint | S2 cell level |
| `s2_token` | text | S2 cell token |
| `spoof_status` | boolean | Spoofing flag |
| `status_suspicious` | boolean | Suspicious activity flag |
| `dimensions_draught_consensusvalue` | double | Draught depth |
| `operational_epfdtype` | bigint | EPFD type |
| `operational_maneuverindicator` | bigint | Maneuver indicator |
| `servicestatus` | text | Service status |
| `communication_assignedmode` | text | Communication assigned mode |

### 2. ClickHouse (AIS Trajectory Data)

- **Table**: `default.ais_processed_flat` (also `integration_test.ais_processed_flat` for recent trajectories)
- **Query Method**: HTTP POST with TabSeparated format
- **Columns**:

| Column | Type | Description |
|--------|------|-------------|
| `vessel_id` | Int | Vessel ID (numeric) |
| `mmsi` | Int | MMSI number |
| `lat` | Float | Latitude |
| `lon` | Float | Longitude |
| `heading` | Float | Heading (degrees) |
| `speed` | Float | Speed |
| `course` | Float | Course over ground |
| `status` | Int | Navigation status code |
| `imo` | Int | IMO number |
| `ship_type` | Int | Ship type code |
| `draught` | Float | Draught |
| `shipname` | String | Ship name |
| `callsign` | String | Callsign |
| `destination` | String | Destination |
| `metadata_source` | String | Data source |
| `metadata_timestamp` | Int | Unix epoch milliseconds (UTC) |
| `processing_kinematics_speed_mps` | Float | Processed speed (m/s) |
| `processing_kinematics_distance_m` | Float | Processed distance (m) |
| `processing_kinematics_dt_s` | Float | Time delta (seconds) |
| `processing_kinematics_accel_mps2` | Float | Processed acceleration |
| `processing_kinematics_heading_change_deg` | Float | Heading change (degrees) |
| `processing_kinematics_cog_deg` | Float | Processed COG (degrees) |

#### ClickHouse Filter Column Allowlist

**Numeric columns**: `vessel_id`, `mmsi`, `lat`, `lon`, `heading`, `speed`, `course`, `status`, `imo`, `ship_type`, `draught`, `processing_kinematics_speed_mps`, `processing_kinematics_distance_m`, `processing_kinematics_dt_s`, `processing_kinematics_accel_mps2`, `processing_kinematics_heading_change_deg`, `processing_kinematics_cog_deg`

**Text columns**: `shipname`, `callsign`, `destination`, `metadata_source`

**Operators**: `eq` (=), `ne` (!=), `gt` (>), `gte` (>=), `lt` (<), `lte` (<=), `like` (LIKE)

### 3. MongoDB (World Monitoring)

- **Database**: `integration_test` (via Motor async driver)
- **Collections**:

#### `world_monitor_events`

| Field | Type | Description |
|-------|------|-------------|
| `event_id` | string | Event identifier |
| `event_type` | string | Event type (e.g., "Piracy", "Conflict") |
| `threat_level` | string | Severity: LOW, MEDIUM, HIGH, CRITICAL |
| `summary` | string | Event summary |
| `reasoning` | string | AI reasoning for classification |
| `relevance_score` | float | Relevance score (0.0–1.0) |
| `enriched_at` | string (ISO datetime) | When event was enriched |
| `article_id` | ObjectId | Linked article reference |
| `location.name` | string | Location name |
| `location.lat` | float | Location latitude |
| `location.lng` | float | Location longitude |
| `extracted_data.extracted_data.location` | string | Extracted location |
| `extracted_data.extracted_data.vessel_name` | string | Extracted vessel name |
| `extracted_data.extracted_data.threat_type` | string | Extracted threat type |
| `extracted_data.extracted_data.origin` | string | Extracted origin |
| `extracted_data.extracted_data.damage` | string | Extracted damage info |
| `extracted_data.extracted_data.countermeasures` | string | Extracted countermeasures |
| `source` | string | Source (via linked article) |

#### `world_monitor_articles`

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Article title |
| `summary` | string | Article summary |
| `source` | string | Source name |
| `source_type` | string | Source type (e.g., "RSS", "Web") |
| `author` | string | Author |
| `processing_status` | string | Processing status |
| `published` | string (ISO datetime) | Publication date |
| `ingested_at` | string (ISO datetime) | Ingestion date |
| `updated` | string (ISO datetime) | Last updated date |
| `tags` | array[string] | Article tags |
| `location.name` | string | Location name |

### 4. MongoDB (Admin/Vessel Data Uploads)

- **Collection**: `vessel_data_uploads` — stores uploaded vessel data keyed by MMSI
- **Collection**: `lloyds_latest` — Lloyds Register data keyed by IMO

### 5. Tileserver (Basemaps & Overlays)

- **Service**: FastAPI tileserver on separate port
- **Endpoints**: `/basemaps`, `/overlays`, `/tiles`
- **Used by Map page** for basemap selection and overlay layers

---

## Design Principles

1. **One-way binding**: URL params → initial state only. UI interactions never modify the URL.
2. **Read-only**: Hooks use `useSearchParams()` in read-only mode (no `setSearchParams`).
3. **Memoized**: All hooks use `useMemo` for stable return references.
4. **Validation**: Invalid values are silently rejected (e.g., invalid granularity, malformed polygons).
5. **Combinator logic**: First filter has `combinator: undefined`; subsequent filters default to `"AND"`.
6. **Repeatable params**: Use `searchParams.getAll()` for repeatable keys (e.g., `zone`, `mmsi`).

---

## Map Page (`/map`)

The Map page displays real-time vessel positions on a Leaflet map with WMS/WFS layers from GeoServer. It supports vessel selection, track display, zone drawing, layer toggling, and a vessel data table with progressive filters.

### URL Parameters

#### `vessel` — Select vessel by MMSI

```
?vessel=123456789
```

- **Type**: string (numeric MMSI)
- **Effect**: Fetches vessel info via WFS `GetFeature` with `CQL_FILTER=identification_mmsi={mmsi}` and selects it on the map
- **Backend**: GeoServer WFS → `trikaalx:vessels` layer

#### `track` — Show vessel track for last N seconds

```
?track=3600
```

- **Type**: integer (seconds)
- **Effect**: Fetches trajectory from `GET /vessels/trajectory/{vessel_id}?time={track}`
- **Backend**: ClickHouse `integration_test.ais_processed_flat` (last N seconds)
- **Max**: 2,592,000 (30 days)

#### `zone` — Polygon zone filter (repeatable)

```
?zone=18.4,72.8,18.6,73.0,18.5,73.2
```

- **Type**: comma-separated lat,lng pairs (minimum 3 points = 6 coords)
- **Repeatable**: Multiple `zone` params create multiple polygon filters
- **Effect**: Filters vessel table via WFS CQL `WITHIN(geom, SRID=4326;POLYGON((...)))`
- **Validation**: Even coordinate count, ≥6 values, no NaN
- **Format**: `lat1,lng1,lat2,lng2,lat3,lng3,...` (ring auto-closed)

#### `flyto` — Fly camera to bounding box

```
?flyto=72.8,18.4,73.2,18.6
```

- **Type**: `minLng,minLat,maxLng,maxLat` (4 comma-separated floats)
- **Effect**: Animates map to the specified bounding box
- **Note**: URL order is lng,lat but parsed as `[minLat, minLng, maxLat, maxLng]`

#### `layers` — Enable overlay layers

```
?layers=eez,basemap_dark
```

- **Type**: comma-separated layer IDs
- **Effect**: Toggles on the specified overlay layers from tileserver

#### `basemap` — Set base map style

```
?basemap=dark
```

- **Type**: string (basemap ID from tileserver)
- **Effect**: Sets the base map layer

#### `briefing` — Open briefing panel

```
?briefing=1
```

- **Type**: `"1"` or `"true"`
- **Effect**: Opens the briefing sidebar panel

#### `view` — Set visible tiles/panels

```
?view=map,table
```

- **Type**: comma-separated tile IDs
- **Valid values**: `map`, `table`, `layers`, `vessel`, `charts`
- **Effect**: Shows only the specified tiles/panels

#### Vessel Table Filters — Any non-reserved param

Any URL param that is NOT one of the reserved params (`vessel`, `track`, `zone`, `flyto`, `layers`, `basemap`, `briefing`, `view`) is treated as a vessel table column filter.

```
?identification_mmsi=123456789
?identification_shipname=contains:Nimitz
?speed_current_consensusvalue=>=15
?navigationstatus=Under Way
```

**Operator prefixes** (checked in order, first match wins):

| Prefix | Operator | Example |
|--------|----------|---------|
| `contains:` | contains (LIKE %value%) | `?identification_shipname=contains:Nimitz` |
| `starts:` | startsWith (LIKE value%) | `?identification_shipname=starts:USS` |
| `ends:` | endsWith (LIKE %value) | `?identification_shipname=ends:Carrier` |
| `>=` | >= | `?speed_current_consensusvalue=>=15` |
| `<=` | <= | `?speed_current_consensusvalue=<=25` |
| `!=` | != | `?navigationstatus!=Under Way` |
| `>` | > | `?heading_current_consensusvalue=>90` |
| `<` | < | `?heading_current_consensusvalue=<270` |
| `=` | = (exact match) | `?identification_mmsi=123456789` |
| *(no prefix)* | = (default) | `?identification_mmsi=123456789` |

**Column names**: Use the exact PostGIS column names from the `vessels` table (see [Key Vessel Table Columns](#key-vessel-table-columns-filterable-via-wfs-cql)). Numeric vs text type is auto-detected by column name suffix.

### Example Map URLs

```
# Select vessel by MMSI and show 1-hour track
/map?vessel=123456789&track=3600

# Filter vessels in a zone with speed > 15 knots
/map?zone=18.4,72.8,18.6,73.0,18.5,73.2&speed_current_consensusvalue=>15

# Fly to Mumbai area, dark basemap, show table and layers panels
/map?flyto=72.8,18.4,73.2,18.6&basemap=dark&view=map,table,layers

# Filter by ship name containing "Nimitz" with briefing open
/map?identification_shipname=contains:Nimitz&briefing=1
```

---

## World Monitoring Page (`/world-monitoring`)

The World Monitoring page displays threat events and news articles with progressive filtering. It has two tabs: Threats and Articles.

### URL Parameters

#### `tab` — Active tab

```
?tab=threats
```

- **Type**: `"threats"` or `"articles"`
- **Default**: `"threats"`

#### `sort` — Sort order

```
?sort=latest
```

- **Type**: `"latest"`, `"oldest"`, `"most_relevant"`, `"most_severe"`
- **Applies to**: Both threats and articles

### Threat Filters

#### `keyword` — Full-text keyword search

```
?keyword=piracy
```

- **Type**: string
- **Effect**: Searches across `event_type`, `threat_level`, `reasoning`, `extracted_data.reasoning` (case-insensitive regex)

#### `event_type` — Filter by event type (repeatable)

```
?event_type=Piracy&event_type=Conflict
```

- **Type**: string (repeatable)
- **Effect**: `$in` match on `event_type` field

#### `threat_level` — Filter by threat level (repeatable)

```
?threat_level=HIGH&threat_level=CRITICAL
```

- **Type**: string (repeatable)
- **Valid values**: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`
- **Effect**: `$in` match on `threat_level` field

#### `source` — Filter by source (repeatable)

```
?source=Reuters&source=AP News
```

- **Type**: string (repeatable)
- **Effect**: Resolves article IDs from `world_monitor_articles` by source, then filters events by `article_id`

#### `date_from` / `date_to` — Date range

```
?date_from=2025-01-01T00:00:00Z&date_to=2025-01-31T23:59:59Z
```

- **Type**: ISO 8601 datetime string
- **Effect**: Range filter on `enriched_at` field

#### `has_article` — Has linked article

```
?has_article=true
```

- **Type**: `"true"` or `"false"`
- **Effect**: Filters events that have/don't have a linked article

#### `relevance_min` / `relevance_max` — Relevance score range

```
?relevance_min=0.7&relevance_max=1.0
```

- **Type**: float (0.0–1.0)
- **Effect**: Range filter on `relevance_score`

#### `location` — Location name search

```
?location=Gulf of Aden
```

- **Type**: string
- **Effect**: Case-insensitive regex on `location.name`

#### `vessel_name` — Extracted vessel name search

```
?vessel_name=USS Nimitz
```

- **Type**: string
- **Effect**: Case-insensitive regex on `extracted_data.extracted_data.vessel_name`

#### `threat_type` — Extracted threat type search

```
?threat_type=missile
```

- **Type**: string
- **Effect**: Case-insensitive regex on `extracted_data.extracted_data.threat_type`

#### `origin` — Extracted origin search

```
?origin=Iran
```

- **Type**: string
- **Effect**: Case-insensitive regex on `extracted_data.extracted_data.origin`

#### `damage` — Extracted damage info search

```
?damage=structural
```

- **Type**: string
- **Effect**: Case-insensitive regex on `extracted_data.extracted_data.damage`

#### `countermeasures` — Extracted countermeasures search

```
?countermeasures=naval patrol
```

- **Type**: string
- **Effect**: Case-insensitive regex on `extracted_data.extracted_data.countermeasures`

### Article Filters

#### `search` — Full-text article search

```
?search=South China Sea
```

- **Type**: string
- **Effect**: Searches across `title`, `summary`, `source`, `author` (case-insensitive regex)

#### `title` — Title search

```
?title=South China Sea
```

- **Type**: string
- **Effect**: Case-insensitive regex on `title`

#### `author` — Author search

```
?author=Reuters
```

- **Type**: string
- **Effect**: Case-insensitive regex on `author`

#### `source` — Exact source match

```
?source=Reuters
```

- **Type**: string
- **Effect**: Exact match on `source`

#### `source_type` — Source type filter

```
?source_type=RSS
```

- **Type**: string
- **Effect**: Exact match on `source_type`

#### `status` — Processing status filter

```
?status=processed
```

- **Type**: string
- **Effect**: Exact match on `processing_status`

#### `published_from` / `published_to` — Published date range

```
?published_from=2025-01-01T00:00:00Z&published_to=2025-01-31T23:59:59Z
```

- **Type**: ISO 8601 datetime string
- **Effect**: Range filter on `published`

#### `ingested_from` / `ingested_to` — Ingested date range

```
?ingested_from=2025-01-01T00:00:00Z
```

- **Type**: ISO 8601 datetime string
- **Effect**: Range filter on `ingested_at`

#### `updated_from` / `updated_to` — Updated date range

```
?updated_from=2025-01-01T00:00:00Z
```

- **Type**: ISO 8601 datetime string
- **Effect**: Range filter on `updated`

#### `tags` — Tag search

```
?tags=maritime security
```

- **Type**: string
- **Effect**: Case-insensitive regex on `tags`

#### `article_location` — Article location name search

```
?article_location=Strait of Hormuz
```

- **Type**: string
- **Effect**: Case-insensitive regex on `location.name`

### Example World Monitoring URLs

```
# View critical threats in Gulf of Aden from Jan 2025
/world-monitoring?tab=threats&threat_level=CRITICAL&location=Gulf of Aden&date_from=2025-01-01T00:00:00Z

# Search articles about South China Sea from Reuters
/world-monitoring?tab=articles&search=South China Sea&source=Reuters&sort=latest

# High relevance piracy events with linked articles
/world-monitoring?tab=threats&event_type=Piracy&relevance_min=0.8&has_article=true
```

---

## Historical Playback Page (`/historical-playback`)

The Historical Playback page allows users to define a geographic zone (polygon) and time window, then play back vessel movements within that zone. It queries ClickHouse `ais_processed_flat` for historical AIS data.

### URL Parameters

#### `start` — Playback start datetime

```
?start=2025-01-01T10:00:00Z
```

- **Type**: ISO 8601 datetime string (UTC)
- **Effect**: Sets playback window start time
- **Backend**: Converted to `YYYY-MM-DD HH:MM:SS` UTC for ClickHouse query

#### `end` — Playback end datetime

```
?end=2025-01-01T12:00:00Z
```

- **Type**: ISO 8601 datetime string (UTC)
- **Effect**: Sets playback window end time

#### `granularity` — Time frame granularity

```
?granularity=minute
```

- **Type**: string
- **Valid values**: `minute`, `hour`, `day`, `week`
- **Default**: `hour`
- **Effect**: Controls playback frame interval (60s, 3600s, 86400s, 604800s)
- **Invalid values**: Silently rejected, falls back to default

#### `zone` — Polygon zone (repeatable)

```
?zone=18.4,72.8,18.6,73.0,18.5,73.2,18.4,72.8
```

- **Type**: comma-separated lat,lng pairs (minimum 3 points = 6 coords)
- **Repeatable**: Multiple `zone` params create a MultiPolygon
- **Effect**: Sets the geographic zone for playback; auto-opens the playback configuration dialog
- **Validation**: Even coordinate count, ≥6 values, no NaN, ring auto-closed
- **Format**: `lat1,lng1,lat2,lng2,lat3,lng3,...`
- **Backend**: Polygon bounding box used for ClickHouse query, then precise polygon containment check via Shapely

### Vessel Filters

#### `mmsi` — Filter by MMSI (repeatable)

```
?mmsi=123456789&mmsi=987654321
```

- **Type**: integer (repeatable)
- **Effect**: `eq` filter on `mmsi` column in ClickHouse

#### `vessel_id` — Filter by vessel ID (repeatable)

```
?vessel_id=42&vessel_id=100
```

- **Type**: integer (repeatable)
- **Effect**: `eq` filter on `vessel_id` column in ClickHouse

#### `speed_min` / `speed_max` — Speed range filter

```
?speed_min=10&speed_max=25
```

- **Type**: float
- **Effect**: `gte` on `speed` for `speed_min`, `lte` on `speed` for `speed_max`

#### `ship_name` — Ship name search

```
?ship_name=Nimitz
```

- **Type**: string
- **Effect**: `like` filter on `shipname` column in ClickHouse

#### `destination` — Destination search

```
?destination=Singapore
```

- **Type**: string
- **Effect**: `like` filter on `destination` column in ClickHouse

#### `callsign` — Callsign search

```
?callsign=ABC123
```

- **Type**: string
- **Effect**: `like` filter on `callsign` column in ClickHouse

#### `nav_status` — Navigation status filter

```
?nav_status=0
```

- **Type**: integer (0–15 AIS navigation status codes)
- **Effect**: `eq` filter on `status` column in ClickHouse

#### `heading_min` / `heading_max` — Heading range filter

```
?heading_min=90&heading_max=270
```

- **Type**: float (0–360 degrees)
- **Effect**: `gte`/`lte` on `heading` column in ClickHouse

#### `course_min` / `course_max` — Course range filter

```
?course_min=0&course_max=180
```

- **Type**: float (0–360 degrees)
- **Effect**: `gte`/`lte` on `course` column in ClickHouse

### Filter Combinator Logic

All filters are combined with `AND` logic. The first filter has `combinator: undefined`; each subsequent filter has `combinator: "AND"`.

The backend translates these to a single ClickHouse WHERE clause:
```sql
WHERE (mmsi = 123456789 AND speed >= 10 AND speed <= 25 AND shipname LIKE '%Nimitz%')
```

### Example Historical Playback URLs

```
# Playback in Mumbai area for 2 hours at minute granularity
/historical-playback?start=2025-01-01T10:00:00Z&end=2025-01-01T12:00:00Z&granularity=minute&zone=18.4,72.8,18.6,73.0,18.5,73.2

# Playback with MMSI filter and speed range
/historical-playback?start=2025-01-01T10:00:00Z&end=2025-01-01T14:00:00Z&mmsi=123456789&speed_min=10&speed_max=25

# Multi-zone playback with ship name filter
/historical-playback?zone=18.4,72.8,18.6,73.0,18.5,73.2&zone=19.0,73.0,19.2,73.2,19.1,73.3&ship_name=Nimitz&granularity=hour
```

---

## Quick Reference Tables

### All Reserved Params (Not Treated as Vessel Table Filters on Map Page)

| Param | Page | Description |
|-------|------|-------------|
| `vessel` | Map | Vessel MMSI selection |
| `track` | Map | Track duration in seconds |
| `zone` | Map, Playback | Polygon coordinates |
| `flyto` | Map | Camera bounding box |
| `layers` | Map | Overlay layer IDs |
| `basemap` | Map | Basemap ID |
| `briefing` | Map | Open briefing panel |
| `view` | Map | Visible tiles |
| `tab` | World Monitoring | Active tab |
| `sort` | World Monitoring | Sort order |
| `start` | Playback | Start datetime |
| `end` | Playback | End datetime |
| `granularity` | Playback | Frame granularity |
| `mmsi` | Playback | MMSI filter |
| `vessel_id` | Playback | Vessel ID filter |
| `speed_min` | Playback | Min speed |
| `speed_max` | Playback | Max speed |
| `ship_name` | Playback | Ship name |
| `destination` | Playback | Destination |
| `callsign` | Playback | Callsign |
| `nav_status` | Playback | Navigation status |
| `heading_min` | Playback | Min heading |
| `heading_max` | Playback | Max heading |
| `course_min` | Playback | Min course |
| `course_max` | Playback | Max course |
| `keyword` | World Monitoring | Keyword search |
| `event_type` | World Monitoring | Event type filter |
| `threat_level` | World Monitoring | Threat level filter |
| `source` | World Monitoring | Source filter |
| `date_from` | World Monitoring | Date range start |
| `date_to` | World Monitoring | Date range end |
| `has_article` | World Monitoring | Has linked article |
| `relevance_min` | World Monitoring | Min relevance |
| `relevance_max` | World Monitoring | Max relevance |
| `location` | World Monitoring | Location search |
| `vessel_name` | World Monitoring | Extracted vessel name |
| `threat_type` | World Monitoring | Extracted threat type |
| `origin` | World Monitoring | Extracted origin |
| `damage` | World Monitoring | Extracted damage |
| `countermeasures` | World Monitoring | Extracted countermeasures |
| `search` | World Monitoring | Article search |
| `title` | World Monitoring | Article title |
| `author` | World Monitoring | Article author |
| `source_type` | World Monitoring | Source type |
| `status` | World Monitoring | Processing status |
| `published_from` | World Monitoring | Published date start |
| `published_to` | World Monitoring | Published date end |
| `ingested_from` | World Monitoring | Ingested date start |
| `ingested_to` | World Monitoring | Ingested date end |
| `updated_from` | World Monitoring | Updated date start |
| `updated_to` | World Monitoring | Updated date end |
| `tags` | World Monitoring | Tags search |
| `article_location` | World Monitoring | Article location |

### Datetime Formats

All datetime parameters accept ISO 8601 format:
- `2025-01-01T10:00:00Z` (UTC with Z suffix)
- `2025-01-01T10:00:00+00:00` (UTC with offset)
- `2025-01-01T10:00:00` (assumed UTC if no timezone)

### Polygon/Zone Format

All polygon parameters use the same format:
```
lat1,lng1,lat2,lng2,lat3,lng3,...
```
- Minimum 3 points (6 coordinate values)
- Even number of values required
- Ring is auto-closed (first point appended if not already)
- Multiple `zone` params create multiple polygons (MultiPolygon on playback, multiple polygon filters on map)
