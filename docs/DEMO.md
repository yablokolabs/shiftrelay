# Demo

The submission cut is one continuous **2:06** video, well under the five-minute limit. It opens with the 1:08 narrated 1080p explainer, cuts through a 2.4-second handoff card, and ends with the 0:56 genuine Chromium walkthrough at 1080p. All footage uses synthetic printer cases.

| Asset | Length | What it is |
| --- | --- | --- |
| [`docs/demo/shiftrelay-demo.mp4`](demo/shiftrelay-demo.mp4) | **2:06** | Combined submission cut. Narrated explainer, handoff card, then the genuine UI walkthrough with clean captions. |
| [`docs/demo/shiftrelay-walkthrough.mp4`](demo/shiftrelay-walkthrough.mp4) | **0:56** | Standalone genuine Chromium capture at 1440×900. Silent, with the original burned-in captions. |
| [`docs/demo/poster.jpg`](demo/poster.jpg) | — | Poster frame from the gate scene. |

The standalone capture's burned-in captions are clipped at the bottom edge. The combined cut crops that edge, re-sets the captions in a 128px lower third, and keeps the full decision path visible.

All segments use synthetic cases only. No API key, account identity, owner email or private transcript appears on screen.

## Combined timeline

| Time | Segment | What is shown |
| --- | --- | --- |
| 0:00 | Explainer | Six scenes: hook, problem, four-step flow, gate decisions, measured results, close. |
| 1:08 | Handoff | 2.4-second card: **Now, the running console.** |
| 1:10 | Walkthrough | Genuine Chromium console: intake, approval, fresh session, evidence table. |
| 2:06 | End | Final evidence table, then silence. |

## Explainer storyboard

| Time | Chapter | What is shown |
| --- | --- | --- |
| 0:00 | Hook | Friday's P100 handoff, the approved fuser fix, Monday's missing firmware, and the resulting **question**. |
| 0:07 | The problem | Fixes leave with the shift; firmware changes the answer; retrieval is not approval. |
| 0:18 | How it works | Capture → technician approval → fresh-session retrieval → deterministic gate. The gate checks status, version, model and firmware. |
| 0:36 | The gate | Side-by-side synthetic cases: missing firmware asks; a withdrawn fix is withheld even though retrieval returned it. |
| 0:50 | Measured | 16 fresh-session decisions, 8/8 matched expectations, 0 incorrect recommendations, 7/7 control checks. Includes the live withdrawal negative result. |
| 1:01 | Close | Repository and the one-line promise. |

Narration is six short lines, one per scene, spoken locally with Piper (`en_GB-jenny_dioco-medium`, British female) at scene starts. No hosted TTS or external model key is used.

## Production

The video source is in [`video/`](../video/):

- Remotion `4.0.534`, React 18, 1920×1080 at 30 fps.
- Six scenes in `video/src/scenes/`, timed in `video/src/storyboard.tsx`.
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

The submission cut is assembled with ffmpeg from that render and the genuine capture: 2.4-second handoff card, then the walkthrough normalized to 1632×952 inside a 1920×1080 frame, with a 128px lower third for re-set captions. The result is 1920×1080 at 30 fps, H.264 CRF 20, AAC 48 kHz stereo; the walkthrough section carries silent audio so the timeline stays continuous.

## Genuine UI walkthrough

The earlier capture remains useful as proof that the console runs. It shows the actual intake transcript, approval queue, fresh-session decision trace and evidence panel from the seeded build, including the live promotion of the proposed P109 cover fix.

The standalone file preserves the original 1440×900 capture and its burned-in captions. In the combined cut, the clipped caption edge is cropped and the same captions are re-set in a clean lower third at 1080p.

Recording notes:

- Record only the seeded synthetic fixtures. Do not show `.env`, the Meko portal key screen, account identity or any private transcript.
- If approval is recorded live, wait for `memory_promote` confirmation before moving on.
- Keep any recording under 5:00. The delivered combined cut is 2:06.

## Reproduction

```bash
npm run seed
npm run build
npm start          # http://localhost:8787
npm run eval
```

The UI uses hash routes for direct recording: `/#intake`, `/#review`, `/#fresh`, `/#evidence`.
