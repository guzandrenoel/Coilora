# Coilora Brand Assets and Startup Animation

## 1. Selected logo direction

The selected Coilora emblem combines a calm serpent forming the letter **C** with an open book. Its dark blue and mint palette should communicate focus, continuity, learning, memory, and medicine without appearing dangerous or clinical.

Current raster source files:
![[coilora_logo_v1.png]]
-  — transparent-background version.

![[coilora_logo_whitebg.png]]

-  — white-background version.

These PNGs are source references, not the preferred production animation format. Before implementation, create a cleaned vector master and confirm that Coilora may use the artwork commercially.

## 2. Required production assets

Maintain one authoritative vector master and derive the following assets from it:

- Transparent SVG emblem.
- Light-background and dark-background logo variants.
- Static application icon exports at all platform-required sizes.
- Single-color version for very small or constrained uses.
- Animated-startup SVG with separately addressable layers.
- Reduced-motion static startup variant.

The vector should separate and name these elements:

- `snake-body`
- `book-outline`
- `page-lines`
- `bookmark`
- `eye`
- `tongue`
- `lower-swoosh`

If an original SVG is unavailable, use the free and open-source Inkscape application to trace and manually clean the artwork. Manual curve cleanup is required because automatic tracing can preserve soft PNG edges, create excessive path points, and distort gradients.

## 3. Recommended startup sequence

The motion concept is **knowledge forming**. The animation should feel calm, polished, and purposeful.

| Time | Motion |
|---|---|
| 0–200 ms | The emblem fades in with a subtle scale from approximately 96% to 100%. |
| 100–650 ms | The serpent is revealed clockwise, forming the large C. |
| 300–750 ms | The open-book outline draws into place. |
| 550–850 ms | The three mint page lines write themselves in. |
| 650–950 ms | The bookmark drops a short distance and settles softly. |
| 850–1050 ms | The tongue flicks once; the eye may fade in subtly. |
| 1050–1350 ms | The completed emblem settles and crossfades into the application. |

The startup may display the **Coilora** wordmark below the emblem. Do not include the tagline in the animated startup because it adds visual and reading time. The tagline remains appropriate for the landing page, onboarding, and marketing material.

## 4. Motion rules

- Target a total duration of **1.2–1.5 seconds**.
- Never loop the complete startup animation.
- Do not use rotation, large bouncing, dramatic glow, or aggressive snake movement.
- Play it only during a cold start or the first application load in a session, not during ordinary navigation.
- Do not delay access merely to finish branding. Load account and library data behind the animation and transition as soon as the first useful screen is ready.
- If loading continues after the logo finishes, replace it with a small, accessible progress state.
- Preserve the same logo size, position, and background through the transition to avoid a visible flash.
- Test the mark at 256 px, 128 px, and 64 px in addition to full-screen startup sizes.

## 5. Web implementation

Use an inline, layered SVG controlled by a small React startup component. Prefer SVG and CSS animations for the first implementation because they are lightweight, free, open standards and require no animation service.

Recommended techniques:

- Use an SVG mask that follows the serpent's centerline to reveal the filled snake body.
- Use `stroke-dasharray` and `stroke-dashoffset` for the book outline and page-line drawing effects.
- Use `transform` and `opacity` for the logo entrance, bookmark drop, tongue flick, and final transition.
- Animate compositor-friendly properties and avoid triggering page layout on every frame.
- Mount the startup as a fixed overlay above the application shell, then remove it from the DOM after its exit transition.
- Use session state so it does not replay after every route change.
- Keep the application usable if the animation or SVG fails to load.

The startup animation must respect `prefers-reduced-motion`. In reduced-motion mode, show the completed static emblem with a brief opacity transition or no motion at all.

## 6. Native iPad and iPhone implementation

iOS and iPadOS display a system launch screen while the application starts. Keep that screen static, simple, and visually aligned with the first application view. Run the Coilora animation in the first SwiftUI view after the system replaces the launch screen.

```text
Static system launch screen
            ↓
Animated Coilora startup view
            ↓
Restored student library, reader, or onboarding screen
```

The native implementation should reuse the same timing and layer names as the web version. It may use SwiftUI path, trim, opacity, and transform animations, or a reviewed open animation format if the SVG cannot be reproduced faithfully. Restore the student's previous application state instead of always sending returning users to a generic home screen.

## 7. Acceptance criteria

- The emblem is crisp on standard and high-density displays.
- The web animation completes within 1.5 seconds under ordinary conditions.
- The student is not forced to watch it during every navigation or refresh.
- The transition does not flash between different backgrounds or logo positions.
- Reduced-motion users receive a static or minimal-motion experience.
- Keyboard focus and screen-reader navigation are not trapped by the overlay.
- The animated screen does not conceal an application error indefinitely.
- The logo remains recognizable when animation is unavailable.
- The iOS system launch screen and first SwiftUI frame appear continuous.

## 8. Later optional formats

If a motion designer later supplies a Lottie-compatible file, it can be evaluated as an alternative export. It must preserve the open-source dependency policy, render consistently across target platforms, remain small enough for startup use, and provide a reduced-motion fallback. The baseline implementation does not require Lottie, Rive, After Effects, or a paid animation service.

## References

- [Apple Human Interface Guidelines: Launching](https://developer.apple.com/design/human-interface-guidelines/launching)
- [Apple: Specifying your app's launch screen](https://developer.apple.com/documentation/Xcode/specifying-your-apps-launch-screen)
- [MDN: prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
- [Inkscape](https://inkscape.org/)
