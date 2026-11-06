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
  /** Move focus to the heading on mount, used when returning to a fresh form from a result,
   *  so focus is not left on the body. Off on first load, where focus starts at the top. */
  autoFocusHeading?: boolean;
  /** Seed the fields, used to restore the title and posting after a cancelled decode. */
  initialTitle?: string;
  initialPosting?: string;
}

// The input screen: one job title, one pasted posting, one primary action (ADR-0013). While a
// decode runs the Reading screen is shown instead of this form, and decode failures have their
// own screens (DecodeFailed, TooManyDecodes), so no "working" or error state lives here.
export default function InputForm({
  onSubmit,
  autoFocusHeading,
  initialTitle = "",
  initialPosting = "",
}: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [posting, setPosting] = useState(initialPosting);
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
    if (titleEmpty || postingEmpty) return;
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
        inputProps={{ maxLength: MAX_POSTING }}
        error={touched && postingEmpty}
        helperText={
          touched && postingEmpty
            ? "Paste the job posting."
            : `${posting.length.toLocaleString()} / ${MAX_POSTING.toLocaleString()} characters`
        }
        sx={{ mb: 3 }}
      />

      <Button type="submit" variant="contained">
        Decode this posting
      </Button>

      {/* The framework credit on the input screen too, so every screen carries the
          attribution the prototype shows in its footer (ADR-0009 NFR-9). */}
      <Divider sx={{ my: 3 }} />
      <FrameworkCredit />
    </Box>
  );
}
