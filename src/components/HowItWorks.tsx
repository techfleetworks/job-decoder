"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import { HOW_IT_WORKS } from "@/content/howItWorks";
import { BANDS } from "@/domain/decode";

const STRONG = Math.round(BANDS.strong * 100);
const PARTIAL = Math.round(BANDS.partial * 100);

// The "How it works" panel: the numbered decode, in order, in plain language (ADR-0018).
export default function HowItWorks() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="text" onClick={() => setOpen(true)}>
        How it works
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        aria-labelledby="how-it-works-title"
        aria-modal
        scroll="paper"
        maxWidth="sm"
      >
        <DialogTitle id="how-it-works-title">How Hat Check reads a posting</DialogTitle>
        <DialogContent dividers>
          <Box component="ol" sx={{ pl: 3, m: 0 }}>
            {HOW_IT_WORKS.map((step, i) => (
              <Typography component="li" key={i} variant="body2" sx={{ mb: 1.5 }}>
                {step}
              </Typography>
            ))}
          </Box>
          <Typography variant="h3" component="h3" sx={{ mt: 2, mb: 1 }}>
            Verdict bands
          </Typography>
          <Typography variant="body2">
            Strong at {STRONG}% or more, partial at {PARTIAL}% to under {STRONG}%, mismatch under {PARTIAL}%.
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            The framework decides every number and the verdict. The AI only recognizes reworded
            phrases; it changes no number and no verdict.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
