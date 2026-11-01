import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { FRAMEWORK_ATTRIBUTION } from "@/content/licensing";

/**
 * The one place the CC BY 4.0 credit line is rendered (T15, ADR-0009 NFR-9).
 * Every screen that shows framework data uses this component. The wording and the
 * link live in src/content/licensing.ts, so the credit stays correct in one place.
 */
export default function FrameworkCredit() {
  return (
    <Typography variant="body2" component="p">
      <Link href={FRAMEWORK_ATTRIBUTION.sourceUrl} rel="noopener noreferrer">
        {FRAMEWORK_ATTRIBUTION.creditLine}
      </Link>
    </Typography>
  );
}
