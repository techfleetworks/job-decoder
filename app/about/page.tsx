import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";
import { APP_LICENSE, FRAMEWORK_ATTRIBUTION } from "@/content/licensing";
import FrameworkCredit from "@/components/FrameworkCredit";

export default function AboutPage() {
  return (
    <Container component="main" maxWidth="sm">
      <Box sx={{ py: 6 }}>
        <Typography variant="h1" gutterBottom>
          License and attribution
        </Typography>

        <Typography variant="h2" sx={{ mt: 3 }} gutterBottom>
          This app
        </Typography>
        <Typography variant="body1" sx={{ mb: 1 }}>
          {APP_LICENSE.summary}
        </Typography>
        <Link href={APP_LICENSE.sourceUrl} rel="noopener noreferrer">
          View the source code
        </Link>

        <Typography variant="h2" sx={{ mt: 3 }} gutterBottom>
          The framework
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Hat Check is built on the Tech Fleet Skills and Practices Framework, an open
          dataset licensed under {FRAMEWORK_ATTRIBUTION.licenseName}. The credit below
          appears on every screen that shows framework data.
        </Typography>
        <FrameworkCredit />

        <Box sx={{ mt: 4 }}>
          <Link component={NextLink} href="/">
            Back to Hat Check
          </Link>
        </Box>
      </Box>
    </Container>
  );
}
