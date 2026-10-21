# English Path — working MVP v0.1

**A real, mobile-first English learning website**, not only a design package. Seven B1→B2 starter lessons, vocabulary and phrases, exercises, speaking/writing self-check, spaced repetition, local storage and JSON backup import/export. No API keys, accounts or paid services.

## Quick start

This release is a **dependency-free static website**. It does not need React, Vite, npm install, a backend or a database server to publish.

To run locally (Python 3 available):

```bash
python3 -m http.server 4173 --directory web
```

Open `http://localhost:4173/` in your browser. **Do not open `web/index.html` using `file://`** because it loads lesson JSON by HTTP.

To run validation + unit tests (Node.js 20+):

```bash
npm test
```

## Publish on GitHub Pages

1. Create a **new, empty** repository, suggested name `english-path`. Do not replace or delete an existing repository.
2. Upload **the contents of this package** into the repository root. Preserve `.github/workflows/pages.yml` and `web/.nojekyll`.
3. In repository **Settings → Pages**, set publishing source to **GitHub Actions**.
4. The included workflow runs tests and publishes the contents of `web/` whenever `main` is updated.
5. Confirm the GitHub Actions deployment is green and open the URL from the Pages settings. For `english-path` it will normally resemble `https://USERNAME.github.io/english-path/`.

No Vite `base` setting is needed in this version: all assets are relative URLs (`./`). GitHub Pages should be able to serve them from a subdirectory.

For publishing instructions and safety checklist for ChatGPT Work, see **[`WORK_HANDOFF.md`](WORK_HANDOFF.md)**.

## Project structure

```text
web/                         # Site deployed to GitHub Pages
  index.html, style.css
  js/app.mjs                 # Screens, user interactions
  js/engine.mjs              # Pure learning, backup/review logic
  js/storage.mjs             # IndexedDB schema v1
  js/content.mjs             # Load + verify lessons
  content/manifest.json
  content/lessons/L001–L007.json
.github/workflows/pages.yml # Automated tests + deploy
tests/engine.test.mjs        # Node built-in tests
docs/                        # MVP and future architecture
WORK_HANDOFF.md              # Instructions for Work
```

## User data and privacy

- Progress is stored **only on the current device/browser**, in IndexedDB. There is no sync between devices.
- User drafts are stored locally, not uploaded to GitHub or third-party servers.
- Browser data can be deleted. **Export a backup** in the Progress screen before clearing storage or changing devices.
- Imported backups merge by stable record IDs and latest `updatedAt`. No record is deleted; newer backed-up records may replace existing versions after confirmation.
- Never commit exported personal backup files to the public repo.

## Scope and limitations

- The first seven lessons are **draft learning content**. They do not demonstrate an actual B2 certification or level assessment.
- **Audio is not included.** Dialogue comprehension is text-only, not true listening practice. No fake play controls.
- Speaking and writing are **self-assessed**. The app does not recognise speech or grade free-form answers.
- Simple review intervals follow +1, +3, +7, +14, +30 days as appropriate, not a researched adaptive model.
- This is a small functional MVP built with **native browser modules rather than the React/Vite/Dexie stack proposed in the earlier design**. The content format, stable IDs, separated engine and indexed local data allow React to be adopted in a later version without rewriting the lessons. Do not migrate during first publication unless there is a clear reason.

## Future scope

1. Human-reviewed audio and listening exercises
2. Better retrieval practice and feedback
3. More lessons after lesson 7
4. Optional React/TypeScript migration if complexity warrants it
5. Optional AI features after privacy and cost review

No private user identity, work history or other personal facts are embedded in the source.
