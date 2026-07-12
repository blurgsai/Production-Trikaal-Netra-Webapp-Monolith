-- ──────────────────────────────────────────────────────────────────────────────
-- schema.sql — PostGIS schema for vessel_tracking database
--
-- Auto-loaded by docker-entrypoint-initdb.d on first container start.
-- Mirrors the GCP production PostGIS schema (pg_dump --schema-only).
-- ──────────────────────────────────────────────────────────────────────────────

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- ── vessels table ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vessels (
    id text NOT NULL,
    mongo_id text NOT NULL,
    aisinfo_aissource text,
    aisinfo_aistransponderclass text,
    aisinfo_aisversion text,
    aisinfo_model text,
    aisinfo_quality text,
    aisinfo_serial text,
    aisinfo_vendorid text,
    category text,
    subcategory text,
    communication_assignedmode text,
    communication_isnewvessel boolean,
    communication_lastmessagetype bigint,
    communication_lastupdatets bigint,
    communication_rawcommstate bigint,
    communication_repeatindicator bigint,
    communication_tdma_slotoffset bigint,
    communication_tdma_slottimeout bigint,
    communication_tdma_syncstate bigint,
    createdtimestamp bigint,
    updatedtimestamp bigint,
    last_updated_system_time bigint,
    destination_estimatedroute text,
    destination_matched text,
    destination_origin text,
    destination_reported text,
    dimensions_draught_consensusvalue double precision,
    dimensions_draught_historylimit bigint,
    dimensions_draught_lastobservedvalue double precision,
    dimensions_draught_lastupdatets text,
    dimensions_draught_variabilityscore double precision,
    dimensions_tobow_consensusvalue double precision,
    dimensions_tobow_historylimit bigint,
    dimensions_tobow_lastobservedvalue double precision,
    dimensions_tobow_lastupdatets text,
    dimensions_tobow_variabilityscore double precision,
    dimensions_toport_consensusvalue double precision,
    dimensions_toport_historylimit bigint,
    dimensions_toport_lastobservedvalue double precision,
    dimensions_toport_lastupdatets text,
    dimensions_toport_variabilityscore double precision,
    dimensions_tostarboard_consensusvalue double precision,
    dimensions_tostarboard_historylimit bigint,
    dimensions_tostarboard_lastobservedvalue double precision,
    dimensions_tostarboard_lastupdatets text,
    dimensions_tostarboard_variabilityscore double precision,
    dimensions_tostern_consensusvalue double precision,
    dimensions_tostern_historylimit bigint,
    dimensions_tostern_lastobservedvalue double precision,
    dimensions_tostern_lastupdatets text,
    dimensions_tostern_variabilityscore double precision,
    heading_current_consensusvalue double precision,
    heading_current_historylimit bigint,
    heading_current_lastobservedvalue double precision,
    heading_current_lastupdatets text,
    heading_current_variabilityscore double precision,
    course_current_consensusvalue double precision,
    course_current_timestamp bigint,
    identification_buildyear text,
    identification_callsign text,
    identification_flag text,
    identification_imo bigint,
    identification_mmsi bigint,
    identification_portofregistry text,
    identification_shipname text,
    kinematics_accelerationmps2 double precision,
    kinematics_distancemeters double precision,
    kinematics_haskinematics boolean,
    kinematics_headingchangedeg double precision,
    kinematics_headingdeg double precision,
    kinematics_jerkmps3 double precision,
    kinematics_previoustimestamp bigint,
    kinematics_sourcetimestamp bigint,
    kinematics_speedovergroundmps double precision,
    kinematics_timedeltaseconds double precision,
    kinematics_turnratedegpermin double precision,
    kinematicsstats_windowseconds bigint,
    location_current_lat double precision,
    location_current_lon double precision,
    location_current_timestamp bigint,
    location_historylimit bigint,
    navigationstatus text,
    operational_dteflag text,
    operational_epfdtype bigint,
    operational_maneuverindicator bigint,
    operational_positionaccuracy boolean,
    operational_radiostatus bigint,
    operational_raimflag boolean,
    operational_turnrate double precision,
    polygonid text,
    prediction_eta text,
    prediction_location1hr_lat double precision,
    prediction_location1hr_lon double precision,
    prediction_location1hr_timestamp text,
    prediction_timestamp text,
    receivedpoints_counters_total_lastrate double precision,
    receivedpoints_counters_total_total bigint,
    receivedpoints_counters_type_1_lastrate double precision,
    receivedpoints_counters_type_1_total bigint,
    receivedpoints_counters_type_5_lastrate double precision,
    receivedpoints_counters_type_5_total bigint,
    receivedpoints_windowseconds bigint,
    s2_level bigint,
    s2_token text,
    safety_activeevent boolean,
    safety_createdtimestamp text,
    safety_historylimit bigint,
    safety_lastmessage_destinationmmsi text,
    safety_lastmessage_isbroadcast boolean,
    safety_lastmessage_messagetype text,
    safety_lastmessage_retransmit text,
    safety_lastmessage_sequencenumber text,
    safety_lastmessage_sourcemmsi text,
    safety_lastmessage_text text,
    safety_lastmessage_timestamp text,
    safety_lastupdatets text,
    safety_messagecounts_windowseconds bigint,
    servicestatus text,
    speed_average text,
    speed_current_consensusvalue double precision,
    speed_current_historylimit bigint,
    speed_current_lastobservedvalue double precision,
    speed_current_lastupdatets text,
    speed_current_timestamp bigint,
    speed_current_variabilityscore double precision,
    spoof_groupid text,
    spoof_status boolean,
    status_awaitingfirstposition boolean,
    status_navstatus bigint,
    status_navstatusparsed text,
    status_suspicious boolean,
    status_userdefinedsuspicious text,
    voyage_destination text,
    voyage_eta text,
    geom public.geometry(Point,4326)
);

ALTER TABLE public.vessels OWNER TO postgres;

COMMENT ON TABLE public.vessels IS 'Complete vessel tracking data from MongoDB integration_test database - all scalar fields';
COMMENT ON COLUMN public.vessels.id IS 'Vessel ID (vesselId from MongoDB) - Primary Key';
COMMENT ON COLUMN public.vessels.mongo_id IS 'MongoDB document _id (unique)';
COMMENT ON COLUMN public.vessels.geom IS 'PostGIS geometry point (EPSG:4326 - WGS84) for GeoServer compatibility';

-- ── Constraints ──────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vessels_mongo_id_key') THEN
        ALTER TABLE ONLY public.vessels ADD CONSTRAINT vessels_mongo_id_key UNIQUE (mongo_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vessels_pkey') THEN
        ALTER TABLE ONLY public.vessels ADD CONSTRAINT vessels_pkey PRIMARY KEY (id);
    END IF;
END $$;

-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_vessels_category ON public.vessels USING btree (category);
CREATE INDEX IF NOT EXISTS idx_vessels_geom ON public.vessels USING gist (geom);
CREATE INDEX IF NOT EXISTS idx_vessels_imo ON public.vessels USING btree (identification_imo);
CREATE INDEX IF NOT EXISTS idx_vessels_location ON public.vessels USING btree (location_current_lon, location_current_lat);
CREATE INDEX IF NOT EXISTS idx_vessels_mmsi ON public.vessels USING btree (identification_mmsi);
CREATE INDEX IF NOT EXISTS idx_vessels_mongo_id ON public.vessels USING btree (mongo_id);
CREATE INDEX IF NOT EXISTS idx_vessels_nav_status ON public.vessels USING btree (status_navstatus);
CREATE INDEX IF NOT EXISTS idx_vessels_polygon ON public.vessels USING btree (polygonid);
CREATE INDEX IF NOT EXISTS idx_vessels_s2_token ON public.vessels USING btree (s2_token);
CREATE INDEX IF NOT EXISTS idx_vessels_ship_name ON public.vessels USING btree (identification_shipname);
CREATE INDEX IF NOT EXISTS idx_vessels_timestamp ON public.vessels USING btree (last_updated_system_time);
