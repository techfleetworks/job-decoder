import { Link } from "react-router-dom";

/**
 * Landing page. Phase 0 ships the explainer and the privacy promise only; the
 * title + job-description flow arrives in later phases and will mount here.
 */
export function HomePage() {
  return (
    <>
      <h1>See what a job really expects</h1>
      <p>
        Paste a job posting and Job Decoder shows you the real
        responsibilities behind the title: the ones it names, the ones it
        expects but left out, and the ones that do not usually belong. Then it
        shows you how to prove you can do them on your resume.
      </p>
      <p>
        Every answer is grounded in the Tech Fleet Skills &amp; Practices
        Framework, an open standard, so you get facts about the role instead of
        guesses.
      </p>

      <section aria-labelledby="whats-here">
        <h2 id="whats-here">What is ready now</h2>
        <p>
          This is an early build. The job-matching tools are on the way. For
          now you can read how the app works and what it does with your data.
        </p>
        <p>
          <Link to="/about">Read about the app and its licenses</Link>
        </p>
      </section>
    </>
  );
}
