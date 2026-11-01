import { createTheme } from "@mui/material/styles";

/**
 * The single source of truth for color and type (ADR-0013). Components read the
 * theme; no color is written straight into a component. The architecture gate
 * allows color literals only in this file. Contrast targets WCAG 2.2 AA.
 */
const theme = createTheme({
  palette: {
    mode: "light",
    // Deep blue on white reads at about 9:1 contrast.
    primary: { main: "#1b3a5b", contrastText: "#ffffff" },
    secondary: { main: "#5a3e2b", contrastText: "#ffffff" },
    background: { default: "#ffffff", paper: "#ffffff" },
    text: { primary: "#1a1a1a", secondary: "#4a4a4a" },
  },
  typography: {
    // Body text reads at 20px (ADR-0013). The root stays 16px so rem math is normal.
    fontSize: 16,
    body1: { fontSize: "1.25rem", lineHeight: 1.6 },
    body2: { fontSize: "1.125rem", lineHeight: 1.6 },
    h1: { fontSize: "2.25rem", fontWeight: 700, lineHeight: 1.2 },
    h2: { fontSize: "1.75rem", fontWeight: 700, lineHeight: 1.3 },
    h3: { fontSize: "1.375rem", fontWeight: 600, lineHeight: 1.35 },
    button: { textTransform: "none", fontSize: "1.0625rem" },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      // 44px minimum target (ADR-0013, WCAG 2.2 target size).
      styleOverrides: { root: { minHeight: 44, paddingInline: 20 } },
    },
    MuiLink: { defaultProps: { underline: "always" } },
  },
});

export default theme;
