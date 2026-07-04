import { defenseColors as c } from "./colors";

export interface TableUiTheme {
  backgroundColor: string;
  tableBackgroundColor: string;
  headerBackgroundColor: string;
  rowBackgroundColor: string;
  hoverBackgroundColor: string;
  borderColor: string;
  borderSoft: string;
  textColor: string;
  darkTextColor: string;
  textSecondary: string;
  textMuted: string;
  primaryColor: string;
  primaryHoverColor: string;
  primarySoft: string;
  primaryButtonTextColor: string;
  inputBackgroundColor: string;
  surfaceColor: string;
  surfaceAltColor: string;
  popoverBackgroundColor: string;
  dialogBackgroundColor: string;
  overlayColor: string;
  shadowColor: string;
  successColor: string;
  warningColor: string;
  dangerColor: string;
}

const tableUiTheme: TableUiTheme = {
  backgroundColor: c.background.page,
  tableBackgroundColor: c.background.page,
  headerBackgroundColor: c.background.surface,
  rowBackgroundColor: c.background.page,
  hoverBackgroundColor: c.background.hover,
  borderColor: c.border.default,
  borderSoft: c.border.soft,
  textColor: c.text.primary,
  darkTextColor: c.text.contrast,
  textSecondary: c.text.secondary,
  textMuted: c.text.muted,
  primaryColor: c.primary.main,
  primaryHoverColor: c.primary.hover,
  primarySoft: c.primary.soft,
  primaryButtonTextColor: c.text.contrast,
  inputBackgroundColor: c.background.input,
  surfaceColor: c.background.surface,
  surfaceAltColor: c.background.surfaceAlt,
  popoverBackgroundColor: c.background.surfaceAlt,
  dialogBackgroundColor: c.background.surfaceAlt,
  overlayColor: c.overlay,
  shadowColor: c.shadow,
  successColor: c.status.success,
  warningColor: c.status.warning,
  dangerColor: c.status.error,
};

export default tableUiTheme;
