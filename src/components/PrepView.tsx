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

async function copy(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    // The clipboard can be blocked (permissions, insecure context). There is nothing to
    // recover (the text stays on screen to select by hand), so report it and move on.
    console.warn("Clipboard copy failed; the text can be selected manually.", err);
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
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(false);
  const [active, setActive] = useState(0);

  const allKeywords = prepGuide.atsKeywords.flatMap((g) => g.keywords);
  const coverText = prepGuide.coverLetterPoints.map((p) => `${p.hatName}: ${p.text}`).join("\n");
  const interviewText = prepGuide.interviewPoints.map((p) => `${p.hatName}: ${p.text}`).join("\n");

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
          <Button variant="outlined" onClick={() => void copy(allKeywords.join(", "))} sx={{ mb: 2 }}>
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
            <Button variant="outlined" onClick={() => void copy(coverText)} sx={{ mb: 2 }}>
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
            <Button variant="outlined" onClick={() => void copy(interviewText)} sx={{ mb: 2 }}>
              Copy interview points
            </Button>
          ) : null}
          <PointList points={prepGuide.interviewPoints} />
        </>
      ),
    },
  ];

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    stepHeadingRef.current?.focus();
  }, [active]);

  return (
    <Box>
      <Typography variant="h1" gutterBottom>
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
    </Box>
  );
}
