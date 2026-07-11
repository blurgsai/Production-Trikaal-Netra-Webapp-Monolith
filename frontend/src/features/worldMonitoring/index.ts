import { defenseColors } from "@/shared/theme";

export const worldMonitorPalette = {
  background: defenseColors.background.page,
  border: defenseColors.border.default,
  textMuted: defenseColors.text.muted,
  accent: defenseColors.primary.main,
} as const;

export { Dashboard } from "./ui/Dashboard";
export { Threats } from "./ui/Threats";
export { Articles } from "./ui/Articles";
export { ArticleDetailDialog } from "./ui/ArticleDetailDialog";

export type {
  ThreatFilters,
  ThreatEvent,
  ThreatMapMarker,
  ThreatLevel,
  ThreatPagination,
  ThreatMetadata,
  ArticleMetadata,
  ArticleFilters,
  Article,
  ArticleLinkedEvent,
  ArticleDetail,
  ArticlePagination,
} from "./model/types";
