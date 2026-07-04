export const defenseColors = {
  background: {
    page: "#0f1419",
    navbar: "#242b3a",
    header: "#1a2536",
    tileHeader: "#2d3648",
    surface: "#1c2333",
    surfaceAlt: "#242b3a",
    elevated: "#2d3648",
    input: "#1f2937",
    hover: "#2a3342",
    active: "#1f2937",
  },
  text: {
    primary: "#e6edf3",
    secondary: "#8b949e",
    muted: "#9ca3af",
    disabled: "#6e7681",
    contrast: "#0a0e14",
  },
  primary: {
    main: "#4cc9f0",
    hover: "#7dd3fc",
    dark: "#0ea5e9",
    soft: "rgba(76, 201, 240, 0.12)",
    softHover: "rgba(76, 201, 240, 0.18)",
  },
  secondary: {
    main: "#3fb950",
    hover: "#56d364",
    soft: "rgba(63, 185, 80, 0.12)",
  },
  status: {
    success: "#3fb950",
    warning: "#d29922",
    error: "#f85149",
    errorHover: "#ff6b6b",
    info: "#58a6ff",
  },
  border: {
    default: "rgba(255,255,255,0.08)",
    strong: "rgba(255,255,255,0.12)",
    soft: "rgba(255,255,255,0.04)",
  },
  action: {
    hover: "rgba(255,255,255,0.06)",
    hoverStrong: "rgba(255,255,255,0.10)",
    selected: "rgba(76, 201, 240, 0.12)",
  },
  scrollbar: {
    thumb: "rgba(255,255,255,0.15)",
    thumbHover: "rgba(255,255,255,0.25)",
    track: "transparent",
  },
  shadow: "0 14px 36px rgba(0, 0, 0, 0.4)",
  overlay: "rgba(15, 20, 25, 0.45)",
} as const;

export type DefenseColors = typeof defenseColors;
