export const defenseColors = {
  background: {
    page: "#0f1419",
    navbar: "#202933",
    header: "#141c26",
    tileHeader: "#2a3642",
    surface: "#19232d",
    surfaceAlt: "#222d38",
    elevated: "#2a3642",
    input: "#141d26",
    hover: "#26333f",
    active: "#1f2b36",
  },
  text: {
    primary: "#e6edf3",
    secondary: "#8b949e",
    muted: "#9ca3af",
    disabled: "#6e7681",
    contrast: "#0a0e14",
  },
  primary: {
    main: "#67e8f9",
    hover: "#a5f3fc",
    dark: "#06b6d4",
    soft: "rgba(103, 232, 249, 0.14)",
    softHover: "rgba(103, 232, 249, 0.22)",
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
    hover: "rgba(255,255,255,0.07)",
    hoverStrong: "rgba(255,255,255,0.12)",
    selected: "rgba(103, 232, 249, 0.14)",
    focusVisible: "#67e8f9",
    focusVisibleOffset: 2,
    disabledOpacity: 0.38,
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
