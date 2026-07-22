import type { MosaicNode } from 'react-mosaic-component'
import type { FocusEvent } from './types'

export type FocusMosaicTile = 'map' | 'events' | 'eventPlayback'
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
  playbackEvent: FocusEvent | null,
): MosaicNode<FocusMosaicTile> {
  const showMap = visibleTiles.includes('map')
  const showEvents = visibleTiles.includes('events')

  if (playbackEvent) {
    if (showMap && showEvents) {
      return {
        direction: 'row',
        first: 'map',
        second: {
          direction: 'column',
          first: 'events',
          second: 'eventPlayback',
          splitPercentage: 55,
        },
        splitPercentage: 60,
      } as unknown as MosaicNode<FocusMosaicTile>
    }

    if (showMap) {
      return {
        direction: 'row',
        first: 'map',
        second: 'eventPlayback',
        splitPercentage: 60,
      } as unknown as MosaicNode<FocusMosaicTile>
    }

    if (showEvents) {
      return {
        direction: 'column',
        first: 'events',
        second: 'eventPlayback',
        splitPercentage: 55,
      } as unknown as MosaicNode<FocusMosaicTile>
    }
  }

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
    case 'eventPlayback':
      return 'Event Playback'
  }
}
