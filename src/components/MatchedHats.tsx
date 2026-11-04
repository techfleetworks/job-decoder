"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { GROUP_HEADINGS, tierWording } from "@/components/resultSummary";
import type { Match, MatchTier, ScoredHat } from "@/domain/decode/types";

type Filter = "all" | MatchTier;
const TIERS: MatchTier[] = ["exact", "alias", "similar"];

interface Props {
  covered: ScoredHat[];
  matched: Match[];
}

// The matched-hats step (T17 / ADR-0039): hats grouped Fully / Partly covered, each as a
// card with a level pill and an Evidence accordion, plus filter chips that narrow the
// evidence by match type. "Why it matters" and "What it takes" are added once the decode
// result carries that per-hat detail (currently ScoredHat does not).
function evidenceFor(matched: Match[], hatSlug: string): Match[] {
  return matched.filter((m) => m.duties.includes(hatSlug));
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

function HatCard({ hat, evidence }: { hat: ScoredHat; evidence: Match[] }) {
  const detail = hat.detail;
  const hasWhatItTakes =
    !!detail && detail.activities.length + detail.deliverables.length + detail.tools.length > 0;
  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Chip
          size="small"
          color={hat.level === "full" ? "primary" : "default"}
          label={hat.level === "full" ? "Full" : "Partial"}
          sx={{ mb: 1 }}
        />
        <Typography variant="h3" component="h3" sx={{ mb: 1 }}>
          {`${hat.name} — ${hat.scoreWhole}% of its work named`}
        </Typography>
        <Panel title={`Evidence (${evidence.length})`}>
          {evidence.length > 0 ? (
            <Box component="ul" sx={{ pl: 3, m: 0 }}>
              {evidence.map((m) => (
                <Typography component="li" variant="body2" key={`${m.type}:${m.slug}`}>
                  &ldquo;{m.term}&rdquo; names {m.label} ({m.type}, {tierWording(m.tier)})
                </Typography>
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No matching quotes for this filter.
            </Typography>
          )}
        </Panel>
        {hat.description ? (
          <Panel title="Why it matters">
            <Typography variant="body2">{hat.description}</Typography>
          </Panel>
        ) : null}
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

export default function MatchedHats({ covered, matched }: Props) {
  const [filter, setFilter] = useState<Filter>("all");

  // Count the distinct matched items by tier among those that roll up to a covered hat, for
  // the filter-chip labels.
  const tierCounts = useMemo(() => {
    const coveredSlugs = new Set(covered.map((h) => h.slug));
    const relevant = matched.filter((m) => m.duties.some((d) => coveredSlugs.has(d)));
    const counts: Record<Filter, number> = { all: relevant.length, exact: 0, alias: 0, similar: 0 };
    for (const m of relevant) counts[m.tier] += 1;
    return counts;
  }, [covered, matched]);

  const full = covered.filter((h) => h.level === "full");
  const partial = covered.filter((h) => h.level === "partial");
  const byFilter = (m: Match) => filter === "all" || m.tier === filter;

  const group = (hats: ScoredHat[], heading: string) =>
    hats.length === 0 ? null : (
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
          {heading}
        </Typography>
        {hats.map((h) => (
          <HatCard key={h.slug} hat={h} evidence={evidenceFor(matched, h.slug).filter(byFilter)} />
        ))}
      </Box>
    );

  return (
    <Box>
      <ToggleButtonGroup
        size="small"
        exclusive
        value={filter}
        onChange={(_, v: Filter | null) => v && setFilter(v)}
        aria-label="Filter evidence by match type"
        sx={{ mb: 2, flexWrap: "wrap" }}
      >
        <ToggleButton value="all">All {tierCounts.all}</ToggleButton>
        {TIERS.map((t) => (
          <ToggleButton key={t} value={t}>
            {tierWording(t)} {tierCounts[t]}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      {group(full, GROUP_HEADINGS.full)}
      {group(partial, GROUP_HEADINGS.partial)}
    </Box>
  );
}
