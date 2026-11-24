# Demo

Target: **4:15**, synthetic cases labeled throughout. The submission video must be under five minutes.

## Storyboard

| Time | Screen | What is shown |
| --- | --- | --- |
| 0:00 | Title / architecture | ShiftRelay, the tagged synthetic fixtures, and the three-role flow: intake → review → fresh session. |
| 0:25 | Intake | Friday's P100 case. Show the transcript, firmware 2.4, prerequisites, and the Meko conversation id. |
| 1:15 | Review queue | The proposed P109 cover fix. Click **Approve and share**. Show the named approver, the promoted shared memory, and the fix artifact. |
| 1:50 | Review evidence | Point out that approval is a human action and that the canonical revision changed. |
| 2:05 | Fresh session | Monday's P100 case, shared-memory arm. Start a new session. Show `recommended`, the 7 checks, retrieval source/memory id, and the distinct conversation id. |
| 2:55 | Withheld case | P109 cutter case against the withdrawn fix. Show `withheld`, the status check, and the stale-retrieval flag if replayed. |
| 3:25 | Mismatch case | P100 firmware 2.3 against the 2.4-only fix. Show `withheld` on firmware. |
| 3:45 | Missing firmware | P100 with no firmware. Show `question`: the app asks instead of guessing. |
| 4:00 | Evidence | 16 fresh-session decisions, 8/8 treatment outcomes, 0 incorrect recommendations, 7/7 control checks, duplicate approval rejected. |
| 4:15 | End | Repo, setup command, and the synthetic-data limitation. |

## Recording notes

- Record only the seeded synthetic fixtures. Do not show `.env`, the Meko portal key screen, account identity, or any private transcript.
- The proposed P109 cover fix exists so the approval action can be recorded live. It is outside the evaluation scenarios.
- If approval is recorded live, wait for `memory_promote` confirmation before moving on.
- Keep the video under 5:00. No decorative footer or powered-by strip appears in the UI.

## Tool status

**VideoWright was not available** in this session (no binary, MCP tool or skill). The fallback is genuine Chromium screen capture plus ffmpeg, with burned-in captions.

- File: `docs/demo/shiftrelay-demo.mp4`
- Duration: **0:56** (1440×900, 30 fps, 2.1 MB, no audio)
- Source: actual UI captures against the local production build, including a live approval that promoted a proposed fix
- Captions: burned in with ffmpeg/ASS; no secrets, owner identity or private data on screen

The current cut is intentionally short. The 4:15 storyboard above can be narrated over the same footage for submission if the operator wants the full timing.

## Reproduction commands

```bash
npm run seed
npm run build
npm start          # http://localhost:8787
npm run eval
```

The UI uses hash routes for direct recording: `/#intake`, `/#review`, `/#fresh`, `/#evidence`.
