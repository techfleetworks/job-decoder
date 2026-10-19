import "./PrivacyBanner.css";

/**
 * Makes the privacy promise visible, as required by the non-functional
 * requirements ("Privacy as a feature"). This is a static statement, not a
 * dismissible cookie notice: the app sets no cookies and keeps all data on the
 * device, so there is nothing to consent to.
 */
export function PrivacyBanner() {
  return (
    <aside className="privacy-banner" aria-label="Privacy summary">
      <span aria-hidden="true" className="privacy-banner__mark">
        🔒
      </span>
      <p className="privacy-banner__text">
        No account needed. Your data stays on your device and never leaves it.
      </p>
    </aside>
  );
}
