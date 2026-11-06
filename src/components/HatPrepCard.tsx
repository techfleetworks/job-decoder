"use client";

import type { ReactNode } from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import { PILL_BY_SET } from "@/domain/decode";
import type { HatRef } from "@/domain/decode";

// One hat as a prep card: a status pill then the hat name, with the step's own body as
// children. Shared by the Skills (By Hat), Highlights, Cover, and Interview steps so every
// per-hat card reads the same (ADR-0045, T20). The pill text carries the meaning, so the
// colour is decoration only (matched is filled, the rest default) and a screen reader hears
// the wording, not a colour.
export default function HatPrepCard({ hat, children }: { hat: HatRef; children: ReactNode }) {
  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Chip
          size="small"
          color={hat.set === "matched" ? "primary" : "default"}
          label={PILL_BY_SET[hat.set]}
          sx={{ mb: 1 }}
        />
        <Typography variant="h3" component="h3">
          {hat.name}
        </Typography>
        {children}
      </CardContent>
    </Card>
  );
}
