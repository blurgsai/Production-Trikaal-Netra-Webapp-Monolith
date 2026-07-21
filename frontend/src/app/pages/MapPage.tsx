import { Box } from "@mui/material";
import { BaseMap, MapNavbar, VesselTableTool, LayerPanel, VesselConfigPanel, ChartHouse, useMapConfig, useVesselTrajectory, useVesselTable, useVesselColumns, MapTileSettings, useMapUrlParams, useVesselByMmsi } from "@/features/map";
import type { VesselInfo, VesselConfig, ViewTile, Polygon, PopupFieldConfig, ChartConfig } from "@/features/map";
import { useLocalStorage } from "@/shared";
import { useState, useEffect, useCallback } from "react";
import { Mosaic, MosaicWindow, type MosaicNode } from "react-mosaic-component";
import "react-mosaic-component/react-mosaic-component.css";
import "./MapPage.css";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

const DEFAULT_TILES: ViewTile[] = ["map", "table"];
const DEFAULT_LAYOUT: MosaicNode<ViewTile> = {
  direction: "row",
  first: "map",
  second: "table",
  splitPercentage: 60,
} as unknown as MosaicNode<ViewTile>;

function MapPage() {
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

  useEffect(() => {
    if (urlParams.view.length > 0) {
      setVisibleTiles(urlParams.view as ViewTile[]);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
  
  console.log("🗺️ Map CQL Debug:", {
    appliedFilters,
    polygonFilters,
    cqlFilter,
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
    }
  };

  const handlePopupFieldsChange = (fields: PopupFieldConfig) => {
    setVesselConfig((prev) => ({ ...prev, popupFields: fields }));
  };

  useEffect(() => {
    if (!vesselFromUrl) return;
    setSelectedVessel(vesselFromUrl);
    setSelectedVesselPosition({ lat: vesselFromUrl.locationCurrentLat, lng: vesselFromUrl.locationCurrentLon });
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
    if (visibleTiles.length === 0) return;

    if (visibleTiles.length === 1) {
      setMosaicLayout(visibleTiles[0]);
    } else if (visibleTiles.length === 2) {
      setMosaicLayout({
        direction: "row",
        first: visibleTiles[0],
        second: visibleTiles[1],
        splitPercentage: 50,
      } as unknown as MosaicNode<ViewTile>);
    } else if (visibleTiles.length === 3) {
      setMosaicLayout({
        direction: "row",
        first: visibleTiles[0],
        second: {
          direction: "column",
          first: visibleTiles[1],
          second: visibleTiles[2],
          splitPercentage: 50,
        },
        splitPercentage: 60,
      } as unknown as MosaicNode<ViewTile>);
    } else if (visibleTiles.length === 4) {
      setMosaicLayout({
        direction: "row",
        first: {
          direction: "column",
          first: visibleTiles[0],
          second: visibleTiles[1],
          splitPercentage: 50,
        },
        second: {
          direction: "column",
          first: visibleTiles[2],
          second: visibleTiles[3],
          splitPercentage: 50,
        },
        splitPercentage: 50,
      } as unknown as MosaicNode<ViewTile>);
    } else if (visibleTiles.length === 5) {
      setMosaicLayout({
        direction: "row",
        first: visibleTiles[0],
        second: {
          direction: "column",
          first: {
            direction: "row",
            first: visibleTiles[1],
            second: visibleTiles[2],
            splitPercentage: 50,
          },
          second: {
            direction: "row",
            first: visibleTiles[3],
            second: visibleTiles[4],
            splitPercentage: 50,
          },
          splitPercentage: 50,
        },
        splitPercentage: 50,
      } as unknown as MosaicNode<ViewTile>);
    }
  }, [visibleTiles, setMosaicLayout]);

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
      <Box sx={{ width: "100%", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <MapNavbar
          visibleTiles={visibleTiles}
          onVisibleTilesChange={setVisibleTiles}
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
            value={mosaicLayout}
            onChange={(node) => node && setMosaicLayout(node)}
          />
        </Box>
      </Box>
    </DndProvider>
  );
}

export default MapPage;
