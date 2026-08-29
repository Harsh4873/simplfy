# Simplfy

A study buddy for hard statistical and biological ideas. Not a chatbot: a **workbook**. Each topic is a six-step lesson — analogy and plain speech, a worked problem, practice you actually do, “say it back in your own words,” the dense reference shelf, then papers.

Simplfy is built for a computational-genomics / *Mycobacterium tuberculosis* working memory: likelihoods and hierarchical models on one path, *rpoB* numbering and gDST catalogues on the other.

The app is a static Vite + React + TypeScript site. There is **no backend, no account, and no live model**. The local library (uploads, pastes, recall misses) lives in **IndexedDB on this browser / this device**. Refresh keeps it; another machine does not.

Live: [harsh.bet/simplfy](https://harsh.bet/simplfy/) (GitHub Pages, base `/simplfy/`).

## How a session works

1. **Teach** — analogy first, then simple words, then the figure, then the traps.
2. **Example** — one worked problem, step by step (or show all).
3. **Practice** — two or three checks, with a scratch box. Misses become recall cards.
4. **Say it back** — write it in your own words, then reveal a model answer.
5. **Shelf** — the original research-grade notes, formulas, sources, concept map.
6. **Papers** — Ioerger first when he wrote on it, then the field, then explainers.

Eight flagship topics have a full tutor script (LRT, likelihood, foundations, Bayes, OLS/GLM, hierarchical models, rifampin/*rpoB*, granuloma, plus WGS-as-DST). Every other plate still gets the same six steps; the tutor layer is derived from the catalogue so you never start on a wall of jargon.

Pages:

- **Home** — how a session works, pinned decks/classes/papers only, guided lessons, stats/TB paths
- **Sources** — three tabs: **Decks** (paste or drop markdown), **Classes** (drop a folder pack), **Papers** (PDF or paper markdown, plus catalogue lookup). Pin what you want on Home. Study / Open in Learn from any of them.
- **Learn** — the six-step lesson, separate from filing sources
- **Shelf** — the encyclopedia of every bundled plate
- **Recall** — Quizlet-style flip deck, including a deck per class and per pasted note

Light and dark themes. The toggle is in the header; the choice is stored in `localStorage`.

## Bundled knowledge

Modules live in [`content/modules/`](content/modules/) as JSON. The app glob-imports every file in that folder at build time. Add a module by dropping a new JSON file that matches `StudyModule` in `src/catalog/types.ts` — see [`content/README.md`](content/README.md).

Tutor voice for flagship lessons lives in [`src/lesson/overlays.ts`](src/lesson/overlays.ts). Derived lessons (analogy from figure kind, plain speech from the dek and first story paragraph) are in [`src/lesson/fromModule.ts`](src/lesson/fromModule.ts).

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

Preview serves at `/simplfy/`. Hash routes: `#/learn/stats-lrt/teach`, `#/sources/decks`, `#/sources/classes`, `#/sources/papers`, `#/shelf`, `#/recall`.

## Persistence

| What | Where |
| --- | --- |
| Bundled plates | `content/modules/*.json` in the static build |
| Uploaded files + extracted text | IndexedDB `simplfy` / `library` |
| Recall misses | IndexedDB `simplfy` / `recall` |
| Last open plate / note | IndexedDB `simplfy` / `prefs` |
| Light / dark theme | `localStorage` key `simplfy-theme` |

Clearing site data in the browser wipes the library. There is no sync.

## Deploy

GitHub Actions (`.github/workflows/ci.yml`) runs `npm test`, `npm run typecheck`, and `npm run build` on pull requests. Pushes to `main` also upload the `dist` artifact and deploy **GitHub Pages**.

In the repo: **Settings → Pages → Source: GitHub Actions**.
