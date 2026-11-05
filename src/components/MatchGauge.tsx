"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";

interface Props {
  /** Whole-number title-fit percent, 0..100. */
  pct: number;
  /** The caption under the number, e.g. "2 of 4 standard hats covered". */
  caption?: string;
}

// judge-arch note (PR #24 backfill, 2026-11-04, low — a review disposition, not a human arch
// -gate waiver): MUI CircularProgress(determinate) would avoid hand-rolling a ring, but the
// prototype gauge needs this stroke width and rounded cap, which the bespoke SVG renders
// directly; kept deliberately. Recorded in docs/arch-reviews/log.jsonl.
//
// The verdict gauge: the match percent as a ring, matching the prototype's step-1 gauge
// (T17 / ADR-0039). Colors come from the theme only (no literals; the arch gate allows
// color literals solely in theme.ts). The meaning is also stated in text (the percent and
// the caption), so it is never carried by color alone (WCAG 2.2 AA).
export default function MatchGauge({ pct, caption }: Props) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(100, pct));
  const size = 160;
  const stroke = 16;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - clamped / 100);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
      <Box
        role="img"
        aria-label={`Title fit ${clamped} percent`}
        sx={{ position: "relative", width: size, height: size }}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={theme.palette.divider}
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={theme.palette.primary.main}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography variant="h2" component="span" aria-hidden>
            {clamped}%
          </Typography>
        </Box>
      </Box>
      {caption ? (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center" }}>
          {caption}
        </Typography>
      ) : null}
    </Box>
  );
}
