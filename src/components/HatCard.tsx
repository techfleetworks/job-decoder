"use client";

import type { ReactNode } from "react";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import type { HatDetail, Match, MatchLevel, MatchTier } from "@/domain/decode/types";

// One hat as a card, shared by the covered step and the extra-hats step so both read the same
// (T17 design fidelity). The share sits in a small headline pill; the reference line spells out
// what the share means; the Evidence quotes are styled as the prototype shows them.
interface Props {
  name: string;
  level: MatchLevel; // "full" | "partial" here (a card is never shown for "none")
  scoreWhole: number;
  description?: string;
  detail?: HatDetail;
  evidence: Match[];
}

const TIER_LABEL: Record<MatchTier, string> = { exact: "Exact", alias: "Alias", similar: "Similar" };
const TIERS: MatchTier[] = ["exact", "alias", "similar"];

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Accordion disableGutters elevation={0} sx={{ "&:before": { display: "none" } }}>
      <AccordionSummary expandIcon={<span aria-hidden>▾</span>}>
        <Typography variant="body2">{title}</Typography>
      </AccordionSummary>
      <AccordionDetails>{children}</AccordionDetails>
    </Accordion>
  );
}

function DetailList({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <Box sx={{ mb: 1 }}>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
      <Box component="ul" sx={{ pl: 3, m: 0 }}>
        {items.map((t) => (
          <Typography component="li" variant="body2" key={t}>
            {t}
          </Typography>
        ))}
      </Box>
    </Box>
  );
}

export default function HatCard({ name, level, scoreWhole, description, detail, evidence }: Props) {
  const counts = TIERS.map((t) => ({ tier: t, n: evidence.filter((m) => m.tier === t).length })).filter((c) => c.n > 0);
  const hasWhatItTakes =
    !!detail && detail.activities.length + detail.deliverables.length + detail.tools.length > 0;

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Chip
          size="small"
          color={level === "full" ? "primary" : "default"}
          label={`${level === "full" ? "Full" : "Partial"} · ${scoreWhole}%`}
          sx={{ mb: 1 }}
        />
        <Typography variant="h3" component="h3">
          {name}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {`The posting references ${scoreWhole}% of ${name}'s work responsibilities.`}
        </Typography>
        {description ? (
          <Typography variant="body2" sx={{ mb: 1 }}>
            {description}
          </Typography>
        ) : null}
        {counts.length > 0 ? (
          <Box sx={{ mb: 1 }}>
            {counts.map((c) => (
              <Typography variant="body2" key={c.tier}>
                {c.n} {TIER_LABEL[c.tier].toLowerCase()} match{c.n === 1 ? "" : "es"}
              </Typography>
            ))}
          </Box>
        ) : null}
        <Panel title={`Evidence (${evidence.length})`}>
          {evidence.length > 0 ? (
            evidence.map((m) => (
              <Box key={`${m.type}:${m.slug}`} sx={{ mb: 2 }}>
                <Box sx={{ bgcolor: "action.hover", borderRadius: 1, p: 1.5, mb: 0.5 }}>
                  <Typography variant="body2" sx={{ fontStyle: "italic" }}>
                    &ldquo;{m.term}&rdquo;
                  </Typography>
                </Box>
                <Typography variant="body2">
                  Matches the {m.type} {m.label}. {TIER_LABEL[m.tier]} match.
                </Typography>
                <Typography variant="caption" color="text.secondary" component="p">
                  Role: Responsible
                </Typography>
              </Box>
            ))
          ) : (
            <Typography variant="body2" color="text.secondary">
              No quotes to show.
            </Typography>
          )}
        </Panel>
        {hasWhatItTakes ? (
          <Panel title="What it takes">
            <DetailList label="Activities" items={detail!.activities} />
            <DetailList label="Deliverables" items={detail!.deliverables} />
            <DetailList label="Tools" items={detail!.tools} />
          </Panel>
        ) : null}
      </CardContent>
    </Card>
  );
}
