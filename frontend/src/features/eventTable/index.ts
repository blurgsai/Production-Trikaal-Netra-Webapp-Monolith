// Domain types (public)
export type {
  Event,
  CompoundConfig,
  CompoundInstance,
  EventFilter,
  EventMetadataColumn,
  PaginationParams,
  FilterOperator,
} from './model/types';

// Hooks
export { useEvents }              from './hooks/useEvents';
export { useEventMetadata }       from './hooks/useEventMetadata';
export { useCompoundConfigs }     from './hooks/useCompoundConfigs';
export { useCompoundInstances }   from './hooks/useCompoundInstances';

// UI (barrel only — pages compose from here)
export { EventTablePanel }        from './ui/EventTablePanel';
export { AtomicEventList }        from './ui/AtomicEventList';
export { CompoundConfigList }     from './ui/CompoundConfigList';
export { CompoundInstanceList }   from './ui/CompoundInstanceList';
