import { APP_LICENSE, FRAMEWORK_ATTRIBUTION } from "../content/licensing";

/**
 * About page. Brings the app license (MIT) and the framework data attribution
 * (CC BY 4.0) together in one place, as required by the foundations epic.
 */
export function AboutPage() {
  return (
    <>
      <h1>About Job Decoder</h1>
      <p>
        Job Decoder reads a job posting against an open standard for tech and
        product work, the Tech Fleet Skills &amp; Practices Framework, and shows
        you the real responsibilities a role expects. It is built to be honest:
        when the framework does not cover a title, the app says so instead of
        guessing.
      </p>

      <section aria-labelledby="privacy-heading">
        <h2 id="privacy-heading">Your privacy</h2>
        <p>
          There is no account and no sign-up. Everything you enter stays in your
          own browser on this device and is never sent to a server. If you clear
          your browser data, the app forgets it, and you start fresh.
        </p>
      </section>

      <section aria-labelledby="app-license-heading">
        <h2 id="app-license-heading">App license</h2>
        <p>{APP_LICENSE.summary}</p>
        <p>
          <a
            href={APP_LICENSE.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            View the source code
          </a>
        </p>
      </section>

      <section aria-labelledby="data-license-heading">
        <h2 id="data-license-heading">Framework data license</h2>
        <p>{FRAMEWORK_ATTRIBUTION.creditLine}</p>
        <ul>
          <li>
            <a
              href={FRAMEWORK_ATTRIBUTION.licenseUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Read the {FRAMEWORK_ATTRIBUTION.licenseName} license
            </a>
          </li>
          <li>
            <a
              href={FRAMEWORK_ATTRIBUTION.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              View the Skills &amp; Practices Framework
            </a>
          </li>
        </ul>
      </section>
    </>
  );
}
