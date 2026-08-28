"use client";

import Image from "next/image";
import { useState } from "react";

import styles from "./study-flow-preview.module.css";

type StudyStep = {
  id: "import" | "annotate" | "highlight" | "understand" | "practice" | "review";
  name: string;
  status: string;
  title: string;
  summary: string;
  detailTitle: string;
  detail: string;
  reference: string;
};

const studySteps: readonly StudyStep[] = [
  {
    id: "import",
    name: "Import",
    status: "3 sources ready",
    title: "Bring your study material into one place.",
    summary: "Add a lecture, image, or note and keep each source organized inside its course.",
    detailTitle: "Start with the source",
    detail: "Coilora keeps the original material intact so every later note and answer can point back to it.",
    reference: "PDF · Image · Text",
  },
  {
    id: "annotate",
    name: "Annotate",
    status: "Note saved",
    title: "Write beside the material you are studying.",
    summary: "Keep a thought, definition, or question attached to the exact page where it belongs.",
    detailTitle: "Context stays nearby",
    detail: "Annotations live alongside the source instead of becoming disconnected notes you have to find later.",
    reference: "Lecture 04 · Page 12",
  },
  {
    id: "highlight",
    name: "Highlight",
    status: "Passage selected",
    title: "Keep the passages that deserve your attention.",
    summary: "Mark an important section while the surrounding page remains visible for context.",
    detailTitle: "You decide what matters",
    detail: "Suggested passages remain suggestions until you choose to keep them in your study material.",
    reference: "Lecture 04 · Page 12",
  },
  {
    id: "understand",
    name: "Understand",
    status: "Answer traced",
    title: "Work through a difficult idea with its source in view.",
    summary: "See a focused explanation and retain a clear path back to the supporting page.",
    detailTitle: "Traceable explanations",
    detail: "Answers stay grounded in your uploaded material so you can check the original wording and context.",
    reference: "Based on Lecture 04 · Page 12",
  },
  {
    id: "practice",
    name: "Practice",
    status: "Question prepared",
    title: "Turn what you learned into active recall.",
    summary: "Practice one idea at a time with questions connected to the material they came from.",
    detailTitle: "From reading to recall",
    detail: "Study items preserve their source reference, making it easy to revisit the material after a difficult answer.",
    reference: "1 question · Source attached",
  },
  {
    id: "review",
    name: "Review",
    status: "18 items scheduled",
    title: "Return to the topics that need another pass.",
    summary: "Use a focused queue to revisit difficult material without rereading everything from the beginning.",
    detailTitle: "A calmer review queue",
    detail: "The next review brings together the source, your notes, and the questions that still need attention.",
    reference: "Next review · Tomorrow",
  },
] as const;

function StepVisual({ step }: { step: StudyStep }) {
  if (step.id === "import") {
    return (
      <div className={styles.fileStack} aria-hidden="true">
        <div><span>PDF</span><strong>Cardiac physiology lecture</strong><small>38 pages</small></div>
        <div><span>IMG</span><strong>Conduction pathway diagram</strong><small>1 image</small></div>
        <div><span>TXT</span><strong>Lecture notes</strong><small>Ready to study</small></div>
      </div>
    );
  }

  if (step.id === "understand") {
    return (
      <div className={styles.answerCard} aria-hidden="true">
        <span>Question</span>
        <strong>How does the signal reach the ventricles?</strong>
        <p>The impulse moves through the AV node before continuing along the ventricular conduction system.</p>
        <small>View source · Page 12</small>
      </div>
    );
  }

  if (step.id === "practice") {
    return (
      <div className={styles.practiceCard} aria-hidden="true">
        <span>Practice 01 of 06</span>
        <strong>What delays the cardiac impulse before ventricular contraction?</strong>
        <div><i /> Reveal answer</div>
        <small>Lecture 04 · Page 12</small>
      </div>
    );
  }

  if (step.id === "review") {
    return (
      <div className={styles.reviewCard} aria-hidden="true">
        <span>Today&apos;s review</span>
        <strong>18 items across 3 sources</strong>
        <div><small>Cardiac conduction</small><i><b className={styles.reviewProgressPrimary} /></i></div>
        <div><small>ECG foundations</small><i><b className={styles.reviewProgressSecondary} /></i></div>
        <div><small>Heart sounds</small><i><b className={styles.reviewProgressTertiary} /></i></div>
      </div>
    );
  }

  return (
    <div className={styles.documentPage} aria-hidden="true">
      <div className={styles.documentMeta}><span>Lecture 04</span><span>Page 12 of 38</span></div>
      <strong>Cardiac conduction pathway</strong>
      <i className={styles.lineLong} />
      <i className={styles.lineMedium} />
      {step.id === "highlight" ? (
        <div className={styles.highlightBlock}><i /><i /><i /></div>
      ) : (
        <div className={styles.annotationNote}>The AV node creates a short delay before contraction.</div>
      )}
      <i className={styles.lineLong} />
      <i className={styles.lineShort} />
    </div>
  );
}

export function StudyFlowPreview() {
  const [activeId, setActiveId] = useState<StudyStep["id"]>("import");
  const activeStep = studySteps.find((step) => step.id === activeId) ?? studySteps[0];
  const activeIndex = studySteps.findIndex((step) => step.id === activeStep.id);
  const panelId = "study-step-panel-" + activeStep.id;

  return (
    <section className={styles.explorer} aria-label="Explore the Coilora study workflow">
      <div className={styles.preview}>
        <div className={styles.topBar}>
          <div className={styles.brand}>
            <Image src="/brand/coilora-mark.png" width={34} height={34} alt="" />
            <span>Coilora</span>
          </div>
          <span className={styles.location}>Cardiovascular systems</span>
          <span className={styles.status}>{activeStep.status}</span>
        </div>

        <div
          className={styles.previewBody}
          id={panelId}
          role="tabpanel"
          aria-labelledby={"study-step-tab-" + activeStep.id}
          tabIndex={0}
        >
          <aside className={styles.sidebar}>
            <strong>Study flow</strong>
            {studySteps.map((step) => (
              <button
                className={step.id === activeStep.id ? styles.sidebarActive : undefined}
                key={step.id}
                type="button"
                onClick={() => setActiveId(step.id)}
                aria-pressed={step.id === activeStep.id}
              >
                {step.name}
              </button>
            ))}
          </aside>

          <div className={styles.workspace}>
            <div className={styles.workspaceIntro}>
              <span>{String(activeIndex + 1).padStart(2, "0")} · {activeStep.name}</span>
              <h2>{activeStep.title}</h2>
              <p>{activeStep.summary}</p>
            </div>
            <StepVisual step={activeStep} />
          </div>

          <aside className={styles.detailPanel} aria-live="polite">
            <p>What happens here</p>
            <strong>{activeStep.detailTitle}</strong>
            <span>{activeStep.detail}</span>
            <small>{activeStep.reference}</small>
          </aside>
        </div>
      </div>

      <div className={styles.tabs} role="tablist" aria-label="Study workflow steps">
        {studySteps.map((step, index) => (
          <button
            className={step.id === activeStep.id ? styles.tabActive : undefined}
            id={"study-step-tab-" + step.id}
            key={step.id}
            type="button"
            role="tab"
            aria-selected={step.id === activeStep.id}
            aria-controls={"study-step-panel-" + step.id}
            tabIndex={step.id === activeStep.id ? 0 : -1}
            onClick={() => setActiveId(step.id)}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{step.name}</strong>
          </button>
        ))}
      </div>
    </section>
  );
}
