"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { VerdictCount } from "@/components/resultSummary";

interface Props {
  counts: VerdictCount[];
}

// The three verdict-step stat tiles (Hats covered / Hidden hats / Extra hats), matching the
// prototype's step-1 tiles (T17 / ADR-0039). Each tile states its count and its label in
// text; color is from the theme only and never the sole carrier of meaning (WCAG 2.2 AA).
export default function StatTiles({ counts }: Props) {
  return (
    <Box
      component="ul"
      aria-label="Hat counts"
      sx={{
        listStyle: "none",
        pl: 0,
        m: 0,
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
        gap: 2,
      }}
    >
      {counts.map((c) => (
        <Box
          component="li"
          key={c.label}
          sx={{
            bgcolor: "action.hover",
            border: 1,
            borderColor: "divider",
            borderRadius: 1,
            p: 2,
          }}
        >
          <Typography variant="h2" component="p">
            {c.count}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {c.label}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
