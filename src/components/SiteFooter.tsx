import { Link } from "react-router-dom";
import { FRAMEWORK_ATTRIBUTION } from "../content/licensing";
import "./SiteFooter.css";

/**
 * Site-wide footer. Carries the required CC BY 4.0 attribution for the
 * framework data on every page, reading it from the single licensing source.
 */
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <p className="site-footer__attribution">
          {FRAMEWORK_ATTRIBUTION.creditLine}{" "}
          <a
            href={FRAMEWORK_ATTRIBUTION.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            View the framework
          </a>
        </p>
        <p className="site-footer__links">
          <Link to="/about">About &amp; licenses</Link>
        </p>
      </div>
    </footer>
  );
}
