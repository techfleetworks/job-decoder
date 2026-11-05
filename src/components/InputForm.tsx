"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import FrameworkCredit from "@/components/FrameworkCredit";
import { MAX_POSTING, MAX_TITLE } from "@/domain/decode";

interface Props {
  onSubmit: (title: string, posting: string) => void;
  working: boolean;
  /** Move focus to the heading on mount, used when returning to a fresh form from a result,
   *  so focus is not left on the body. Off on first load, where focus starts at the top. */
  autoFocusHeading?: boolean;
}

// The input screen: one job title, one pasted posting, one primary action (ADR-0013). Decode
// failures are shown on their own screens (DecodeFailed, TooManyDecodes), not inline here.
export default function InputForm({ onSubmit, working, autoFocusHeading }: Props) {
  const [title, setTitle] = useState("");
  const [posting, setPosting] = useState("");
  const [touched, setTouched] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (autoFocusHeading) headingRef.current?.focus();
  }, [autoFocusHeading]);

  const titleEmpty = title.trim().length === 0;
  const postingEmpty = posting.trim().length === 0;

  // The fields that still need attention, shown as a summary at the top of the form and as a
  // message under each field (WCAG 3.3.1 error identification), once the person has tried to
  // submit. The summary uses role="alert" so it is announced when it appears.
  const fieldErrors = [
    titleEmpty ? "Enter the job title." : null,
    postingEmpty ? "Paste the job posting." : null,
  ].filter((m): m is string => m !== null);
  const showSummary = touched && fieldErrors.length > 0;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (titleEmpty || postingEmpty || working) return;
    onSubmit(title.trim(), posting);
  }

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Typography variant="h1" gutterBottom tabIndex={-1} ref={headingRef}>
        Hat Check
      </Typography>
      <Typography variant="body1" sx={{ mb: 3 }}>
        Paste one job posting and see the responsibilities behind the title: the ones it
        names, the ones it expects but leaves out, and the ones that do not usually belong.
        Every answer comes from the Tech Fleet Skills and Practices Framework.
      </Typography>

      {showSummary ? (
        <Alert severity="error" role="alert" sx={{ mb: 3 }}>
          Fix these before decoding:
          <Box component="ul" sx={{ pl: 3, m: 0, mt: 0.5 }}>
            {fieldErrors.map((msg) => (
              <Typography component="li" variant="body2" key={msg}>
                {msg}
              </Typography>
            ))}
          </Box>
        </Alert>
      ) : null}

      <TextField
        label="Job title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        fullWidth
        required
        disabled={working}
        inputProps={{ maxLength: MAX_TITLE }}
        error={touched && titleEmpty}
        helperText={
          touched && titleEmpty ? "Enter the job title." : "For example, UX Designer or Product Manager."
        }
        sx={{ mb: 3 }}
      />

      <TextField
        label="Job posting"
        value={posting}
        onChange={(e) => setPosting(e.target.value)}
        fullWidth
        required
        multiline
        minRows={8}
        disabled={working}
        inputProps={{ maxLength: MAX_POSTING }}
        error={touched && postingEmpty}
        helperText={
          touched && postingEmpty
            ? "Paste the job posting."
            : `${posting.length.toLocaleString()} / ${MAX_POSTING.toLocaleString()} characters`
        }
        sx={{ mb: 3 }}
      />

      <Button type="submit" variant="contained" disabled={working}>
        {working ? "Reading the posting…" : "Decode this posting"}
      </Button>

      {/* A visually hidden live region, so a screen-reader user hears that the decode is
          running even if they have moved focus away from the button. */}
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
        {working ? "Reading the posting." : ""}
      </Box>

      {/* The framework credit on the input screen too, so every screen carries the
          attribution the prototype shows in its footer (ADR-0009 NFR-9). */}
      <Divider sx={{ my: 3 }} />
      <FrameworkCredit />
    </Box>
  );
}
