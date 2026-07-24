import type { MosaicNode } from 'react-mosaic-component'

export type FocusMosaicTile = 'map' | 'events'
export type FocusToggleTile = 'map' | 'events'

export const DEFAULT_FOCUS_TILES: FocusToggleTile[] = ['map', 'events']

export const DEFAULT_FOCUS_MOSAIC_LAYOUT: MosaicNode<FocusMosaicTile> = {
  direction: 'row',
  first: 'map',
  second: 'events',
  splitPercentage: 60,
} as unknown as MosaicNode<FocusMosaicTile>

export function buildFocusMosaicLayout(
  visibleTiles: FocusToggleTile[],
): MosaicNode<FocusMosaicTile> {
  const showMap = visibleTiles.includes('map')
  const showEvents = visibleTiles.includes('events')

  if (showMap && showEvents) {
    return DEFAULT_FOCUS_MOSAIC_LAYOUT
  }
  if (showMap) return 'map'
  if (showEvents) return 'events'
  return 'map'
}

export function getFocusTileTitle(id: FocusMosaicTile): string {
  switch (id) {
    case 'map':
      return 'Map'
    case 'events':
      return 'Events'
  }
}
