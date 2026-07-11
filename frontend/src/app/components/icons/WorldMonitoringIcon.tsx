import type { SvgIconProps } from "@mui/material/SvgIcon";
import SvgIcon from "@mui/material/SvgIcon";

export default function WorldMonitoringIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      {/* Globe outer ring */}
      <circle cx="12" cy="11" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.6" />

      {/* Meridian lines (vertical curves) */}
      <path
        d="M12 2.5 C 8.5 5.5, 8.5 16.5, 12 19.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        opacity="0.7"
      />
      <path
        d="M12 2.5 C 15.5 5.5, 15.5 16.5, 12 19.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        opacity="0.7"
      />

      {/* Equator + latitude lines */}
      <line x1="3.5" y1="11" x2="20.5" y2="11" stroke="currentColor" strokeWidth="1.3" opacity="0.7" />
      <path d="M5 7.5 C 8 8.8, 16 8.8, 19 7.5" fill="none" stroke="currentColor" strokeWidth="1.1" opacity="0.5" />
      <path d="M5 14.5 C 8 13.2, 16 13.2, 19 14.5" fill="none" stroke="currentColor" strokeWidth="1.1" opacity="0.5" />

      {/* Radar pulse — concentric arcs emanating from top-right */}
      <path d="M17.5 5.5 A 2 2 0 0 1 19.5 7.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M18.5 4.5 A 3.5 3.5 0 0 1 21.5 7.5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />

      {/* Signal dot */}
      <circle cx="17.5" cy="5.5" r="1.3" fill="currentColor" />

      {/* Monitoring base bar */}
      <line x1="8.5" y1="21" x2="15.5" y2="21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="12" y1="19.5" x2="12" y2="21" stroke="currentColor" strokeWidth="1.3" />
    </SvgIcon>
  );
}
