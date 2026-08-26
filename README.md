# Simplfy

A visual study studio for turning hard statistical and biological ideas into **research-grade** explanations — figures first, then the actual math or biology, then a check.

Simplfy is built for a computational-genomics / *Mycobacterium tuberculosis* working memory: likelihoods and hierarchical models on one rail, *rpoB* numbering and gDST catalogues on the other. “Simplify” here means *clarity*, not baby-talk.

The app is a static Vite + React + TypeScript site. There is **no backend, no account, and no Firebase**. The local library (uploads, pastes, recall misses) lives in **IndexedDB on this browser / this device**. Refresh keeps it; another machine does not.

Live path on GitHub Pages: `https://<user>.github.io/simplfy/` (base `/simplfy/`).

## Product model

Three panes, one job:

1. **Intake** — drop PDFs and text files, paste a paragraph, or type a keyword. Search covers bundled plates *and* the local library.
2. **Canvas** — a scientific plate (SVG diagram or grid) plus a tight story. Progressive disclosure opens the real likelihood / the real gene. Sources are listed; copyrighted textbooks are not dumped.
3. **Check** — conceptual, calculation, and “what does this figure mean” items with immediate why-feedback. Misses become a **recall deck**.

Serious extras that belong in a studio, not a quiz app:

- **Concept map** of related plates
- **Worked-example stepper**
- **Local recall deck**

## Bundled knowledge

First-wave modules live in [`content/modules/`](content/modules/) as JSON. The app glob-imports every file in that folder at build time. Add a module by dropping a new JSON file that matches `StudyModule` in `src/catalog/types.ts` — see [`content/README.md`](content/README.md). No app rewrite.

Seed coverage:

- **TB** — organism / envelope, pathogenesis, diagnosis, first-line HRZE (and the 4-month HPMZ update), rifampin/*rpoB*, major second-line / BPaLM, resistance as a genetic object, WGS-as-DST
- **Stats** — likelihood and estimators, LRT, OLS/GLM, Bayesian updating, hierarchical / partial pooling

Teaching notes are original. Public/CC sources (OpenStax, Wikipedia CC BY-SA, NCBI Bookshelf, WHO open TB materials) are attributed on each plate.

## Run locally

```bash
npm install
npm test
npm run typecheck
npm run dev
```

Production build (Pages base path is already `/simplfy/`):

```bash
npm run build
npm run preview
```

Preview serves at `/simplfy/`.

## Persistence

| What | Where |
| --- | --- |
| Bundled plates | `content/modules/*.json` in the static build |
| Uploaded files + extracted text | IndexedDB `simplfy` / `library` |
| Recall misses | IndexedDB `simplfy` / `recall` |
| Last open plate | IndexedDB `simplfy` / `prefs` |

Clearing site data in the browser wipes the library. There is no sync.

## Deploy

GitHub Actions (`.github/workflows/ci.yml`) runs `npm test`, `npm run typecheck`, and `npm run build` on pull requests. Pushes to `main` also upload the `dist` artifact and deploy **GitHub Pages**.

In the repo: **Settings → Pages → Source: GitHub Actions**.
