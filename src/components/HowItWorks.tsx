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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
