import { useState } from "react";
import { Box, Typography, CircularProgress } from "@mui/material";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { useVesselCount } from "../hooks/useVesselCount";

interface VesselCountBadgeProps {
  cqlFilter?: string;
}

function VesselCountBadge({ cqlFilter }: VesselCountBadgeProps) {
  const { total, categories, loading, error } = useVesselCount(cqlFilter);
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      {expanded && (
        <Box
          sx={{
            position: "absolute",
            bottom: 185,
            right: 10,
            width: 260,
            maxHeight: 220,
            overflowY: "auto",
            bgcolor: "#000000dd",
            p: 1.5,
            borderRadius: 1,
            boxShadow: 3,
            border: "1px solid rgba(255,255,255,0.08)",
            zIndex: 500,
            pointerEvents: "auto",
          }}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
          onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
          onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}
          onPointerUp={(e: React.PointerEvent) => e.stopPropagation()}
        >
          <Typography variant="body2" sx={{ color: "white", fontWeight: 600, mb: 1 }}>
            Vessel categories
          </Typography>

          {loading ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CircularProgress size={16} sx={{ color: "white" }} />
              <Typography variant="body2" sx={{ color: "white" }}>
                Loading...
              </Typography>
            </Box>
          ) : error ? (
            <Typography variant="body2" sx={{ color: "#ffb3b3" }}>
              {error}
            </Typography>
          ) : categories.length === 0 ? (
            <Typography variant="body2" sx={{ color: "white" }}>
              No categories found
            </Typography>
          ) : (
            categories.map((item) => (
              <Box
                key={item.category}
                sx={{ display: "flex", justifyContent: "space-between", gap: 2, py: 0.4 }}
              >
                <Typography variant="body2" sx={{ color: "white" }}>
                  {item.category || "Unknown"}
                </Typography>
                <Typography variant="body2" sx={{ color: "white", fontWeight: 500 }}>
                  {item.count}
                </Typography>
              </Box>
            ))
          )}
        </Box>
      )}

      <Box
        sx={{
          position: "absolute",
          bottom: 127,
          right: 10,
          width: 260,
          bgcolor: "#000000bb",
          p: 1.5,
          borderRadius: 1,
          boxShadow: 3,
          border: "1px solid rgba(255,255,255,0.08)",
          pointerEvents: "auto",
          zIndex: 500,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
        }}
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          setExpanded((prev) => !prev);
        }}
        onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
        onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}
        onPointerUp={(e: React.PointerEvent) => e.stopPropagation()}
      >
        {loading ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CircularProgress size={16} sx={{ color: "white" }} />
            <Typography variant="body2" noWrap sx={{ color: "white" }}>
              Loading...
            </Typography>
          </Box>
        ) : (
          <>
            <Typography variant="body2" noWrap sx={{ color: "white", fontWeight: 500 }}>
              Total vessels: {total}
            </Typography>
            <KeyboardArrowUpIcon
              sx={{
                color: "white",
                fontSize: 18,
                transform: expanded ? "rotate(0deg)" : "rotate(180deg)",
                transition: "transform 0.2s ease",
              }}
            />
          </>
        )}
      </Box>
    </>
  );
}

export default VesselCountBadge;
