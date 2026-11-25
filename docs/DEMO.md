# Demo

The submission cut is one continuous **3:57** video, well under the five-minute limit. It opens with a 1:03 plain-language backstory — a Friday fix, a Monday firmware mismatch, and the gap between a good answer and a safe one. It then runs the 1:01 narrated 1080p technical explainer, a 0:54 narrated architecture chapter with four diagrams, a 2.4-second handoff card, and the 0:56 genuine Chromium walkthrough at 1080p. The explainer and walkthrough carry motion and a music bed; the backstory and architecture chapters reuse that bed. All footage uses synthetic printer cases.

| Asset | Length | What it is |
| --- | --- | --- |
| [`docs/demo/shiftrelay-demo.mp4`](demo/shiftrelay-demo.mp4) | **3:57** | Combined submission cut. Plain-language backstory, technical explainer, four-diagram architecture chapter, handoff card, then the genuine UI walkthrough with clean captions. |
| [`docs/demo/shiftrelay-walkthrough.mp4`](demo/shiftrelay-walkthrough.mp4) | **0:56** | Standalone genuine Chromium capture at 1440×900. Silent, with the original burned-in captions. |
| [`docs/demo/poster.jpg`](demo/poster.jpg) | — | Poster frame from the backstory title card. |

The standalone capture's burned-in captions are clipped at the bottom edge. The combined cut crops that edge, re-sets the captions in a 128px lower third, and keeps the full decision path visible.

All segments use synthetic cases only. No API key, account identity, owner email or private transcript appears on screen.

## Combined timeline

| Time | Segment | What is shown |
| --- | --- | --- |
| 0:00 | Backstory | 1:03 plain-language chapter: a Friday fix, a Monday firmware mismatch, why search is not proof, and the rule. |
| 1:03 | Explainer | 1:01 technical section: the problem, four-step flow, gate decisions, measured results, close. |
| 2:04 | Architecture | 0:54 narrated chapter: system boundaries, Friday approval, Monday fresh session, deterministic gate. |
| 2:58 | Handoff | 2.4-second card: **Now, the running console.** |
| 3:00 | Walkthrough | Genuine Chromium console: intake, approval, fresh session, evidence table. |
| 3:57 | End | Final evidence table, then the music fades. |

## Backstory

Five beats, written for a non-technical viewer:

1. **Title** — the fix worked on Friday; on Monday, it was wrong.
2. **Friday** — a field technician fixes a recurring fuser fault on a P100 at firmware 2.4; a senior technician approves it; the shift ends.
3. **Monday** — a different technician finds the same fault on a P100 running firmware 2.3; Friday's approved fix comes back, but it is scoped to firmware 2.4, so the old adjustment no longer applies.
4. **The gap** — search can find text, but it cannot prove approval, currency or scope.
5. **The rule** — capture, approve, carry, verify; then recommend, ask or withhold.

The chapter is five static 1920×1080 HTML slides rendered in Chromium, with five local Piper narration lines. It reuses the demo's music bed and fades through a 0.45-second black beat into the technical problem chapter.

The old explainer hook is deliberately not used after the backstory. Its synthetic Monday card showed **07:10, firmware not recorded, ask for firmware**, which contradicted the backstory's **08:02, firmware 2.3, withhold the 2.4 fix**. The cut resumes the explainer at **0:07.45**, where the technical problem chapter starts, so the Monday case stays consistent.

## Explainer storyboard

| Time | Chapter | What is shown |
| --- | --- | --- |
| 0:00 | The problem | Fixes leave with the shift; firmware changes the answer; retrieval is not approval. |
| 0:11 | How it works | Capture → technician approval → fresh-session retrieval → deterministic gate. The gate checks status, version, model and firmware. |
| 0:29 | The gate | Side-by-side synthetic cases: missing firmware asks; a withdrawn fix is withheld even though retrieval returned it. |
| 0:43 | Measured | 16 fresh-session decisions, 8/8 matched expectations, 0 incorrect recommendations, 7/7 control checks. Includes the live withdrawal negative result. |
| 0:54 | Close | Repository and the one-line promise. |

The source explainer has six short narration lines, one per scene, spoken locally with Piper (`en_GB-jenny_dioco-medium`, British female) at scene starts. The combined cut uses five of them because the old hook is removed. No hosted TTS or external model key is used.

## Production

The video source is in [`video/`](../video/):

- Remotion `4.0.534`, React 18, 1920×1080 at 30 fps.
- Six scenes in `video/src/scenes/`, timed in `video/src/storyboard.tsx`; the combined cut uses the five from the problem chapter onward.
- Brand palette and supplied logo; no footer, powered-by strip or attribution.
- `video/public/narration.mp3` is the committed voice track; `video/narration.json` holds the script and scene windows.
- Preview stills were reviewed before rendering; the final MP4 is H.264 with AAC audio.

```bash
cd video
npm install
npm run typecheck
npm run stills -- review 5.6 16 34 46 56 64
REMOTION_BROWSER=/path/to/chrome npm run render
```

`REMOTION_BROWSER` is only needed where Remotion cannot download its own browser.

The submission cut is assembled with ffmpeg from the backstory chapter, the updated animated/music base and the architecture chapter. The base resumes at **0:07.45**, skipping the old hook; a 0.45-second black beat carries the first words of the problem narration before the picture cuts in. The assembly then adds the 2.4-second handoff card and the walkthrough normalized to 1632×952 inside a 1920×1080 frame, with a 128px lower third for re-set captions. The result is 1920×1080 at 30 fps, H.264, AAC 48 kHz stereo, normalised to -14 LUFS with a -1 dBTP ceiling.

The backstory chapter uses five 1920×1080 slides and five local Piper lines, then fades through a 0.45-second black beat into the problem chapter. The architecture chapter uses four 1920×1080 slides built from the 1440×810 diagram PNGs, with four local Piper narration lines. Both chapters reuse the updated base's music bed from the walkthrough section. The walkthrough section is no longer silent in the combined cut; the standalone capture remains silent.

## Genuine UI walkthrough

The earlier capture remains useful as proof that the console runs. It shows the actual intake transcript, approval queue, fresh-session decision trace and evidence panel from the seeded build, including the live promotion of the proposed P109 cover fix.

The standalone file preserves the original 1440×900 capture and its burned-in captions. In the combined cut, the clipped caption edge is cropped and the same captions are re-set in a clean lower third at 1080p.

## Architecture chapter

The chapter is four diagrams, each with one spoken explanation:

1. **System architecture** — the three boundaries: console, app and Meko; the app-owned canonical store; the gate's position.
2. **Friday approval** — promote the approved snapshot first, then commit the canonical revision and write the artifact.
3. **Monday fresh session** — a new MCP initialize and conversation retrieve the old fix; the canonical status withholds it.
4. **Deterministic gate** — authority checks, then scope checks; missing firmware asks, mismatches withhold.

Source HTML, SVG and PNG live in [`docs/diagrams/`](diagrams/). The diagrams were produced with Diagram Design 2.6 from the local checkout at `/root/diagram-design`; PNGs were rasterized with headless Chromium because the skill's Playwright-based PNG helper was unavailable. The earlier single-canvas overview remains at [`docs/architecture.svg`](architecture.svg).

Recording notes:

- Record only the seeded synthetic fixtures. Do not show `.env`, the Meko portal key screen, account identity or any private transcript.
- If approval is recorded live, wait for `memory_promote` confirmation before moving on.
- Keep any recording under 5:00. The delivered combined cut is 3:57.

## Reproduction

```bash
npm run seed
npm run build
npm start          # http://localhost:8787
npm run eval
```

The UI uses hash routes for direct recording: `/#intake`, `/#review`, `/#fresh`, `/#evidence`.
