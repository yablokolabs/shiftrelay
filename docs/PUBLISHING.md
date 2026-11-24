# Publishing checklist

External actions require the operator's authorization. Nothing here is pushed, uploaded or submitted automatically.

## Repository

- [ ] Confirm the GitHub repository is **public** before submitting.
- [ ] Confirm `.env`, `data/`, `artifacts/`, `node_modules/`, `dist/` are untracked.
- [ ] Run a secret scan on the working tree and Git history. The key must never appear.
- [ ] Confirm no owner name or email appears in docs, evidence or exports.
- [ ] Confirm the supplied `assets/logo.png` and `assets/icon.png` are included.
- [ ] Verify a fresh clone can run `npm install`, `cp .env.example .env`, `npm run seed`, `npm run dev`.
- [ ] Add the public repository URL to the submission.

Suggested repository description:

> ShiftRelay — technician-approved support fixes that survive the shift, with Meko shared context and deterministic applicability checks.

Suggested topics: `meko`, `mcp`, `yugabytedb`, `typescript`, `react`, `shared-memory`, `contextcon`.

## Video

- [ ] Under five minutes; target 4:15. See `docs/DEMO.md`.
- [ ] Synthetic cases visibly labeled.
- [ ] No API key, account identity, private transcript or owner email on screen.
- [ ] Show Friday's approval, Monday's fresh-session reuse, a withheld mismatch, and the measured comparison.
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
