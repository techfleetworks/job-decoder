import DecodeFlow from "@/components/DecodeFlow";

// The home screen is the decode flow: paste a posting, see the hats. The flow is a client
// component because the state is session-only and lives in the browser (ADR-0011).
export default function HomePage() {
  return <DecodeFlow />;
}
