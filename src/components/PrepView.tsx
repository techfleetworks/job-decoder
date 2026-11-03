"use client";

import { useEffect, useRef, useState } from "react";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import MobileStepper from "@mui/material/MobileStepper";
import Typography from "@mui/material/Typography";
import FrameworkCredit from "@/components/FrameworkCredit";
import type { HighlightItem, PrepGuide, PrepPoint, SkillPrepItem } from "@/domain/decode";

interface Props {
  prepGuide: PrepGuide;
  basicRead: boolean;
  onBack: () => void;
}

function hatNames(hats: { name: string }[]): string {
  return hats.map((h) => h.name).join(", ");
}

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    // The clipboard can be blocked (permissions, insecure context). There is nothing to
    // recover (the text stays on screen to select by hand), so report it to the caller, which
    // tells the user, and log for diagnosis.
    console.warn("Clipboard copy failed; the text can be selected manually.", err);
    return false;
  }
}

function SkillColumn({ title, skills }: { title: string; skills: SkillPrepItem[] }) {
  const key = skills.filter((s) => s.key);
  const other = skills.filter((s) => !s.key);
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h3" component="h3">
        {title}
      </Typography>
      {key.length === 0 ? (
        <Typography variant="body2">No key skills for these hats.</Typography>
      ) : (
        <Box component="ul" sx={{ pl: 3, m: 0 }}>
          {key.map((s) => (
            <Typography component="li" variant="body2" key={s.slug}>
              {s.label} <Typography component="span" variant="body2" color="text.secondary">({hatNames(s.hats)})</Typography>
            </Typography>
          ))}
        </Box>
      )}
      {other.length > 0 ? (
        <Accordion disableGutters elevation={0} sx={{ mt: 1, "&:before": { display: "none" } }}>
          <AccordionSummary>
            <Typography variant="body2">Other skills these hats use ({other.length})</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box component="ul" sx={{ pl: 3, m: 0 }}>
              {other.map((s) => (
                <Typography component="li" variant="body2" key={s.slug}>
                  {s.label}
                </Typography>
              ))}
            </Box>
          </AccordionDetails>
        </Accordion>
      ) : null}
    </Box>
  );
}

function HighlightList({ items, empty }: { items: HighlightItem[]; empty: string }) {
  if (items.length === 0) return <Typography variant="body2">{empty}</Typography>;
  return (
    <Box component="ul" sx={{ pl: 3, m: 0, mb: 2 }}>
      {items.map((i) => (
        <Typography component="li" variant="body2" key={`${i.hatSlug}:${i.slug}`}>
          {i.label}
          {i.matched ? <Typography component="span" variant="body2" color="text.secondary"> — named in the posting</Typography> : null}
        </Typography>
      ))}
    </Box>
  );
}

function PointList({ points }: { points: PrepPoint[] }) {
  if (points.length === 0) return <Typography variant="body1">Nothing to add here.</Typography>;
  return (
    <Box component="ul" sx={{ pl: 3, m: 0 }}>
      {points.map((p, i) => (
        <Box component="li" key={`${p.hatSlug}:${i}`} sx={{ mb: 1.5 }}>
          <Typography variant="body2">
            <strong>{p.hatName}:</strong> {p.text}
          </Typography>
          {p.deliverables && p.deliverables.length > 0 ? (
            <Typography variant="body2" color="text.secondary">
              Deliverables: {p.deliverables.join(", ")}
            </Typography>
          ) : null}
        </Box>
      ))}
    </Box>
  );
}

export default function PrepView({ prepGuide, basicRead, onBack }: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(false);
  const [active, setActive] = useState(0);
  const [copyStatus, setCopyStatus] = useState("");

  const allKeywords = prepGuide.atsKeywords.flatMap((g) => g.keywords);
  const coverText = prepGuide.coverLetterPoints.map((p) => `${p.hatName}: ${p.text}`).join("\n");
  const interviewText = prepGuide.interviewPoints.map((p) => `${p.hatName}: ${p.text}`).join("\n");

  // Copy, then tell the user what happened in a live region, so a screen-reader user hears
  // the result (the clipboard gives no visible change). A blocked clipboard reports the
  // fallback instead of failing silently.
  async function handleCopy(text: string) {
    const ok = await copy(text);
    setCopyStatus(ok ? "Copied to your clipboard." : "Copy failed. Select the text to copy it by hand.");
  }

  const steps = [
    {
      title: "Skills for your resume",
      content: (
        <>
          <SkillColumn title="Technical skills" skills={prepGuide.technicalSkills} />
          <SkillColumn title="Interpersonal skills" skills={prepGuide.interpersonalSkills} />
        </>
      ),
    },
    {
      title: "Activities and deliverables to highlight",
      content: (
        <>
          <Typography variant="h3" component="h3">Activities</Typography>
          <HighlightList items={prepGuide.activities} empty="No activities to highlight." />
          <Typography variant="h3" component="h3">Deliverables</Typography>
          <HighlightList items={prepGuide.deliverables} empty="No deliverables to highlight." />
          <Typography variant="h3" component="h3">Phrase it as an outcome</Typography>
          {prepGuide.outcomeTemplates.length === 0 ? (
            <Typography variant="body2">No templates to show.</Typography>
          ) : (
            <Box component="ul" sx={{ pl: 3, m: 0 }}>
              {prepGuide.outcomeTemplates.map((t) => (
                <Box component="li" key={t.activitySlug} sx={{ mb: 1.5 }}>
                  <Typography variant="body2">{t.template}</Typography>
                  {t.hint ? <Typography variant="body2" color="text.secondary">Why it matters: {t.hint}</Typography> : null}
                </Box>
              ))}
            </Box>
          )}
        </>
      ),
    },
    {
      title: "ATS keywords",
      content: (
        <>
          <Button variant="outlined" onClick={() => void handleCopy(allKeywords.join(", "))} sx={{ mb: 2 }}>
            Copy all keywords
          </Button>
          {prepGuide.atsKeywords.map((g) => (
            <Box key={g.group} sx={{ mb: 2 }}>
              <Typography variant="h3" component="h3">{g.group}</Typography>
              <Typography variant="body2">{g.keywords.join(", ")}</Typography>
            </Box>
          ))}
        </>
      ),
    },
    {
      title: "Cover letter points",
      content: (
        <>
          {prepGuide.coverLetterPoints.length > 0 ? (
            <Button variant="outlined" onClick={() => void handleCopy(coverText)} sx={{ mb: 2 }}>
              Copy cover letter points
            </Button>
          ) : null}
          <PointList points={prepGuide.coverLetterPoints} />
        </>
      ),
    },
    {
      title: "Interview points",
      content: (
        <>
          {prepGuide.interviewPoints.length > 0 ? (
            <Button variant="outlined" onClick={() => void handleCopy(interviewText)} sx={{ mb: 2 }}>
              Copy interview points
            </Button>
          ) : null}
          <PointList points={prepGuide.interviewPoints} />
        </>
      ),
    },
  ];

  // On entry, move focus to the screen's heading so a screen-reader user hears that the prep
  // view opened, instead of focus falling to the body (as Results does on its mount).
  useEffect(() => {
    headingRef.current?.focus();
  }, []);
  // On a later step change, move focus to that step's heading so it is announced. Skip the
  // first run so the screen heading stays the first thing read.
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    stepHeadingRef.current?.focus();
  }, [active]);

  return (
    <Box>
      <Typography variant="h1" gutterBottom tabIndex={-1} ref={headingRef}>
        Prepare your application
      </Typography>
      {basicRead ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          This is a basic read from keyword matching. The AI step is not switched on yet.
        </Alert>
      ) : null}

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
          <Button onClick={() => setActive((s) => Math.min(s + 1, steps.length - 1))} disabled={active === steps.length - 1}>
            Next
          </Button>
        }
        backButton={
          <Button onClick={() => setActive((s) => Math.max(s - 1, 0))} disabled={active === 0}>
            Back
          </Button>
        }
      />

      <Box sx={{ mt: 3 }}>
        <Button variant="text" onClick={onBack}>
          Back to the results
        </Button>
      </Box>

      {/* This screen shows framework-derived data (skills, activities, deliverables), so it
          carries the attribution line here too, not only on the results screen (ADR-0009
          NFR-9: the CC BY credit appears on every screen that shows framework data). The
          divider matches the results screen's footer separation. */}
      <Divider sx={{ my: 3 }} />
      <FrameworkCredit />

      {/* A visually hidden live region, so a screen-reader user hears whether a copy worked;
          the clipboard itself gives no visible change. */}
      <Box
        role="status"
        aria-live="polite"
        sx={{
          position: "absolute",
          width: 1,
          height: 1,
          p: 0,
          m: "-1px",
          overflow: "hidden",
          clip: "rect(0 0 0 0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        {copyStatus}
      </Box>
    </Box>
  );
}
