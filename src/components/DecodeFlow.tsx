"use client";

import { useEffect, useRef, useState } from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Link from "@mui/material/Link";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";
import InputForm from "@/components/InputForm";
import PrepView from "@/components/PrepView";
import Results from "@/components/Results";
import { isBasicRead } from "@/components/resultSummary";
import { decodePosting } from "@/data/decodeClient";
import type { DecodeResultWithPrep } from "@/data/decodeClient";
import { clearScan, loadScan, saveScan } from "@/data/session/sessionStore";
import { isDecodeResult } from "@/domain/decode";

// The decode flow: the input screen, then the result. State is session-only, held in this
// tab and restored from the session store if the page reloads. This is tier-1 presentation;
// it calls /api/decode through the client wrapper and holds no business rules.
export default function DecodeFlow() {
  const [result, setResult] = useState<DecodeResultWithPrep | null>(null);
  const [view, setView] = useState<"results" | "prep">("results");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // True once a decode has shown a result, so returning to the form moves focus to its
  // heading. It stays false on first load, where focus should start at the top of the page.
  const decodedOnce = useRef(false);

  useEffect(() => {
    // Restore the current scan for this tab, but only if it still matches the result
    // shape. A scan saved before a shape change is discarded rather than crashing render.
    const saved = loadScan<unknown>();
    if (isDecodeResult(saved)) setResult(saved as DecodeResultWithPrep);
    else clearScan();
  }, []);

  async function handleSubmit(title: string, posting: string) {
    setWorking(true);
    setError(null);
    const res = await decodePosting(title, posting);
    setWorking(false);
    if (res.ok) {
      decodedOnce.current = true;
      setResult(res.result);
      setView("results");
      saveScan(res.result);
    } else {
      setError(res.error);
    }
  }

  function startOver() {
    setResult(null);
    setView("results");
    setError(null);
    clearScan();
  }

  return (
    <>
      {/* A persistent app bar on every screen (the prototype's header). The brand is a
          non-heading span so the per-screen <h1> stays the page's first heading. */}
      <AppBar position="static" color="primary" elevation={0}>
        <Toolbar>
          <Typography variant="h3" component="span" sx={{ color: "primary.contrastText" }}>
            Hat Check
          </Typography>
        </Toolbar>
      </AppBar>
      <Container component="main" maxWidth="sm">
        <Box sx={{ py: 6 }}>
        {!result ? (
          <InputForm
            onSubmit={handleSubmit}
            working={working}
            error={error}
            autoFocusHeading={decodedOnce.current}
          />
        ) : view === "prep" && result.prepGuide ? (
          <PrepView prepGuide={result.prepGuide} basicRead={isBasicRead(result)} onBack={() => setView("results")} />
        ) : (
          <Results
            result={result}
            onStartOver={startOver}
            onPrepare={result.prepGuide ? () => setView("prep") : undefined}
          />
        )}
      </Box>
      <Box component="footer" sx={{ pb: 4 }}>
        <Link component={NextLink} href="/about">
          License and attribution
        </Link>
      </Box>
      </Container>
    </>
  );
}
