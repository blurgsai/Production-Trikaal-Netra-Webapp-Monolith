import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Chip,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DirectionsBoatIcon from "@mui/icons-material/DirectionsBoat";
import BusinessIcon from "@mui/icons-material/Business";
import EngineeringIcon from "@mui/icons-material/Engineering";
import StraightenIcon from "@mui/icons-material/Straighten";
import SpeedIcon from "@mui/icons-material/Speed";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import FlagIcon from "@mui/icons-material/Flag";
import HistoryIcon from "@mui/icons-material/History";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import AnchorIcon from "@mui/icons-material/Anchor";
import PrecisionManufacturingIcon from "@mui/icons-material/PrecisionManufacturing";
import type { LloydsVesselData } from "../model/types";

interface LloydsDataDialogProps {
  open: boolean;
  onClose: () => void;
  imo: string;
  data: LloydsVesselData | null;
  loading: boolean;
  error: string;
}

function formatKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function val(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

const FIELD_WIDTH = { xs: "100%", sm: "calc(50% - 8px)", md: "calc(33.33% - 11px)" };

function DataField({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: "0.6875rem", lineHeight: 1.4 }}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={500} sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.5 }}>
        {value}
      </Typography>
    </Box>
  );
}

function DataGrid({ entries }: { entries: [string, unknown][] }) {
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
      {entries.map(([k, v]) => (
        <Box key={k} sx={{ width: FIELD_WIDTH }}>
          <DataField label={formatKey(k)} value={val(v)} />
        </Box>
      ))}
    </Box>
  );
}

function SectionCard({
  icon,
  title,
  children,
  defaultExpanded = false,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}) {
  return (
    <Accordion
      disableGutters
      defaultExpanded={defaultExpanded}
      sx={{
        "&:before": { display: "none" },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{
          minHeight: 40,
          "&.Mui-expanded": { minHeight: 40 },
          px: 1.5,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box sx={{ color: "primary.main", display: "flex", alignItems: "center" }}>{icon}</Box>
          <Typography variant="subtitle2" fontWeight={600}>{title}</Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 1.5, py: 1.5 }}>
        {children}
      </AccordionDetails>
    </Accordion>
  );
}

export default function LloydsDataDialog({ open, onClose, imo, data, loading, error }: LloydsDataDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { maxHeight: "85vh" } }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: 1,
          borderColor: "divider",
          pb: 1.5,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1,
              bgcolor: "primary.main",
              color: "primary.contrastText",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <DirectionsBoatIcon sx={{ fontSize: 18 }} />
          </Box>
          <Box>
            <Typography variant="subtitle1" fontWeight={700}>
              Lloyds Register
            </Typography>
            <Typography variant="caption" color="text.secondary">
              IMO: {imo}
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="info" sx={{ mt: 1 }}>
            {error}
          </Alert>
        ) : data ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mt: 1 }}>
            {/* Header Summary Card */}
            <Box
              sx={{
                p: 2,
                bgcolor: "background.elevated",
                border: 1,
                borderColor: "border.default",
                borderRadius: 1,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1.5 }}>
                <Box>
                  <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                    {data.vessel.vessel_name || "Unknown"}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 0.75, mt: 1, flexWrap: "wrap" }}>
                    {data.vessel.flag && (
                      <Chip
                        size="small"
                        label={data.vessel.flag}
                        variant="outlined"
                        sx={{ height: 22, fontSize: "0.6875rem", borderColor: "border.strong" }}
                      />
                    )}
                    {data.vessel.vessel_type && (
                      <Chip
                        size="small"
                        label={data.vessel.vessel_type}
                        variant="outlined"
                        sx={{ height: 22, fontSize: "0.6875rem", borderColor: "border.strong" }}
                      />
                    )}
                    {data.vessel.status && (
                      <Chip
                        size="small"
                        label={data.vessel.status}
                        sx={{
                          height: 22,
                          fontSize: "0.6875rem",
                          bgcolor: "primary.soft",
                          color: "primary.main",
                          border: 1,
                          borderColor: "primary.main",
                        }}
                      />
                    )}
                  </Box>
                </Box>
                {data.vigilance_score != null && (
                  <Box sx={{ textAlign: "center", minWidth: 80 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.25 }}>
                      Vigilance
                    </Typography>
                    <Typography variant="h6" fontWeight={700} color="primary.main">
                      {data.vigilance_score}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>

            {/* Vessel Particulars */}
            <SectionCard
              icon={<DirectionsBoatIcon sx={{ fontSize: 18 }} />}
              title="Vessel Particulars"
              defaultExpanded
            >
              <DataGrid
                entries={Object.entries(data.vessel).filter(([k]) => k !== "_id")}
              />
            </SectionCard>

            {/* Ownership */}
            {data.ownership?.current && Object.keys(data.ownership.current).length > 0 && (
              <SectionCard icon={<BusinessIcon sx={{ fontSize: 18 }} />} title="Ownership">
                {Object.entries(data.ownership.current).map(([role, entries]) => (
                  <Box key={role} sx={{ mb: 2, "&:last-child": { mb: 0 } }}>
                    <Typography variant="caption" fontWeight={600} color="primary.main" sx={{ display: "block", mb: 1, fontSize: "0.6875rem" }}>
                      {formatKey(role)}
                    </Typography>
                    {(entries as Array<{ company_info?: { company_name?: string }; start_date?: string }>).map((entry, idx) => (
                      <Box key={idx} sx={{ pl: 1.5, mb: 1, "&:last-child": { mb: 0 } }}>
                        <DataField label="Company" value={val(entry?.company_info?.company_name)} />
                        {entry?.start_date && (
                          <Box sx={{ mt: 0.5 }}>
                            <DataField label="Since" value={val(entry.start_date)} />
                          </Box>
                        )}
                      </Box>
                    ))}
                  </Box>
                ))}
              </SectionCard>
            )}

            {/* Dimensions */}
            {data.propulsion_and_dimensions && Object.keys(data.propulsion_and_dimensions).length > 0 && (
              <SectionCard icon={<StraightenIcon sx={{ fontSize: 18 }} />} title="Dimensions & Propulsion">
                <DataGrid
                  entries={Object.entries(data.propulsion_and_dimensions).filter(([k]) => k !== "_id")}
                />
              </SectionCard>
            )}

            {/* Design */}
            {data.design && Object.keys(data.design).length > 0 && (
              <SectionCard icon={<AnchorIcon sx={{ fontSize: 18 }} />} title="Design & Construction">
                <DataGrid
                  entries={Object.entries(data.design).filter(([k]) => k !== "_id")}
                />
              </SectionCard>
            )}

            {/* Engines */}
            {data.engines && Object.keys(data.engines).length > 0 && (
              <SectionCard icon={<EngineeringIcon sx={{ fontSize: 18 }} />} title="Engine Details">
                <DataGrid
                  entries={Object.entries(data.engines).filter(([k]) => k !== "_id")}
                />
              </SectionCard>
            )}

            {/* Capacities */}
            {data.capacities && Object.keys(data.capacities).length > 0 && (
              <SectionCard icon={<PrecisionManufacturingIcon sx={{ fontSize: 18 }} />} title="Capacities">
                <DataGrid
                  entries={Object.entries(data.capacities).filter(([k, v]) => k !== "_id" && v !== null && v !== undefined)}
                />
              </SectionCard>
            )}

            {/* Casualties */}
            {data.casualties && data.casualties.length > 0 && (
              <SectionCard icon={<WarningAmberIcon sx={{ fontSize: 18 }} />} title={`Casualties (${data.casualties.length})`}>
                {data.casualties.map((cas, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      p: 1.5,
                      mb: 1,
                      "&:last-child": { mb: 0 },
                      bgcolor: "rgba(248, 81, 73, 0.08)",
                      border: 1,
                      borderColor: "rgba(248, 81, 73, 0.2)",
                      borderRadius: 1,
                    }}
                  >
                    <DataGrid
                      entries={Object.entries(cas).filter(([k]) => k !== "_id")}
                    />
                  </Box>
                ))}
              </SectionCard>
            )}

            {/* Flag History */}
            {data.flag_history && data.flag_history.length > 0 && (
              <SectionCard icon={<FlagIcon sx={{ fontSize: 18 }} />} title={`Flag History (${data.flag_history.length})`}>
                {data.flag_history.map((fh, idx) => (
                  <Box key={idx} sx={{ pl: 1.5, mb: 1.5, "&:last-child": { mb: 0 } }}>
                    <DataGrid
                      entries={Object.entries(fh).filter(([k]) => k !== "_id")}
                    />
                  </Box>
                ))}
              </SectionCard>
            )}

            {/* Name History */}
            {data.name_history && data.name_history.length > 0 && (
              <SectionCard icon={<HistoryIcon sx={{ fontSize: 18 }} />} title={`Name History (${data.name_history.length})`}>
                {data.name_history.map((nh, idx) => (
                  <Box key={idx} sx={{ pl: 1.5, mb: 1.5, "&:last-child": { mb: 0 } }}>
                    <DataGrid
                      entries={Object.entries(nh).filter(([k]) => k !== "_id")}
                    />
                  </Box>
                ))}
              </SectionCard>
            )}

            {/* Inmarsat */}
            {data.inmarsat && Object.keys(data.inmarsat).length > 0 && (
              <SectionCard icon={<SpeedIcon sx={{ fontSize: 18 }} />} title="Inmarsat">
                <DataGrid
                  entries={Object.entries(data.inmarsat).filter(([k]) => k !== "_id")}
                />
              </SectionCard>
            )}

            {/* Snapshot Info */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                pt: 1.5,
                borderTop: 1,
                borderColor: "divider",
              }}
            >
              <LocalOfferIcon sx={{ fontSize: 14, color: "text.secondary" }} />
              <Typography variant="caption" color="text.secondary">
                Snapshot: {data.snapshot_id} · Recorded: {data.timestamp}
              </Typography>
            </Box>
          </Box>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
