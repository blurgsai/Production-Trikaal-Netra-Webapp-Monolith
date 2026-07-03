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
  backgroundColor: "#3E4E59",
  tableBackgroundColor: "#2F3F49",
  headerBackgroundColor: "#22313A",
  rowBackgroundColor: "#2A3A44",
  hoverBackgroundColor: "#334650",
  borderColor: "rgba(255,255,255,0.10)",
  borderSoft: "rgba(255,255,255,0.06)",
  textColor: "#FFFFFF",
  darkTextColor: "#000000",
  textSecondary: "rgba(255,255,255,0.78)",
  textMuted: "rgba(255,255,255,0.58)",
  primaryColor: "#58B6E5",
  primaryHoverColor: "#78C7EE",
  primarySoft: "rgba(88, 182, 229, 0.14)",
  primaryButtonTextColor: "#102028",
  inputBackgroundColor: "#22313A",
  surfaceColor: "#34444F",
  surfaceAltColor: "#4A5964",
  popoverBackgroundColor: "#34444F",
  dialogBackgroundColor: "#34444F",
  overlayColor: "rgba(18, 24, 29, 0.45)",
  shadowColor: "0 14px 36px rgba(10, 16, 22, 0.28)",
  successColor: "#5ECFA8",
  warningColor: "#F4B860",
  dangerColor: "#F07F7F",
};

export default tableUiTheme;
