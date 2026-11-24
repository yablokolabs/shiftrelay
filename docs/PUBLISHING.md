# Publishing checklist

External actions require the operator's authorization. Nothing here is pushed, uploaded or submitted automatically.

## Repository

- [x] Public repository: <https://github.com/yablokolabs/shiftrelay>.
- [x] `.env`, `data/`, `artifacts/`, `node_modules/`, `dist/` and `video/out/` are untracked.
- [x] Secret scan on the working tree and Git history. The key never appears.
- [x] No owner name or email appears in docs, evidence, exports or Git history.
- [x] Supplied `assets/logo.png` and `assets/icon.png` are included.
- [ ] Verify a fresh clone can run `npm install`, `cp .env.example .env`, `npm run seed`, `npm run dev`.
- [x] Public repository URL added to the submission notes.

Suggested repository description:

> ShiftRelay — technician-approved support fixes that survive the shift, with Meko shared context and deterministic applicability checks.

Suggested topics: `meko`, `mcp`, `yugabytedb`, `typescript`, `react`, `shared-memory`, `contextcon`.

## Video

- [x] Under five minutes: one 2:06 submission cut, combining the 1:08 narrated explainer and the 0:56 genuine UI walkthrough. See `docs/DEMO.md`.
- [x] One continuous video with a handoff card and clean, re-set walkthrough captions; the standalone capture remains as supporting evidence.
- [x] Synthetic cases visibly labeled on every decision card.
- [x] No API key, account identity, private transcript or owner email on screen.
- [x] Shows Friday's approval, Monday's fresh-session question, a withdrawn-fix withhold and the measured comparison.
- [ ] Upload where the operator prefers; paste the link into Devpost.

## Devpost

- [ ] Project name: **ShiftRelay**.
- [ ] Tagline: **The next shift starts with what the last shift learned.**
- [ ] Track: **Never Solve It Twice**.
- [ ] Paste `docs/DEVPOST_PROJECT_STORY.md`.
- [ ] Built with: Meko Context Engine, YugabyteDB (via Meko), MCP, TypeScript, React, Vite, Node.js.
- [ ] Link the public repository and video.
- [ ] Include architecture and measured results.
- [ ] Confirm the special-award shared-memory path is visible in the video and story.

## Verification before submission

```bash
npm test
npm run build
npm run eval
git status --short
grep -rIn --exclude-dir=node_modules --exclude-dir=.git -E 'mko_tkn_[A-Za-z0-9]' . || true
# Separately scan for the private owner name and email without writing them into this repo.
```

The final grep must return nothing.

## Authorization

Do not `git push`, create a public repository, upload a video or submit the Devpost entry without explicit operator approval.
