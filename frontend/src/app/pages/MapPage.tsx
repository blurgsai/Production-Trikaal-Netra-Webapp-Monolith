import { Box, Typography, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { BaseMap, MapNavbar, VesselTableTool, LayerPanel, VesselConfigPanel, ChartHouse, useMapConfig, useVesselTrajectory, useVesselTable, useVesselColumns, MapTileSettings, useMapUrlParams, useVesselByMmsi, mapRawVesselToInfo } from "@/features/map";
import type { VesselInfo, VesselConfig, ViewTile, Polygon, PopupFieldConfig, ChartConfig } from "@/features/map";
import { useLocalStorage } from "@/shared";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Mosaic, MosaicWindow, type MosaicNode } from "react-mosaic-component";
import "react-mosaic-component/react-mosaic-component.css";
import "@/shared/ui/mosaic/mosaic.css";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

const DEFAULT_TILES: ViewTile[] = ["map", "table"];
const DEFAULT_LAYOUT: MosaicNode<ViewTile> = {
  direction: "row",
  first: "map",
  second: "table",
  splitPercentage: 60,
} as unknown as MosaicNode<ViewTile>;

const SECONDARY_TILES: ViewTile[] = ["layers", "vessel", "charts"];

function buildMosaicLayout(
  tiles: ViewTile[],
  twoTileSplit = 50
): MosaicNode<ViewTile> {
  if (tiles.length === 1) return tiles[0];
  if (tiles.length === 2) {
    return {
      direction: "row",
      first: tiles[0],
      second: tiles[1],
      splitPercentage: twoTileSplit,
    } as unknown as MosaicNode<ViewTile>;
  }
  if (tiles.length === 3) {
    return {
      direction: "row",
      first: tiles[0],
      second: {
        direction: "column",
        first: tiles[1],
        second: tiles[2],
        splitPercentage: 50,
      },
      splitPercentage: 60,
    } as unknown as MosaicNode<ViewTile>;
  }
  if (tiles.length === 4) {
    return {
      direction: "row",
      first: {
        direction: "column",
        first: tiles[0],
        second: tiles[1],
        splitPercentage: 50,
      },
      second: {
        direction: "column",
        first: tiles[2],
        second: tiles[3],
        splitPercentage: 50,
      },
      splitPercentage: 50,
    } as unknown as MosaicNode<ViewTile>;
  }
  return {
    direction: "row",
    first: tiles[0],
    second: {
      direction: "column",
      first: {
        direction: "row",
        first: tiles[1],
        second: tiles[2],
        splitPercentage: 50,
      },
      second: {
        direction: "row",
        first: tiles[3],
        second: tiles[4],
        splitPercentage: 50,
      },
      splitPercentage: 50,
    },
    splitPercentage: 50,
  } as unknown as MosaicNode<ViewTile>;
}

function MapPage() {
  const theme = useTheme();
  const below1440 = useMediaQuery(theme.breakpoints.down(1440));
  const below1280 = useMediaQuery(theme.breakpoints.down(1280));

  const urlParams = useMapUrlParams();
  const vesselFromUrl = useVesselByMmsi(urlParams.vessel);
  const { fetchColumns, searchValues } = useVesselColumns();
  const {
    baseMaps,
    selectedBaseMap,
    setSelectedBaseMap,
    activeLayers,
    toggleLayer,
    getOrderedLayers,
    layerOrder,
    reorderLayers,
    overlayLayers,
    vesselConfig,
    setVesselConfig,
    applyVesselStyle,
    refreshKey,
    selectedVessel,
    setSelectedVessel,
    mapControlSettings,
    setMapControlSettings,
    flyToBounds,
    setFlyToBounds,
    flyToLayer,
  } = useMapConfig({
    urlOverrides: urlParams.hasParams
      ? {
          basemap: urlParams.basemap,
          layers: urlParams.layers,
          briefing: urlParams.briefing,
          flyto: urlParams.flyto,
          trackSeconds: urlParams.track,
        }
      : undefined,
  });

  const [selectedVesselPosition, setSelectedVesselPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [polygonFilters, setPolygonFilters] = useState<Polygon[]>(urlParams.zone);
  const [visibleTiles, setVisibleTiles] = useLocalStorage<ViewTile[]>("trikaal_mosaic_tiles", DEFAULT_TILES);
  const [mosaicLayout, setMosaicLayout] = useLocalStorage<MosaicNode<ViewTile>>("trikaal_mosaic_layout", DEFAULT_LAYOUT);
  const [chartConfigs, setChartConfigs] = useLocalStorage<ChartConfig[]>("trikaal_chart_configs", []);
  const [sessionUnlockedSecondary, setSessionUnlockedSecondary] = useState<ViewTile[]>([]);
  const [displayLayout, setDisplayLayout] = useState<MosaicNode<ViewTile>>(mosaicLayout);
  const [selectionAnnouncement, setSelectionAnnouncement] = useState("");

  useEffect(() => {
    if (urlParams.view.length > 0) {
      setVisibleTiles(urlParams.view as ViewTile[]);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const effectiveVisibleTiles = useMemo(() => {
    if (!below1440) return visibleTiles;
    return visibleTiles.filter((tile) => {
      if (tile === "map" || tile === "table") return true;
      return sessionUnlockedSecondary.includes(tile);
    });
  }, [below1440, visibleTiles, sessionUnlockedSecondary]);

  const autoHiddenSecondary = useMemo(() => {
    if (!below1440) return false;
    return visibleTiles.some(
      (tile) => SECONDARY_TILES.includes(tile) && !sessionUnlockedSecondary.includes(tile)
    );
  }, [below1440, visibleTiles, sessionUnlockedSecondary]);

  const handleVisibleTilesChange = useCallback(
    (tiles: ViewTile[]) => {
      setVisibleTiles(tiles);
      if (below1440) {
        setSessionUnlockedSecondary(tiles.filter((t) => SECONDARY_TILES.includes(t)));
      }
    },
    [below1440, setVisibleTiles]
  );

  const handleCreateChart = useCallback((chart: ChartConfig) => {
    setChartConfigs((prev) => [...prev, chart]);
  }, [setChartConfigs]);

  const handleUpdateChart = useCallback((id: string, updated: ChartConfig) => {
    setChartConfigs((prev) => prev.map((c) => (c.id === id ? updated : c)));
  }, [setChartConfigs]);

  const handleDeleteChart = useCallback((id: string) => {
    setChartConfigs((prev) => prev.filter((c) => c.id !== id));
  }, [setChartConfigs]);

  const {
    filters,
    appliedFilters,
    page,
    pageSize,
    sortBy,
    sortOrder,
    allTableColumns,
    visibleColumns,
    showResults,
    pageData,
    loading,
    error,
    columnOptions,
    savedFilters,
    cqlFilter,
    addFilter,
    updateFilter,
    removeFilter,
    resetFilters,
    goToPage,
    changePageSize,
    setSort,
    toggleColumn,
    setColumnVisibility,
    applyFilters,
    loadColumnOptions,
    saveCurrentFilter,
    loadSavedFilter,
    deleteSavedFilter,
  } = useVesselTable({
    polygonFilters,
    onPolygonFiltersChange: setPolygonFilters,
    initialFilters: urlParams.filters.length > 0 ? urlParams.filters : undefined,
  });

  const { trajectory, load: loadTrajectory, clear: clearTrajectory } = useVesselTrajectory();

  const handleVesselClick = (vessel: VesselInfo) => {
    loadTrajectory({
      vesselId: vessel.id,
      timeSeconds: vesselConfig.trajectory.timeSeconds,
      lat: vessel.locationCurrentLat,
      lon: vessel.locationCurrentLon,
      heading: vessel.headingCurrentConsensusValue,
      speed: vessel.speedCurrentConsensusValue,
    });
  };

  const handleVesselSelect = (vessel: VesselInfo | null, latlng?: { lat: number; lng: number }) => {
    setSelectedVessel(vessel);
    setSelectedVesselPosition(latlng ?? null);
    if (!vessel) {
      clearTrajectory();
      setSelectionAnnouncement("Selection cleared");
    } else {
      const label = vessel.name || vessel.mmsi || vessel.id;
      setSelectionAnnouncement(`Selected vessel ${label}`);
    }
  };

  const handleTableVesselSelect = useCallback(
    (row: { id: string | number; properties: Record<string, unknown> } | null) => {
      if (!row) {
        handleVesselSelect(null);
        return;
      }
      const info = mapRawVesselToInfo({ id: row.id, ...row.properties });
      if (info) {
        handleVesselSelect(info, {
          lat: info.locationCurrentLat,
          lng: info.locationCurrentLon,
        });
        handleVesselClick(info);
      } else {
        setSelectionAnnouncement(`Selected row ${row.id}`);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vesselConfig.trajectory.timeSeconds]
  );

  const handlePopupFieldsChange = (fields: PopupFieldConfig) => {
    setVesselConfig((prev) => ({ ...prev, popupFields: fields }));
  };

  useEffect(() => {
    if (!vesselFromUrl) return;
    setSelectedVessel(vesselFromUrl);
    setSelectedVesselPosition({ lat: vesselFromUrl.locationCurrentLat, lng: vesselFromUrl.locationCurrentLon });
    setSelectionAnnouncement(
      `Selected vessel ${vesselFromUrl.name || vesselFromUrl.mmsi || vesselFromUrl.id}`
    );
    loadTrajectory({
      vesselId: vesselFromUrl.id,
      timeSeconds: vesselConfig.trajectory.timeSeconds,
      lat: vesselFromUrl.locationCurrentLat,
      lon: vesselFromUrl.locationCurrentLon,
      heading: vesselFromUrl.headingCurrentConsensusValue,
      speed: vesselFromUrl.speedCurrentConsensusValue,
    });
  }, [vesselFromUrl, loadTrajectory, vesselConfig.trajectory.timeSeconds, setSelectedVessel]);

  const handleApplyVesselStyle = async (draft: VesselConfig) => {
    await applyVesselStyle(draft);
    if (selectedVessel) {
      loadTrajectory({
        vesselId: selectedVessel.id,
        timeSeconds: draft.trajectory.timeSeconds,
        lat: selectedVessel.locationCurrentLat,
        lon: selectedVessel.locationCurrentLon,
        heading: selectedVessel.headingCurrentConsensusValue,
        speed: selectedVessel.speedCurrentConsensusValue,
      });
    }
  };

  const handleApplyFilters = () => {
    applyFilters();
  };

  useEffect(() => {
    if (effectiveVisibleTiles.length === 0) return;

    const twoTileSplit =
      below1280 &&
      effectiveVisibleTiles.length === 2 &&
      effectiveVisibleTiles.includes("map") &&
      effectiveVisibleTiles.includes("table")
        ? 70
        : effectiveVisibleTiles.length === 2
          ? 50
          : 50;

    const nextLayout = buildMosaicLayout(effectiveVisibleTiles, twoTileSplit);
    setDisplayLayout(nextLayout);

    // Persist layout only at full desktop widths — responsive overrides stay session-only
    if (!below1440) {
      setMosaicLayout(nextLayout);
    }
  }, [effectiveVisibleTiles, below1280, below1440, setMosaicLayout]);

  const getTileTitle = (id: ViewTile): string => {
    switch (id) {
      case "map": return "Map";
      case "table": return "Vessel Table";
      case "layers": return "Map Config";
      case "vessel": return "Vessel Config";
      case "charts": return "Chart House";
    }
  };

  const renderTile = (id: ViewTile, path: number[]) => {
    return (
      <MosaicWindow<ViewTile>
        path={path}
        title={getTileTitle(id)}
        createNode={() => id}
        toolbarControls={
          id === "map" ? (
            <MapTileSettings
              settings={mapControlSettings}
              onChange={setMapControlSettings}
            />
          ) : (
            <div />
          )
        }
      >
        {id === "table" && (
          <VesselTableTool
            page={page}
            pageSize={pageSize}
            sortBy={sortBy}
            sortOrder={sortOrder}
            allTableColumns={allTableColumns}
            visibleColumns={visibleColumns}
            showResults={showResults}
            pageData={pageData}
            loading={loading}
            error={error}
            selectedVesselId={selectedVessel?.id ?? null}
            onVesselRowSelect={handleTableVesselSelect}
            onGoToPage={goToPage}
            onChangePageSize={changePageSize}
            onSetSort={setSort}
            onToggleColumn={toggleColumn}
            onSetColumnVisibility={setColumnVisibility}
            onClose={() => {}}
          />
        )}
        {id === "map" && (
          <BaseMap
            selectedBaseMap={selectedBaseMap}
            activeLayers={activeLayers}
            orderedLayers={getOrderedLayers()}
            vesselConfig={vesselConfig}
            refreshKey={refreshKey}
            vesselCqlFilter={cqlFilter}
            selectedVessel={selectedVessel}
            selectedVesselPosition={selectedVesselPosition}
            onVesselSelect={handleVesselSelect}
            trajectory={trajectory}
            trajectoryConfig={vesselConfig.trajectory}
            deadReckoningConfig={vesselConfig.deadReckoning}
            onVesselClick={handleVesselClick}
            onPopupFieldsChange={handlePopupFieldsChange}
            polygonFilters={polygonFilters}
            onPolygonFiltersChange={setPolygonFilters}
            mapControlSettings={mapControlSettings}
            flyToBounds={flyToBounds}
            onFlyDone={() => setFlyToBounds(null)}
          />
        )}
        {id === "layers" && (
          <LayerPanel
            selectedBaseMap={selectedBaseMap}
            onSelectBaseMap={setSelectedBaseMap}
            baseMaps={baseMaps}
            overlayLayers={overlayLayers}
            activeLayers={activeLayers}
            onToggle={toggleLayer}
            onFlyTo={flyToLayer}
            layerOrder={layerOrder}
            onReorderLayers={reorderLayers}
          />
        )}
        {id === "vessel" && (
          <VesselConfigPanel
            config={vesselConfig}
            onApply={handleApplyVesselStyle}
            onFetchColumns={fetchColumns}
            onSearchColumnValues={searchValues}
          />
        )}
        {id === "charts" && (
          <ChartHouse
            charts={chartConfigs}
            columns={allTableColumns}
            cqlFilter={cqlFilter}
            onCreateChart={handleCreateChart}
            onUpdateChart={handleUpdateChart}
            onDeleteChart={handleDeleteChart}
          />
        )}
      </MosaicWindow>
    );
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <Box sx={{ width: "100%", flex: 1, minHeight: 0, display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
        <Typography
          component="div"
          aria-live="polite"
          aria-atomic="true"
          sx={{
            position: "absolute",
            width: "1px",
            height: "1px",
            padding: 0,
            margin: 0,
            overflow: "hidden",
            clip: "rect(0, 0, 0, 0)",
            whiteSpace: "nowrap",
            border: 0,
            top: 0,
            left: 0,
          }}
        >
          {selectionAnnouncement}
        </Typography>
        <MapNavbar
          visibleTiles={visibleTiles}
          effectiveVisibleTiles={effectiveVisibleTiles}
          onVisibleTilesChange={handleVisibleTilesChange}
          autoHiddenSecondary={autoHiddenSecondary}
          filters={filters}
          appliedFilters={appliedFilters}
          allTableColumns={allTableColumns}
          columnOptions={columnOptions}
          savedFilters={savedFilters}
          onAddFilter={addFilter}
          onUpdateFilter={updateFilter}
          onRemoveFilter={removeFilter}
          onResetFilters={resetFilters}
          onApplyFilters={handleApplyFilters}
          onSaveFilter={saveCurrentFilter}
          onLoadSavedFilter={loadSavedFilter}
          onDeleteSavedFilter={deleteSavedFilter}
          onLoadColumnOptions={loadColumnOptions}
        />
        <Box sx={{ flex: 1, minHeight: 0, position: "relative" }} className="mosaic-blueprint-theme">
          <Mosaic<ViewTile>
            renderTile={renderTile}
            value={displayLayout}
            onChange={(node) => {
              if (!node) return;
              setDisplayLayout(node);
              if (!below1440) {
                setMosaicLayout(node);
              }
            }}
          />
        </Box>
      </Box>
    </DndProvider>
  );
}

export default MapPage;
