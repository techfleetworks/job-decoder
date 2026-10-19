import { NavLink, Outlet } from "react-router-dom";
import { PrivacyBanner } from "../components/PrivacyBanner";
import { SiteFooter } from "../components/SiteFooter";
import "./AppShell.css";

const NAV_ITEMS = [
  { to: "/", label: "Home", end: true },
  { to: "/about", label: "About & licenses", end: false },
];

/**
 * Page frame shared by every route: skip link, header with primary
 * navigation, the privacy promise, the routed page content, and the footer
 * with data attribution. Uses semantic landmarks (header / nav / main /
 * footer) so assistive technology can jump between regions.
 */
export function AppShell() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <header className="app-header">
        <div className="app-header__inner">
          <NavLink to="/" className="app-header__brand" end>
            Job Decoder
          </NavLink>
          <nav aria-label="Primary">
            <ul className="app-nav">
              {NAV_ITEMS.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      isActive ? "app-nav__link is-active" : "app-nav__link"
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <PrivacyBanner />

      <main id="main-content" className="app-main" tabIndex={-1}>
        <div className="app-main__inner">
          <Outlet />
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
