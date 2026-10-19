import { Link } from "react-router-dom";

/**
 * Honest fallback for unknown routes. Says plainly that the page was not found
 * rather than showing a blank screen.
 */
export function NotFoundPage() {
  return (
    <>
      <h1>Page not found</h1>
      <p>We could not find that page. It may have moved or never existed.</p>
      <p>
        <Link to="/">Go back to the home page</Link>
      </p>
    </>
  );
}
