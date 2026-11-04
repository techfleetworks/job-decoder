"use client";

import { useMemo, useState } from "react";
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

function HatCard({ hat, evidence }: { hat: ScoredHat; evidence: Match[] }) {
  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Chip
          size="small"
          color={hat.level === "full" ? "primary" : "default"}
          label={hat.level === "full" ? "Full" : "Partial"}
          sx={{ mb: 1 }}
        />
        <Typography variant="h3" component="h3">
          {`${hat.name} — ${hat.scoreWhole}% of its work named`}
        </Typography>
        {hat.description ? (
          <Typography variant="body2" sx={{ mb: 1 }}>
            {hat.description}
          </Typography>
        ) : null}
        {evidence.length > 0 ? (
          <Accordion disableGutters elevation={0} sx={{ "&:before": { display: "none" } }}>
            <AccordionSummary expandIcon={<span aria-hidden>▾</span>}>
              <Typography variant="body2">Evidence ({evidence.length})</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box component="ul" sx={{ pl: 3, m: 0 }}>
                {evidence.map((m) => (
                  <Typography component="li" variant="body2" key={`${m.type}:${m.slug}`}>
                    &ldquo;{m.term}&rdquo; names {m.label} ({m.type}, {tierWording(m.tier)})
                  </Typography>
                ))}
              </Box>
            </AccordionDetails>
          </Accordion>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No matching quotes for this filter.
          </Typography>
        )}
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
