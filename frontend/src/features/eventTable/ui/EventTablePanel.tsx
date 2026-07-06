import { useCallback, useState } from 'react';
import { Box, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { AtomicEventList }      from './AtomicEventList';
import { CompoundConfigList }   from './CompoundConfigList';
import { CompoundInstanceList } from './CompoundInstanceList';
import type { CompoundConfig, CompoundInstance, Event } from '../model/types';

type EventMode = 'atomic' | 'compound';
type CompoundView = 'configs' | 'instances';

// The panel exposes either an atomic Event or a CompoundInstance upward.
// Both are passed to PlaybackPanel — PlaybackPanel distinguishes via event.compound flag.
interface Props {
  selectedEvent:  Event | CompoundInstance | null;
  onSelectEvent:  (event: Event | CompoundInstance | null) => void;
}

export function EventTablePanel({ selectedEvent, onSelectEvent }: Props) {
  const [mode, setMode]               = useState<EventMode>('atomic');
  const [compoundView, setCompoundView] = useState<CompoundView>('configs');
  const [selectedConfig, setSelectedConfig] = useState<CompoundConfig | null>(null);

  const handleModeChange = useCallback((_: unknown, next: EventMode | null) => {
    if (!next || next === mode) return;
    setMode(next);
    setCompoundView('configs');
    setSelectedConfig(null);
    onSelectEvent(null);
  }, [mode, onSelectEvent]);

  const handleSelectConfig = useCallback((config: CompoundConfig) => {
    setSelectedConfig(config);
    setCompoundView('instances');
    onSelectEvent(null);
  }, [onSelectEvent]);

  const handleBackToConfigs = useCallback(() => {
    setCompoundView('configs');
    setSelectedConfig(null);
    onSelectEvent(null);
  }, [onSelectEvent]);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Mode toggle — always visible */}
      <Box sx={{ px: 3, pt: 1.5, pb: 0 }}>
        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={handleModeChange}
          size="small"
        >
          <ToggleButton value="atomic"   sx={{ textTransform: 'none', px: 2 }}>Atomic Events</ToggleButton>
          <ToggleButton value="compound" sx={{ textTransform: 'none', px: 2 }}>Compound Events</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Panel body */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden', mt: 1 }}>
        {mode === 'atomic' && (
          <AtomicEventList
            selectedEvent={selectedEvent as Event | null}
            onSelectEvent={onSelectEvent}
          />
        )}

        {mode === 'compound' && compoundView === 'configs' && (
          <CompoundConfigList
            onSelectConfig={handleSelectConfig}
          />
        )}

        {mode === 'compound' && compoundView === 'instances' && selectedConfig && (
          <CompoundInstanceList
            config={selectedConfig}
            selectedInstance={selectedEvent as CompoundInstance | null}
            onSelectInstance={onSelectEvent}
            onBack={handleBackToConfigs}
          />
        )}
      </Box>
    </Box>
  );
}
