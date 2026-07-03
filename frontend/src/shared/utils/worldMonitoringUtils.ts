import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

export const severityConfig = {
  LOW: {
    label: "Low",
    color: "#2ec27e",
    bg: "rgba(46, 194, 126, 0.14)",
    border: "rgba(46, 194, 126, 0.42)",
  },
  MEDIUM: {
    label: "Medium",
    color: "#f6c445",
    bg: "rgba(246, 196, 69, 0.14)",
    border: "rgba(246, 196, 69, 0.42)",
  },
  HIGH: {
    label: "High",
    color: "#ff8a3d",
    bg: "rgba(255, 138, 61, 0.14)",
    border: "rgba(255, 138, 61, 0.42)",
  },
  CRITICAL: {
    label: "Critical",
    color: "#ff4d67",
    bg: "rgba(255, 77, 103, 0.16)",
    border: "rgba(255, 77, 103, 0.44)",
  },
} as const;

export const worldMonitorPalette = {
  background: "#07111f",
  panel: "#0d1a2c",
  panelAlt: "#12233b",
  panelMuted: "#091625",
  border: "rgba(143, 179, 225, 0.18)",
  borderStrong: "rgba(143, 179, 225, 0.28)",
  text: "#edf4ff",
  textSecondary: "#7f93ac",
  textMuted: "#93a8c7",
  accent: "#4ec3ff",
  accentSoft: "rgba(78, 195, 255, 0.16)",
} as const;

export type SeverityLevel = keyof typeof severityConfig;

interface Event {
  threat_level?: SeverityLevel;
  event_type?: string;
}

interface Article {
  imageUrl?: string | null;
}

export function getSeverityConfig(level?: string) {
  return severityConfig[level as SeverityLevel] ?? severityConfig.MEDIUM;
}

export function formatRelative(value?: string | null): string {
  if (!value) {
    return "Unknown time";
  }

  const parsed = dayjs(value);

  if (!parsed.isValid()) {
    return value;
  }

  return parsed.fromNow();
}

export function formatDateTime(value?: string | null): string {
  if (!value) {
    return "Not available";
  }

  const parsed = dayjs(value);

  if (!parsed.isValid()) {
    return value;
  }

  return parsed.format("DD MMM YYYY, HH:mm");
}

export function formatEventTypeLabel(value?: string | null): string {
  if (!value) {
    return "Unknown";
  }

  return String(value)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatSourceTypeLabel(value?: string | null): string {
  if (!value) {
    return "Unknown feed";
  }

  return String(value)
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export function getArticleImage(article?: Article | null): string | null {
  return article?.imageUrl ?? null;
}

export function buildSeverityDistribution(events: Event[] = []) {
  const counts: Record<SeverityLevel, number> = {
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
    CRITICAL: 0,
  };

  events.forEach((event) => {
    const level = event.threat_level;

    if (level) {
      counts[level] += 1;
    }
  });

  return Object.entries(counts).map(([name, value]) => ({
    name,
    value,
    color: getSeverityConfig(name).color,
  }));
}

export function buildEventTypeDistribution(events: Event[] = []) {
  const counts: Record<string, number> = {};

  events.forEach((event) => {
    const key = event.event_type || "Unknown";
    counts[key] = (counts[key] || 0) + 1;
  });

  return Object.entries(counts)
    .map(([name, value]) => ({
      name,
      label: formatEventTypeLabel(name),
      value,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}
