import { Chip } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

interface Props {
  severity: string;
  size?: 'small' | 'medium';
}

function severityColor(severity: string, errorMain: string, warningMain: string, infoMain: string) {
  switch (severity?.toLowerCase()) {
    case 'critical':
    case 'high':
      return { bg: alpha(errorMain, 0.15), border: alpha(errorMain, 0.35) };
    case 'medium':
    case 'warning':
      return { bg: alpha(warningMain, 0.15), border: alpha(warningMain, 0.35) };
    case 'low':
    case 'info':
    default:
      return { bg: alpha(infoMain, 0.15), border: alpha(infoMain, 0.35) };
  }
}

export function SeverityChip({ severity, size = 'small' }: Props) {
  const theme = useTheme();
  const { bg, border } = severityColor(
    severity,
    theme.palette.error.main,
    theme.palette.warning.main,
    theme.palette.info.main,
  );

  return (
    <Chip
      size={size}
      label={severity}
      sx={{
        textTransform: 'capitalize',
        fontWeight: 600,
        borderRadius: 1,
        bgcolor: bg,
        border: `1px solid ${border}`,
      }}
    />
  );
}
