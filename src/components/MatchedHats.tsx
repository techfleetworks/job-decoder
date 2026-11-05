"use client";

import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import HatCard from "@/components/HatCard";
import { evidenceFor, GROUP_HEADINGS, tierWording } from "@/components/resultSummary";
import type { Match, MatchTier, ScoredHat } from "@/domain/decode/types";

type Filter = "all" | MatchTier;
const TIERS: MatchTier[] = ["exact", "alias", "similar"];

interface Props {
  covered: ScoredHat[];
  matched: Match[];
}

// The matched-hats step (T17 / ADR-0039): covered hats grouped Fully / Partly, each rendered
// with the shared HatCard. The filter chips count HATS and narrow the visible cards by match
// type, so clicking one visibly changes the list.
function hatMatchesFilter(matched: Match[], hat: ScoredHat, filter: Filter): boolean {
  return filter === "all" || evidenceFor(matched, hat.slug).some((m) => m.tier === filter);
}

export default function MatchedHats({ covered, matched }: Props) {
  const [filter, setFilter] = useState<Filter>("all");

  const tierCounts = useMemo(() => {
    const counts: Record<Filter, number> = { all: covered.length, exact: 0, alias: 0, similar: 0 };
    for (const tier of TIERS) {
      counts[tier] = covered.filter((h) => hatMatchesFilter(matched, h, tier)).length;
    }
    return counts;
  }, [covered, matched]);

  const shown = covered.filter((h) => hatMatchesFilter(matched, h, filter));
  const shownFull = shown.filter((h) => h.level === "full");
  const shownPartial = shown.filter((h) => h.level === "partial");

  const group = (hats: ScoredHat[], heading: string) =>
    hats.length === 0 ? null : (
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
          {heading}
        </Typography>
        {hats.map((h) => (
          <HatCard
            key={h.slug}
            name={h.name}
            level={h.level}
            scoreWhole={h.scoreWhole}
            description={h.description}
            detail={h.detail}
            evidence={evidenceFor(matched, h.slug)}
          />
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
        aria-label="Filter hats by match type"
        sx={{ mb: 2, flexWrap: "wrap" }}
      >
        <ToggleButton value="all">All {tierCounts.all}</ToggleButton>
        {TIERS.map((t) => (
          <ToggleButton key={t} value={t} disabled={tierCounts[t] === 0}>
            {tierWording(t)} {tierCounts[t]}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      {shown.length === 0 ? (
        <Typography variant="body1">
          No covered hat has a {tierWording(filter as MatchTier)} match. Choose All to see them
          all.
        </Typography>
      ) : (
        <>
          {group(shownFull, GROUP_HEADINGS.full)}
          {group(shownPartial, GROUP_HEADINGS.partial)}
        </>
      )}
    </Box>
  );
}
