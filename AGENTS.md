# Simplfy Maintenance

Simplfy is the owner's private, local-first study workspace published at `harsh.bet/simplfy/`.

## Product Boundary

- Simplfy lives on `main` and publishes under `/simplfy/`.
- Keep sources, classes, canvases, recall cards, and the resume pointer local-first in IndexedDB. Optional Firestore sync resolves a provisioned verified Google session through the canonical shared owner vault.
- Never sync original uploaded file blobs. Sync the extracted study text and rebuild derived briefs on each device.
- Deletions remain tombstones so they propagate across devices without resurrecting stale study material.
- `firestore.rules` is the complete shared `pickledgerpro` ruleset and must stay byte-identical to the sibling private apps.

## Verification

- Never open the deployed site, a browser preview, rendered output, or live URLs. The owner verifies production visually.
- Review source and generated paths as text, and run `npm test`, `npm run typecheck`, and `npm run build` before publishing.
- Run `npm run test:rules` and `npm run check:rules-parity` whenever the shared Firestore rules change.

## Ship every change to harsh.bet

A request to add a feature, fix a bug, or change this app is standing permission to deploy it to the harsh.bet domain in the same session so the owner can see it immediately. Do not stop at local code. Do not wait for a separate commit, push, or deploy ask.

1. Implement and verify from source using this repository's tests, typecheck, and build.
2. Commit on `main` as GitHub user `Harsh4873` (`Harsh4873 <43502626+Harsh4873@users.noreply.github.com>`). Verify with `gh api user` and the commit author. Never invent or switch identity.
3. Keep commit messages and code free of AI fingerprints: no `Co-authored-by:` trailers, no `Made-with: Cursor`, and no Cursor / Codex / Claude / Copilot / ChatGPT / Claude Code taglines, comments, or metadata. If the environment injects a trailer, rewrite the commit with git plumbing (`git commit-tree`) before pushing so GitHub never sees an AI co-author.
4. Push to `origin/main`. That push runs the Pages deployment workflow and publishes to harsh.bet.
5. Confirm the workflow with the GitHub Actions API. Never open the live site or a browser preview to verify — the owner checks production.

Do not force-push to `main`. Leave unrelated dirty files out of the commit. Automated GitHub Actions may still commit as `github-actions[bot]` for scheduled data jobs; human and agent work uses `Harsh4873` only.

## Privacy

This repository deploys publicly. Never write the owner's real name, personal email, home location, account identifiers, or other sensitive details into committed files or commit messages. Refer to "the owner" generically. The GitHub commit identity `Harsh4873` is the only owner reference that belongs in the repository.
