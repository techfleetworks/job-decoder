"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import MobileStepper from "@mui/material/MobileStepper";
import Typography from "@mui/material/Typography";
import FrameworkCredit from "@/components/FrameworkCredit";
import HatPrepCard from "@/components/HatPrepCard";
import { projectPrep } from "@/domain/decode";
import type {
  Chip as SkillChip,
  HatCoverCard,
  HatHighlightCard,
  HatInterviewCard,
  HatSkillCard,
  KeywordGroup,
  NamedSkill,
  PrepGuide,
  SharedSkill,
} from "@/domain/decode";

interface Props {
  prepGuide: PrepGuide;
  basicRead: boolean;
  onBack: () => void;
}

// The one-line subtitle each ATS keyword group shows in the prototype. The domain emits the
// "Skills" group; the prototype titles it "Key skills".
const ATS_GROUP: Record<string, { title: string; subtitle: string }> = {
  "In the posting": { title: "In the posting", subtitle: "The posting's own wording for the work it matched." },
  Hats: { title: "Hats", subtitle: "Matched, expected but missing, and not standard." },
  Tools: { title: "Tools", subtitle: "Tools the framework lists for these Hats." },
  Activities: { title: "Activities", subtitle: "The framework's names for the work." },
  Skills: { title: "Key skills", subtitle: "Skills the matched work needs most." },
};

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

function ChipRow({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
      {items.map((label) => (
        <Chip key={label} label={label} size="small" variant="outlined" />
      ))}
    </Box>
  );
}

function Quote({ text }: { text: string }) {
  return (
    <Box sx={{ bgcolor: "action.hover", borderRadius: 1, p: 1.5, my: 1 }}>
      <Typography variant="body2" sx={{ fontStyle: "italic" }}>
        &ldquo;{text}&rdquo;
      </Typography>
    </Box>
  );
}

function hatNames(hats: { name: string }[]): string {
  return hats.map((h) => h.name).join(", ");
}

// --- Step 1: ATS keywords, as category chip sections ---
function AtsStep({ groups, onCopy }: { groups: KeywordGroup[]; onCopy: (text: string) => void }) {
  const all = groups.flatMap((g) => g.keywords);
  return (
    <>
      {groups.map((g) => {
        const meta = ATS_GROUP[g.group] ?? { title: g.group, subtitle: "" };
        return (
          <Box key={g.group} sx={{ mb: 3 }}>
            <Typography variant="h3" component="h3">
              {meta.title}
            </Typography>
            {meta.subtitle ? (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {meta.subtitle}
              </Typography>
            ) : null}
            <ChipRow items={g.keywords} />
          </Box>
        );
      })}
      {all.length > 0 ? (
        <Button variant="outlined" onClick={() => onCopy(all.join(", "))} sx={{ mt: 1 }}>
          Copy all keywords
        </Button>
      ) : null}
    </>
  );
}

// --- Step 2: Skills, as three sections ---
function NamedInPosting({ skills }: { skills: NamedSkill[] }) {
  if (skills.length === 0) return null;
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h3" component="h3">
        Named in the posting
      </Typography>
      {skills.map((s) => (
        <Box key={s.slug} sx={{ mb: 2 }}>
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            {s.label}
          </Typography>
          {s.quote ? <Quote text={s.quote} /> : null}
          <Typography variant="body2" color="text.secondary">
            For the {hatNames(s.hats)} {s.hats.length === 1 ? "Hat" : "Hats"}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

function SharedSkills({ skills }: { skills: SharedSkill[] }) {
  if (skills.length === 0) return null;
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h3" component="h3">
        Shared by several Hats
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Each skill is listed once, with every Hat it supports.
      </Typography>
      <Box>
        {skills.map((s, i) => (
          <Box key={s.slug}>
            {i > 0 ? <Divider /> : null}
            <Box sx={{ py: 1.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {s.label}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {s.type} skill for the {hatNames(s.hats)} {s.hats.length === 1 ? "Hat" : "Hats"}.
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function AccordionPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Accordion disableGutters elevation={0} sx={{ mt: 1, "&:before": { display: "none" } }}>
      <AccordionSummary expandIcon={<span aria-hidden>▾</span>}>
        <Typography variant="body2">{title}</Typography>
      </AccordionSummary>
      <AccordionDetails>{children}</AccordionDetails>
    </Accordion>
  );
}

function ChipGroup({ label, chips }: { label: string; chips: SkillChip[] }) {
  if (chips.length === 0) return null;
  return (
    <Box sx={{ mt: 1 }}>
      <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
        {label}
      </Typography>
      <ChipRow items={chips.map((c) => c.label)} />
    </Box>
  );
}

function SkillsByHat({ cards }: { cards: HatSkillCard[] }) {
  return (
    <Box sx={{ mb: 1 }}>
      <Typography variant="h3" component="h3" sx={{ mb: 1 }}>
        By Hat
      </Typography>
      {cards.map((c) => (
        <HatPrepCard key={c.hat.slug} hat={c.hat}>
          <ChipGroup label="Needed for the work the posting names" chips={c.needed} />
          <ChipGroup label="Foundational" chips={c.foundational} />
          {c.all.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              No skills listed for this Hat.
            </Typography>
          ) : (
            <AccordionPanel title={`All skills (${c.all.length})`}>
              <ChipRow items={c.all.map((s) => s.label)} />
            </AccordionPanel>
          )}
        </HatPrepCard>
      ))}
    </Box>
  );
}

// --- Step 3: What to highlight, per-hat item cards ---
function HighlightItemView({
  item,
}: {
  item: HatHighlightCard["items"][number];
}) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="body1" sx={{ fontWeight: 600 }}>
        {item.label}
      </Typography>
      {item.quote ? <Quote text={item.quote} /> : null}
      {item.template ? (
        <Box sx={{ bgcolor: "action.hover", borderRadius: 1, p: 1.5, my: 1 }}>
          <Typography variant="body2">{item.template}</Typography>
        </Box>
      ) : null}
      {item.hint ? (
        <Typography variant="body2" color="text.secondary">
          Why it matters: {item.hint}
        </Typography>
      ) : null}
    </Box>
  );
}

function HighlightCard({ card }: { card: HatHighlightCard }) {
  // Matched items lead, shown in full; unmatched items collapse into "More from this Hat".
  // A hat with no matched items has nothing to collapse, so all of its items show (ADR-0045).
  const hasMatched = card.items.some((i) => i.matched);
  const shown = hasMatched ? card.items.filter((i) => i.matched) : card.items;
  const more = hasMatched ? card.items.filter((i) => !i.matched) : [];
  return (
    <HatPrepCard hat={card.hat}>
      {shown.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Nothing to highlight for this Hat yet.
        </Typography>
      ) : (
        <Box sx={{ mt: 1 }}>
          {shown.map((i) => (
            <HighlightItemView key={i.slug} item={i} />
          ))}
        </Box>
      )}
      {more.length > 0 ? (
        <AccordionPanel title={`More from this Hat (${more.length})`}>
          {more.map((i) => (
            <HighlightItemView key={i.slug} item={i} />
          ))}
        </AccordionPanel>
      ) : null}
    </HatPrepCard>
  );
}

// --- Step 4: Cover letter points ---
function CoverCard({ card }: { card: HatCoverCard }) {
  return (
    <HatPrepCard hat={card.hat}>
      <Typography variant="body2" sx={{ mt: 1 }}>
        {card.sentence}
      </Typography>
      {card.quote ? <Quote text={card.quote} /> : null}
      {card.deliverables.length > 0 ? (
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
            Name what you delivered:
          </Typography>
          <ChipRow items={card.deliverables} />
        </Box>
      ) : null}
    </HatPrepCard>
  );
}

// --- Step 5: Interview points ---
function InterviewCard({ card }: { card: HatInterviewCard }) {
  return (
    <HatPrepCard hat={card.hat}>
      <Typography variant="body2" sx={{ mt: 1 }}>
        {card.sentence}
      </Typography>
      {card.quote ? <Quote text={card.quote} /> : null}
    </HatPrepCard>
  );
}

export default function PrepView({ prepGuide, basicRead, onBack }: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(false);
  const [active, setActive] = useState(0);
  const [copyStatus, setCopyStatus] = useState("");

  const prep = useMemo(() => projectPrep(prepGuide), [prepGuide]);

  const coverText = prep.cover.map((c) => `${c.hat.name}: ${c.sentence}`).join("\n");
  const interviewText = prep.interview.map((c) => `${c.hat.name}: ${c.sentence}`).join("\n");

  // Copy, then tell the user what happened in a live region, so a screen-reader user hears
  // the result (the clipboard gives no visible change). A blocked clipboard reports the
  // fallback instead of failing silently.
  async function handleCopy(text: string) {
    const ok = await copy(text);
    setCopyStatus(ok ? "Copied to your clipboard." : "Copy failed. Select the text to copy it by hand.");
  }

  // The steps in the prototype's order (T19): ATS keywords, Skills, What to highlight, Cover,
  // Interview.
  const steps = [
    {
      title: "ATS keywords",
      subtitle: "Use these words in your resume. Each keyword appears once.",
      content: <AtsStep groups={prepGuide.atsKeywords} onCopy={(t) => void handleCopy(t)} />,
    },
    {
      title: "Skills",
      subtitle: "Skills the posting names come first, then skills its work needs, then foundational skills.",
      content: (
        <>
          <NamedInPosting skills={prep.skills.namedInPosting} />
          <SharedSkills skills={prep.skills.shared} />
          <SkillsByHat cards={prep.skills.byHat} />
        </>
      ),
    },
    {
      title: "What to highlight",
      subtitle: "Turn each item into one resume line. Fill in the blanks with your own work.",
      content: (
        <>
          {prep.highlights.map((c) => (
            <HighlightCard key={c.hat.slug} card={c} />
          ))}
        </>
      ),
    },
    {
      title: "Cover letter points",
      subtitle: "One point per Hat.",
      content: (
        <>
          {prep.cover.map((c) => (
            <CoverCard key={c.hat.slug} card={c} />
          ))}
          {prep.cover.length > 0 ? (
            <Button variant="outlined" onClick={() => void handleCopy(coverText)} sx={{ mt: 1 }}>
              Copy all points
            </Button>
          ) : null}
        </>
      ),
    },
    {
      title: "Interview points",
      subtitle: "Be ready for every Hat the job expects, including the ones the posting leaves out.",
      content: (
        <>
          {prep.interview.map((c) => (
            <InterviewCard key={c.hat.slug} card={c} />
          ))}
          {prep.interview.length > 0 ? (
            <Button variant="outlined" onClick={() => void handleCopy(interviewText)} sx={{ mt: 1 }}>
              Copy all points
            </Button>
          ) : null}
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

  const step = steps[active]!;

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

      <Typography variant="h2" component="h2" tabIndex={-1} ref={stepHeadingRef} sx={{ mb: 1 }}>
        {step.title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {step.subtitle}
      </Typography>
      {step.content}

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
