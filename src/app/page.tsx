import Image from "next/image";

const workflowSteps = [
  {
    name: "Import",
    description: "Bring lecture PDFs, scanned notes, images, and transcripts into one workspace.",
  },
  {
    name: "Annotate",
    description: "Read closely and add highlights or notes while the original material stays intact.",
  },
  {
    name: "Highlight",
    description: "Review suggested high-value passages and decide what is worth keeping.",
  },
  {
    name: "Understand",
    description: "Ask questions grounded in selected materials and return to the cited source page.",
  },
  {
    name: "Practice",
    description: "Turn useful material into editable cards, quizzes, cloze prompts, and image occlusion.",
  },
  {
    name: "Review",
    description: "Work through a focused queue shaped by recall history, weak topics, and exam timing.",
  },
] as const;

export default function HomePage() {
  return (
    <main>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <header className="site-header">
        <a className="brand" href="#top" aria-label="Coilora home">
          <Image
            className="brand-mark"
            src="/brand/coilora-mark.png"
            width={48}
            height={48}
            priority
            alt=""
          />
          <span>Coilora</span>
        </a>

        <nav aria-label="Primary navigation">
          <a href="#workflow">Workflow</a>
          <a href="#principles">Principles</a>
          <a className="nav-action" href="#early-access">
            Early access
          </a>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy" id="main-content">
          <p className="eyebrow">Built for serious study</p>
          <h1>Shed the overload. Keep what matters.</h1>
          <p className="hero-summary">
            Coilora brings notes, cited explanations, active recall, and review planning into one
            continuous workspace for medical and allied-health students.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="#workflow">
              Explore the workflow
            </a>
            <a className="button button-secondary" href="#principles">
              See the product principles
            </a>
          </div>
          <p className="status-line">
            <span aria-hidden="true" /> Web-first foundation in development
          </p>
        </div>

        <div className="hero-visual" aria-label="Coilora serpent and book emblem">
          <div className="mark-frame">
            <Image
              className="hero-mark"
              src="/brand/coilora-mark.png"
              width={560}
              height={560}
              priority
              alt="Coilora emblem: a serpent forming the letter C around an open book"
            />
          </div>
        </div>
      </section>

      <section className="workflow-section" id="workflow" aria-labelledby="workflow-title">
        <div className="section-heading">
          <p className="eyebrow">One connected learning loop</p>
          <h2 id="workflow-title">From lecture material to lasting recall</h2>
          <p>
            Every stage keeps a path back to the student&apos;s original source instead of turning
            study material into disconnected output.
          </p>
        </div>

        <ol className="workflow-grid">
          {workflowSteps.map((step, index) => (
            <li key={step.name}>
              <span className="step-number" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3>{step.name}</h3>
              <p>{step.description}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="principles-section" id="principles" aria-labelledby="principles-title">
        <div>
          <p className="eyebrow">Trust by design</p>
          <h2 id="principles-title">The student stays in control.</h2>
        </div>
        <ul>
          <li>Original uploads remain unchanged.</li>
          <li>Suggestions are previews until the student accepts them.</li>
          <li>Explanations and study items retain source citations.</li>
          <li>Students can edit, export, and delete their own work.</li>
        </ul>
      </section>

      <section className="early-access" id="early-access" aria-labelledby="early-access-title">
        <p className="eyebrow">Private beta planned</p>
        <h2 id="early-access-title">Starting with the complete study loop.</h2>
        <p>
          The first release will validate importing, reading, cited understanding, study-item
          creation, and spaced review before native tablet development begins.
        </p>
      </section>

      <footer>
        <a className="brand footer-brand" href="#top" aria-label="Back to the top">
          <Image src="/brand/coilora-mark.png" width={36} height={36} alt="" />
          <span>Coilora</span>
        </a>
        <p>Built around the way students actually study.</p>
      </footer>
    </main>
  );
}
