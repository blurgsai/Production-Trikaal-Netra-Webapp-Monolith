import { Box, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useNavigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useState } from "react";

export interface NavItem {
  icon: ReactNode;
  label: string;
  path: string;
}

interface NavRailProps {
  items: NavItem[];
  label?: string;
  headerIcon?: ReactNode;
}

function NavRail({ items, label, headerIcon }: NavRailProps) {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [expanded, setExpanded] = useState(false);

  const activeSx = (isActive: boolean) => ({
    color: isActive ? "primary.main" : "text.secondary",
    bgcolor: isActive
      ? alpha(theme.palette.primary.main, 0.12)
      : "transparent",
    border: isActive
      ? `1px solid ${alpha(theme.palette.primary.main, 0.3)}`
      : "1px solid transparent",
    transition: "all 0.2s ease",
    "&:hover": {
      bgcolor: isActive
        ? alpha(theme.palette.primary.main, 0.16)
        : "action.hover",
      color: isActive ? "primary.main" : "text.primary",
    },
  });

  return (
    <Box
      component="nav"
      role="navigation"
      aria-label={label ? `${label} navigation` : "navigation"}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      sx={{
        width: expanded ? 200 : 64,
        py: 2,
        px: expanded ? 1.5 : 1,
        bgcolor: "background.surface",
        borderRight: 1,
        borderColor: "divider",
        display: "flex",
        flexDirection: "column",
        alignItems: expanded ? "stretch" : "center",
        gap: 1.5,
        overflow: "hidden",
        transition: "width 0.2s ease, padding 0.2s ease, align-items 0.2s ease",
      }}
    >
      {headerIcon && (
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 1.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "primary.main",
            color: "primary.contrastText",
            mb: 1,
            boxShadow: (t) => t.shadows[4],
          }}
        >
          {headerIcon}
        </Box>
      )}

      {label && (
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 0.8,
            color: "text.secondary",
            px: 1.5,
            whiteSpace: "nowrap",
            overflow: "hidden",
            maxHeight: expanded ? 24 : 0,
            mb: expanded ? 1 : 0,
            opacity: expanded ? 1 : 0,
            transition: "max-height 0.2s ease, opacity 0.15s ease 0.05s, margin 0.2s ease",
          }}
        >
          {label}
        </Typography>
      )}

      {items.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Box
            key={item.path}
            role="button"
            aria-label={item.label}
            aria-current={isActive ? "page" : undefined}
            onClick={() => navigate(item.path)}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: expanded ? 1.5 : 0,
              width: expanded ? "100%" : 48,
              minWidth: expanded ? 0 : 48,
              boxSizing: "border-box",
              justifyContent: expanded ? "flex-start" : "center",
              px: expanded ? 1.5 : 0,
              py: 1.25,
              borderRadius: 1.5,
              cursor: "pointer",
              whiteSpace: "nowrap",
              ...activeSx(isActive),
            }}
          >
            <Box sx={{ display: "flex", flexShrink: 0 }}>{item.icon}</Box>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                width: expanded ? "auto" : 0,
                overflow: "hidden",
                opacity: expanded ? 1 : 0,
                transition: "width 0.2s ease, opacity 0.15s ease 0.05s",
              }}
            >
              {item.label}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}

export default NavRail;
