"use client";

import { useEffect, useRef } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

interface Props {
  message: string;
  onBack: () => void;
}

// The "Too many decodes" screen (prototype screen 20), shown when the decode route returns a
// 429 from the rate limiter (ADR-0043). Focus moves to the heading on mount so a screen-reader
// user hears why the decode did not run.
export default function TooManyDecodes({ message, onBack }: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);
  return (
    <Box>
      <Typography variant="h1" gutterBottom tabIndex={-1} ref={headingRef}>
        Too many decodes
      </Typography>
      <Alert severity="warning" sx={{ mb: 3 }}>
        {message}
      </Alert>
      <Typography variant="body1" sx={{ mb: 3 }}>
        You have run several decodes in a short time. Wait a little, then try again.
      </Typography>
      <Button variant="contained" onClick={onBack}>
        Back to the form
      </Button>
    </Box>
  );
}
