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
import TooManyDecodes from "@/components/TooManyDecodes";
import DecodeFailed from "@/components/DecodeFailed";
import Reading from "@/components/Reading";
import { isBasicRead } from "@/components/resultSummary";
import { decodePosting } from "@/data/decodeClient";
import type { DecodeFailReason, DecodeResultWithPrep } from "@/data/decodeClient";
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
  const [errorReason, setErrorReason] = useState<DecodeFailReason | null>(null);
  // The last submitted input, so a cancelled decode can restore the form with it filled in.
  const [submitted, setSubmitted] = useState({ title: "", posting: "" });
  // Bumped to remount InputForm so it re-seeds from `submitted` (after cancel or start over).
  const [formKey, setFormKey] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Restore the current scan for this tab, but only if it still matches the result
    // shape. A scan saved before a shape change is discarded rather than crashing render.
    const saved = loadScan<unknown>();
    if (isDecodeResult(saved)) setResult(saved as DecodeResultWithPrep);
    else clearScan();
  }, []);

  async function handleSubmit(title: string, posting: string) {
    setSubmitted({ title, posting });
    setWorking(true);
    setError(null);
    setErrorReason(null);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await decodePosting(title, posting, controller.signal);
      // Cancelled while the request was in flight but before it aborted: drop the result so a
      // cancelled decode can never land on the screen (no race with cancel()).
      if (controller.signal.aborted) return;
      setWorking(false);
      if (res.ok) {
        setResult(res.result);
        setView("results");
        saveScan(res.result);
      } else {
        setError(res.error);
        setErrorReason(res.reason);
      }
    } catch (err) {
      // A cancel re-throws AbortError; the cancel handler already reset working and will
      // restore the form, so there is nothing to do. Any other throw is a real failure.
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        setWorking(false);
        setError("We could not reach the decoder. Check your connection and try again.");
        setErrorReason("error");
      }
    }
  }

  function cancel() {
    abortRef.current?.abort();
    setWorking(false);
    setFormKey((k) => k + 1); // remount InputForm, seeded with the submitted input
  }

  function startOver() {
    setResult(null);
    setView("results");
    setError(null);
    setErrorReason(null);
    setSubmitted({ title: "", posting: "" });
    setFormKey((k) => k + 1);
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
          working ? (
            <Reading onCancel={cancel} />
          ) : errorReason === "rate-limited" ? (
            <TooManyDecodes message={error ?? ""} onBack={startOver} />
          ) : errorReason === "error" ? (
            <DecodeFailed message={error ?? ""} onRetry={startOver} />
          ) : (
            <InputForm
              key={formKey}
              onSubmit={handleSubmit}
              autoFocusHeading={formKey > 0}
              initialTitle={submitted.title}
              initialPosting={submitted.posting}
            />
          )
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
