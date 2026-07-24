import { useState } from 'react';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import { EventTablePanel } from '@/features/eventTable';
import type { Event, CompoundInstance } from '@/features/eventTable';
import { PlaybackPanel } from '@/features/playback';

function EmptyPlayback() {
  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'text.secondary',
      }}
    >
      <Box sx={{ fontSize: '3rem', opacity: 0.3, mb: 1 }}>⬅</Box>
      <Box>Select an event to view playback</Box>
    </Box>
  );
}

export function EventsPage() {
  const theme = useTheme();
  const isNarrow = useMediaQuery(theme.breakpoints.down('md'));
  const [selectedEvent, setSelectedEvent] = useState<Event | CompoundInstance | null>(null);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: isNarrow ? 'column' : 'row',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          width: isNarrow ? '100%' : '50%',
          height: isNarrow ? '50%' : '100%',
          borderRight: isNarrow ? 0 : 1,
          borderBottom: isNarrow ? 1 : 0,
          borderColor: 'divider',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <EventTablePanel
          selectedEvent={selectedEvent}
          onSelectEvent={setSelectedEvent}
        />
      </Box>

      <Box
        sx={{
          width: isNarrow ? '100%' : '50%',
          height: isNarrow ? '50%' : '100%',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {selectedEvent ? (
          <PlaybackPanel
            eventId={(selectedEvent as Event).id ?? (selectedEvent as CompoundInstance).id}
            eventType={(selectedEvent as Event).type ?? 'compound'}
            isCompound={(selectedEvent as Event).compound === true}
          />
        ) : (
          <EmptyPlayback />
        )}
      </Box>
    </Box>
  );
}

export default EventsPage;
