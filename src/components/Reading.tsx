"use client";

import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";

interface Props {
  onCancel: () => void;
}

// The "Reading" screen (prototype 04), with the "still working" state (04b) after a delay and
// a Cancel. Focus moves to the heading on mount; the status line is a polite live region so a
// screen-reader user hears progress. Cancel aborts the in-flight decode and keeps the input.
const SLOW_AFTER_MS = 8000;

export default function Reading({ onCancel }: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    headingRef.current?.focus();
    const t = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(t);
  }, []);
  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 3 }}>
      <Typography variant="h1" gutterBottom tabIndex={-1} ref={headingRef}>
        Reading the posting
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }} role="status" aria-live="polite">
        <CircularProgress aria-hidden />
        <Typography variant="body1">
          {slow
            ? "Still working. This one is taking a little longer than usual."
            : "Reading the posting against the framework."}
        </Typography>
      </Box>
      <Button variant="outlined" onClick={onCancel}>
        Cancel
      </Button>
    </Box>
  );
}
