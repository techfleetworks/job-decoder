import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";

export default function HomePage() {
  return (
    <Container component="main" maxWidth="sm">
      <Box sx={{ py: 6 }}>
        <Typography variant="h1" gutterBottom>
          Hat Check
        </Typography>
        <Typography variant="body1" sx={{ mb: 3 }}>
          Paste one job posting and see the responsibilities behind the title: the
          ones it names, the ones it expects but leaves out, and the ones that do not
          usually belong. Every answer is grounded in the Tech Fleet Skills and
          Practices Framework.
        </Typography>
        <Typography variant="body2" sx={{ mb: 3 }}>
          The input screen and the decode are built in the next steps. For now this
          page confirms the three-tier app is live on Vercel.
        </Typography>
        <Button variant="contained" disabled>
          Decode a posting (coming soon)
        </Button>
        <Box sx={{ mt: 4 }}>
          <Link component={NextLink} href="/about">
            License and attribution
          </Link>
        </Box>
      </Box>
    </Container>
  );
}
