import { createTheme } from "@mui/material/styles";
import { defenseColors as c } from "./colors";

declare module "@mui/material/styles" {
  interface Mixins {
    MuiDataGrid?: {
      containerBackground?: string;
    };
  }
  interface TypeBackground {
    page: string;
    navbar: string;
    header: string;
    tileHeader: string;
    surface: string;
    surfaceAlt: string;
    elevated: string;
    input: string;
    hover: string;
    active: string;
  }
  interface TypeBackgroundOptions {
    page?: string;
    navbar?: string;
    header?: string;
    tileHeader?: string;
    surface?: string;
    surfaceAlt?: string;
    elevated?: string;
    input?: string;
    hover?: string;
    active?: string;
  }
  interface Palette {
    light: Palette["primary"];
    danger: Palette["primary"];
    navbar: string;
    surface: string;
    surfaceAlt: string;
    elevated: string;
    header: string;
    tileHeader: string;
  }
  interface PaletteOptions {
    light?: PaletteOptions["primary"];
    danger?: PaletteOptions["primary"];
    navbar?: string;
    surface?: string;
    surfaceAlt?: string;
    elevated?: string;
    header?: string;
    tileHeader?: string;
  }
}

declare module "@mui/material" {
  interface AppBarPropsColorOverrides {
    navbar: true;
  }
}

export const defenseTheme = createTheme({
  mixins: {
    MuiDataGrid: {
      containerBackground: c.background.surface,
    },
  },
  palette: {
    mode: "dark",
    primary: {
      main: c.primary.main,
      light: c.primary.hover,
      dark: c.primary.dark,
      contrastText: c.text.contrast,
    },
    secondary: {
      main: c.secondary.main,
      light: c.secondary.hover,
      contrastText: c.text.contrast,
    },
    background: {
      default: c.background.page,
      paper: c.background.surface,
      page: c.background.page,
      navbar: c.background.navbar,
      header: c.background.header,
      tileHeader: c.background.tileHeader,
      surface: c.background.surface,
      surfaceAlt: c.background.surfaceAlt,
      elevated: c.background.elevated,
      input: c.background.input,
      hover: c.background.hover,
      active: c.background.active,
    },
    navbar: c.background.navbar,
    surface: c.background.surface,
    surfaceAlt: c.background.surfaceAlt,
    elevated: c.background.elevated,
    header: c.background.header,
    tileHeader: c.background.tileHeader,
    light: {
      main: c.text.primary,
    },
    text: {
      primary: c.text.primary,
      secondary: c.text.secondary,
      disabled: c.text.disabled,
    },
    success: { main: c.status.success },
    error: { main: c.status.error },
    warning: { main: c.status.warning },
    info: { main: c.status.info },
    danger: { main: c.status.error },
    divider: c.border.default,
  },
  typography: {
    fontFamily: "'Inter', 'Roboto', 'Helvetica', 'Arial', sans-serif",
    h4: { fontWeight: 700, letterSpacing: 0.5 },
    h5: { fontWeight: 700, letterSpacing: 0.3 },
    h6: { fontWeight: 600, letterSpacing: 0.3 },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600, letterSpacing: 0.2 },
    body1: { fontSize: "0.875rem" },
    body2: { fontSize: "0.8125rem" },
    caption: { fontSize: "0.75rem", letterSpacing: 0.2 },
    button: { textTransform: "none", fontWeight: 600, letterSpacing: 0.3 },
  },
  shape: {
    borderRadius: 4,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        "*": {
          scrollbarWidth: "thin",
          scrollbarColor: `${c.scrollbar.thumb} transparent`,
          "&::-webkit-scrollbar": { width: "6px", height: "6px" },
          "&::-webkit-scrollbar-track": { backgroundColor: c.scrollbar.track },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: c.scrollbar.thumb,
            borderRadius: "3px",
          },
          "&::-webkit-scrollbar-thumb:hover": {
            backgroundColor: c.scrollbar.thumbHover,
          },
        },
        "input:-webkit-autofill": {
          WebkitBoxShadow: `0 0 0 1000px ${c.background.input} inset !important`,
          WebkitTextFillColor: `${c.text.primary} !important`,
          caretColor: c.text.primary,
          transition: "background-color 5000s ease-in-out 0s",
        },
        body: {
          "-webkit-font-smoothing": "antialiased",
          "-moz-osx-font-smoothing": "grayscale",
        },
        ".leaflet-container": {
          cursor: "pointer !important",
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${c.border.default}`,
          boxShadow: "none",
          backgroundImage: "none",
        },
        colorPrimary: {
          backgroundColor: c.background.header,
        },
        colorDefault: {
          backgroundColor: c.background.navbar,
          color: c.text.primary,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none" },
        outlined: { borderColor: c.border.default },
      },
      defaultProps: { elevation: 0 },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { textTransform: "none", fontWeight: 600 },
        outlined: { borderColor: c.border.strong },
        outlinedPrimary: { "&:hover": { backgroundColor: c.primary.soft } },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 500 },
        outlined: { borderColor: c.border.default },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: c.background.elevated,
          color: c.text.primary,
          fontSize: "0.8125rem",
          fontWeight: 500,
          padding: "6px 10px",
          borderRadius: 4,
          border: `1px solid ${c.border.default}`,
        },
        arrow: { color: c.background.elevated },
      },
      defaultProps: {
        arrow: true,
        placement: "top",
        slotProps: { transition: { timeout: 0 } },
        disableInteractive: true,
      },
    },
    MuiDivider: {
      styleOverrides: { root: { borderColor: c.border.default } },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: c.border.default },
        head: { fontWeight: 600 },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: { "&:hover": { backgroundColor: c.background.hover } },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        notchedOutline: { borderColor: c.border.default },
        root: {
          backgroundColor: c.background.input,
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: c.border.strong,
          },
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: c.background.surfaceAlt,
          border: `1px solid ${c.border.default}`,
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          "&:hover": { backgroundColor: c.background.hover },
          "&.Mui-selected": { backgroundColor: c.primary.soft },
          "&.Mui-selected:hover": { backgroundColor: c.primary.softHover },
        },
      },
    },
    MuiPopover: {
      styleOverrides: {
        paper: {
          backgroundColor: c.background.surfaceAlt,
          border: `1px solid ${c.border.default}`,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: c.background.surfaceAlt,
          border: `1px solid ${c.border.default}`,
        },
      },
    },
    MuiTabs: {
      styleOverrides: { indicator: { backgroundColor: c.primary.main } },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: c.text.muted,
          "&.Mui-checked": { color: c.primary.main },
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          borderColor: c.border.default,
          "&.Mui-selected": {
            backgroundColor: c.primary.soft,
            borderColor: c.primary.main,
            "&:hover": { backgroundColor: c.primary.softHover },
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: { "&:hover": { backgroundColor: c.action.hover } },
      },
    },
    MuiToolbar: {
      styleOverrides: { root: { minHeight: "48px !important" } },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          backgroundColor: c.background.surface,
          border: `1px solid ${c.border.default}`,
          borderRadius: "6px !important",
          "&:before": { display: "none" },
          "&.Mui-expanded": { margin: "0 0 8px 0" },
        },
      },
    },
    MuiAccordionSummary: {
      styleOverrides: {
        root: {
          minHeight: 40,
          "&.Mui-expanded": { minHeight: 40 },
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        root: {
          "& .MuiSwitch-track": { backgroundColor: c.border.strong },
        },
        switchBase: {
          "&.Mui-checked + .MuiSwitch-track": {
            backgroundColor: c.primary.main,
            opacity: 0.5,
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        select: { paddingTop: 8, paddingBottom: 8 },
      },
    },
    MuiRadio: {
      styleOverrides: {
        root: {
          color: c.text.muted,
          "&.Mui-checked": { color: c.primary.main },
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontSize: "1rem",
          fontWeight: 700,
          letterSpacing: 0.3,
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: { padding: 0 },
      },
    },
  },
});

export type AppTheme = typeof defenseTheme;
