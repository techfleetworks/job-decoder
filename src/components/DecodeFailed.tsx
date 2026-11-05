"use client";

import { useEffect, useRef } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

interface Props {
  message: string;
  onRetry: () => void;
}

// The "Decode failed" screen (prototype screen 19), shown when the decode could not complete
// (a server or network failure). Focus moves to the heading on mount so a screen-reader user
// hears what happened; "Try again" returns to the input form.
export default function DecodeFailed({ message, onRetry }: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);
  return (
    <Box>
      <Typography variant="h1" gutterBottom tabIndex={-1} ref={headingRef}>
        Decode failed
      </Typography>
      <Alert severity="error" sx={{ mb: 3 }}>
        {message}
      </Alert>
      <Typography variant="body1" sx={{ mb: 3 }}>
        Something went wrong while reading the posting. Nothing was saved. Try again.
      </Typography>
      <Button variant="contained" onClick={onRetry}>
        Try again
      </Button>
    </Box>
  );
}
