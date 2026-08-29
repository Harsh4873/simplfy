Add a new plate by dropping a JSON file in this folder. The app glob-imports every `content/modules/*.json` at build time — no catalog index and no app rewrite.

Each module must follow `StudyModule` in `src/catalog/types.ts`. Required:

- `id` — stable kebab-case; used in search, recall, and related links
- `title`, `dek`, `domain` (`tb` | `stats`)
- `aliases` and `tags` — keyword search hits these first
- `story` — the one-screen explanation
- `deepTitle` + `deep` — the actual math or biology, behind disclosure
- `visual` — a typed figure spec (`kind` is one of the plate renderers)
- `sources` — public/CC material with attribution; do not paste copyrighted books
- `related` — ids of other modules (concept map)
- `example` — worked stepper
- `check` — at least one conceptual, one calculation or numeric, and one figure item when possible

Voice: research-grade clarity on the **shelf**. The Learn screens speak more simply: analogy first, then the real term. Flagship tutor scripts live in `src/lesson/overlays.ts` keyed by module id; every other plate still gets Teach / Example / Practice / Say it back / Shelf via `lessonFromModule`.

Cite WHO, NCBI Bookshelf, OpenStax, Wikipedia (CC BY-SA), and original teaching notes.
