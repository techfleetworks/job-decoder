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

interface Props {
  onSubmit: (title: string, posting: string) => void;
  working: boolean;
  error?: string | null;
  /** Move focus to the heading on mount, used when returning to a fresh form from a result,
   *  so focus is not left on the body. Off on first load, where focus starts at the top. */
  autoFocusHeading?: boolean;
}

// The input screen: one job title, one pasted posting, one primary action (ADR-0013).
export default function InputForm({ onSubmit, working, error, autoFocusHeading }: Props) {
  const [title, setTitle] = useState("");
  const [posting, setPosting] = useState("");
  const [touched, setTouched] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (autoFocusHeading) headingRef.current?.focus();
  }, [autoFocusHeading]);

  const titleEmpty = title.trim().length === 0;
  const postingEmpty = posting.trim().length === 0;

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

      {error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      ) : null}

      <TextField
        label="Job title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        fullWidth
        required
        disabled={working}
        inputProps={{ maxLength: 200 }}
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
        inputProps={{ maxLength: 50000 }}
        error={touched && postingEmpty}
        helperText={
          touched && postingEmpty ? "Paste the job posting." : "Paste the full job posting text."
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
