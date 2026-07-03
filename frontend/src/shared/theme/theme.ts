import { createTheme } from "@mui/material/styles";
import {
  red,
  green,
  blue,
  yellow,
  grey,
  blueGrey,
  lightBlue,
} from "@mui/material/colors";

declare module "@mui/material/styles" {
  interface Mixins {
    MuiDataGrid?: {
      containerBackground?: string;
    };
  }
  interface Palette {
    light: Palette["primary"];
    danger: Palette["primary"];
  }
  interface PaletteOptions {
    light?: PaletteOptions["primary"];
    danger?: PaletteOptions["primary"];
  }
}

export const darkTheme = createTheme({
  mixins: {
    MuiDataGrid: {
      containerBackground: blueGrey[900],
    },
  },
  palette: {
    mode: "dark",
    primary: {
      main: lightBlue[200],
    },
    secondary: {
      main: lightBlue[800],
    },
    background: {
      paper: blueGrey[900],
      default: blueGrey[800],
    },
    light: {
      main: grey[50],
    },
    text: {
      primary: grey[100],
      secondary: grey[400],
    },
    success: {
      main: green[400],
    },
    danger: {
      main: red[400],
    },
    warning: {
      main: yellow[700],
    },
    info: {
      main: blue[200],
    },
    divider: grey[700],
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        "*": {
          scrollbarWidth: "thin",
          scrollbarColor: "#b0b0b0 transparent",
          "&::-webkit-scrollbar": {
            width: "8px",
          },
          "&::-webkit-scrollbar-track": {
            backgroundColor: "transparent",
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "#b0b0b0",
            borderRadius: "4px",
          },
          "&::-webkit-scrollbar-thumb:hover": {
            backgroundColor: "#999",
          },
        },
        "input:-webkit-autofill": {
          WebkitBoxShadow: "0 0 0 1000px transparent inset !important",
          WebkitTextFillColor: `${grey[100]} !important`,
          caretColor: "#fff",
          transition: "background-color 5000s ease-in-out 0s",
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: blueGrey[700],
          color: grey[50],
          fontSize: "0.9rem",
          fontWeight: 600,
          padding: "6px 10px",
          borderRadius: 6,
        },
        arrow: {
          color: blueGrey[700],
        },
      },
      defaultProps: {
        arrow: true,
        placement: "top",
        slotProps: {
          transition: { timeout: 0 },
        },
        disableInteractive: true,
      },
    },
  },
});

export type AppTheme = typeof darkTheme;
