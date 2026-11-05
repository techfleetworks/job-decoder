"use client";

import { useEffect, useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import MobileStepper from "@mui/material/MobileStepper";
import Typography from "@mui/material/Typography";
import FrameworkCredit from "@/components/FrameworkCredit";
import HowItWorks from "@/components/HowItWorks";
import HatCard from "@/components/HatCard";
import MatchGauge from "@/components/MatchGauge";
import StatTiles from "@/components/StatTiles";
import { evidenceFor, isBasicRead, matchSummary, tierWording, verdictCounts, verdictHeadline } from "@/components/resultSummary";
import MatchedHats from "@/components/MatchedHats";
import type { DecodeResult, ScoredHat } from "@/domain/decode/types";

interface Props {
  result: DecodeResult;
  onStartOver: () => void;
  onPrepare?: () => void;
}

// One hat with the posting phrases that rolled up to it: the receipt, per hat (ADR-0023).
function HatList({ hats, result, emptyNote }: { hats: ScoredHat[]; result: DecodeResult; emptyNote?: string }) {
  if (hats.length === 0) return emptyNote ? <Typography variant="body1">{emptyNote}</Typography> : null;
  return (
    <Box component="ul" sx={{ listStyle: "none", pl: 0, m: 0 }}>
      {hats.map((hat) => {
        const evidence = evidenceFor(result.matched, hat.slug);
        return (
          <Box component="li" key={hat.slug} sx={{ mb: 3 }}>
            <Typography variant="h3" component="h3">
              {hat.level !== "none" ? `${hat.name} — ${hat.scoreWhole}% of its work named` : hat.name}
            </Typography>
            {hat.description ? (
              <Typography variant="body2" sx={{ mb: 1 }}>
                {hat.description}
              </Typography>
            ) : null}
            {evidence.length > 0 ? (
              <Box component="ul" sx={{ pl: 3, m: 0 }}>
                {evidence.map((m) => (
                  <Typography component="li" variant="body2" key={`${m.type}:${m.slug}`}>
                    &ldquo;{m.term}&rdquo; names {m.label} ({m.type}, {tierWording(m.tier)})
                  </Typography>
                ))}
              </Box>
            ) : null}
          </Box>
        );
      })}
    </Box>
  );
}

export default function Results({ result, onStartOver, onPrepare }: Props) {
  const notCovered = result.verdict === "not-covered";
  // Covered title, but no posting line matched any framework item (prototype screen 21): show
  // a plain explanation with hints instead of an empty stepper. Every standard hat is hidden.
  const noLinesMatched = !notCovered && result.linesMatched === 0;
  const verdictRef = useRef<HTMLHeadingElement>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(false);
  const [active, setActive] = useState(0);

  const steps = notCovered
    ? []
    : [
        {
          title: "Title fit",
          content: (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <MatchGauge
                pct={result.pctWhole}
                caption={`${result.covered.length} of ${result.standardCount} standard hats covered`}
              />
              <StatTiles counts={verdictCounts(result)} />
              <Typography variant="body1">{matchSummary(result)}</Typography>
            </Box>
          ),
        },
        {
          title: `Hats this posting covers (${result.covered.length})`,
          content:
            result.covered.length === 0 ? (
              <Typography variant="body1">
                The posting did not clearly name any of this title&rsquo;s standard hats.
              </Typography>
            ) : (
              <MatchedHats covered={result.covered} matched={result.matched} />
            ),
        },
        {
          title: `Hidden hats (${result.missing.length})`,
          content: (
            <>
              <Typography variant="body2" sx={{ mb: 2 }}>
                These hats are expected for this title, but the posting did not name them.
              </Typography>
              <HatList
                hats={result.missing}
                result={result}
                emptyNote="None. The posting named every standard hat for this title."
              />
            </>
          ),
        },
        {
          title: `Extra hats (${result.nonStandard.length})`,
          content: (
            <>
              <Typography variant="body2" sx={{ mb: 2 }}>
                These were named in the posting but are not usually part of this title.
              </Typography>
              {result.nonStandard.length === 0 ? (
                <Typography variant="body1">
                  None. The posting stayed within this title&rsquo;s usual hats.
                </Typography>
              ) : (
                result.nonStandard.map((h) => (
                  <HatCard
                    key={h.slug}
                    name={h.name}
                    level={h.level === "none" ? "partial" : h.level}
                    scoreWhole={h.scoreWhole}
                    detail={h.detail}
                    evidence={evidenceFor(result.matched, h.slug)}
                  />
                ))
              )}
            </>
          ),
        },
      ];

  // Announce the verdict first: move focus to the headline on mount, for both a covered and
  // a not-covered result, so a screen-reader user hears the verdict instead of losing focus.
  useEffect(() => {
    verdictRef.current?.focus();
  }, []);
  // On a later step change, move focus to that step's heading so it is announced. Skip the
  // first run so the verdict headline stays the first thing read.
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (!notCovered) stepHeadingRef.current?.focus();
  }, [active, notCovered]);

  return (
    <Box>
      <Typography variant="h1" gutterBottom tabIndex={-1} ref={verdictRef}>
        {verdictHeadline(result)}
      </Typography>
      {result.functionName ? (
        <Typography variant="body1" sx={{ mb: 2 }}>
          Read as: {result.functionName}
        </Typography>
      ) : null}

      {isBasicRead(result) ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          This is a basic read from keyword matching. The AI step that catches reworded
          phrases is not switched on yet.
        </Alert>
      ) : null}

      {notCovered ? (
        <Typography variant="body1" sx={{ mb: 3 }}>
          Hat Check does not cover this title yet, so it will not guess. Try a title like UX
          Designer, Product Manager, or Software Engineer.
        </Typography>
      ) : noLinesMatched ? (
        <Box sx={{ mb: 2 }}>
          <Typography variant="h2" component="h2" sx={{ mb: 1 }}>
            No posting lines matched
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            None of the posting lines matched this title&rsquo;s framework work. That usually
            means the posting is in another language, or is mostly benefits or legal text. Every
            standard hat for this title shows as hidden below.
          </Typography>
          <HatList
            hats={result.missing}
            result={result}
            emptyNote="There are no standard hats to show for this title."
          />
        </Box>
      ) : (
        <Box sx={{ mb: 2 }}>
          <Typography variant="h2" component="h2" tabIndex={-1} ref={stepHeadingRef} sx={{ mb: 2 }}>
            {steps[active]!.title}
          </Typography>
          {steps[active]!.content}
          <MobileStepper
            variant="dots"
            steps={steps.length}
            position="static"
            activeStep={active}
            sx={{ mt: 2, px: 0 }}
            nextButton={
              <Button
                onClick={() => setActive((s) => Math.min(s + 1, steps.length - 1))}
                disabled={active === steps.length - 1}
              >
                Next
              </Button>
            }
            backButton={
              <Button onClick={() => setActive((s) => Math.max(s - 1, 0))} disabled={active === 0}>
                Back
              </Button>
            }
          />
        </Box>
      )}

      {!notCovered && result.unplaced.length > 0 ? (
        <Typography variant="body2" sx={{ mb: 2 }}>
          {result.unplaced.length} posting{" "}
          {result.unplaced.length === 1 ? "line was" : "lines were"} not placed against the
          framework.
        </Typography>
      ) : null}

      <Divider sx={{ my: 3 }} />
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "flex-start" }}>
        {onPrepare ? (
          <Button variant="contained" onClick={onPrepare}>
            Prepare your application
          </Button>
        ) : null}
        <Button variant={onPrepare ? "outlined" : "contained"} onClick={onStartOver}>
          Decode another posting
        </Button>
        <HowItWorks />
        <FrameworkCredit />
      </Box>
    </Box>
  );
}
