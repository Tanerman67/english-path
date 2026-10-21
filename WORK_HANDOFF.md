# WORK HANDOFF — Publish English Path MVP v0.1 to GitHub

**For ChatGPT Work. Instructions are intentionally detailed so publishing is safe and verifiable.**

## Outcome

Publish the attached `English_Path_Work_Ready.zip` as a **new standalone GitHub repository** with a working GitHub Pages website. This zip includes the COMPLETE SOURCE TREE, not a zip to commit as-is. Do not connect it to My Rhythm.

## Source and target

- Input: extract the attached ZIP (do not upload ZIP alone).
- Default suggested repository name: `english-path`.
- Default main branch: `main`.
- Repository visibility: `Public` is needed for the straightforward free GitHub Pages path. Ask for explicit approval before making anything public if not already approved in the active Work request.
- The user has not supplied a GitHub repository URL. Use the connected GitHub account in Work; if it cannot create repositories, ask the user to create a new empty repo at `https://github.com/new` and give its URL.
- If repository `english-path` already exists, inspect it; **DO NOT overwrite or delete unrelated content**. Ask before modifying an existing project.

## Critical constraints

1. Never commit API keys, `.env`, backup files, private files, personal user data or credentials. No credentials are needed for this MVP.
2. Preserve `web/content/lessons/L001.json` ... `L007.json`, their IDs, the data schema and existing local storage compatibility. Do not regenerate the curriculum.
3. Do not replace the implementation with a fresh React or Vite scaffold during the initial publishing task. This v0.1 is intentionally a **dependency-free static ESM site** with no build step.
4. Commit the **uncompressed files in the repo root** (`README.md`, `.github/`, `web/`, `tests/`, `docs/`, etc.). Keep paths unchanged.
5. No destructive Git operations (force-push, reset, delete branch, delete repository).
6. Do not claim that audio, automated speaking assessment or full B2 coverage exists. This is a first seven-lesson MVP.

## Work checklist

**A. Inspect source**

- Unpack ZIP. Read `README.md`, `docs/PROJECT_STATUS.md` and `web/js/*.mjs`.
- Confirm `web/index.html`, `web/style.css`, all seven lesson JSONs, `.github/workflows/pages.yml` exist.
- Confirm no secrets or personal user data are inside the files.

**B. Verify before push**

- With Node 20+ run `npm test`; tests should pass without `npm install`.
- Start a static web server rooted at `web/`, e.g. `python3 -m http.server 4173 --directory web`. Do NOT open `index.html` with `file://`.
- Open the app in a browser and test: Home → Learn → L001 → answer its 4 automatic tasks correctly → complete both self-check tasks → Complete lesson. Reload. Completed count must remain 1/7.
- Go to Progress and download a backup. Validate the JSON backup. If safely possible, test restore in a fresh browser profile, not the live data profile.
- Confirm Library search and 390px mobile viewport. Ensure browser console has no relevant errors.
- Check that 13 review cards were scheduled after L001 completion (due the next local calendar day), and that overdue cards remain accessible.
- If bugs are discovered, apply minimal fixes and rerun tests. Report what changed.

**C. GitHub publication**

- Use the user's linked GitHub account and establish/confirm target repository + visibility.
- Create a NEW repo `english-path`, if it does not exist, with `main` as the default branch. Avoid adding a starter README because this package supplies one.
- Push all extracted source files to the root, preserving `.github/workflows/pages.yml`.
- Under repository Settings → Pages, select `GitHub Actions` as the publishing source. The included workflow runs tests and deploys `web/` on pushes to `main`.
- Open Actions and wait for the deployment workflow to finish. If it fails, inspect logs and fix the real cause; do not claim success without a green deployment.

**D. Verify published website**

- Visit the actual Pages URL supplied by GitHub, typically `https://<username>.github.io/english-path/`.
- Confirm the site loads from the repository subpath, with CSS/JS and lesson JSONs, no 404s.
- Verify a lesson opens and navigation across all 5 sections works; check on mobile viewport too.
- Do not expose user's private backup data in the public repo. Work may use isolated test storage for QA.

**E. Report to user**

Give the exact repository link, GitHub Pages link, deployment status, tested functionalities, any limitations, and the commit SHA. If a permission, repository, or public-visibility approval is needed, ask only for the blocking decision. If published site is not verified, explicitly state that rather than claiming success.

## Quick structure

```text
.github/workflows/pages.yml
README.md
WORK_HANDOFF.md
package.json
tests/engine.test.mjs
web/index.html
web/style.css
web/js/app.mjs
web/js/engine.mjs
web/js/storage.mjs
web/js/content.mjs
web/content/manifest.json
web/content/lessons/L001.json ... L007.json
web/favicon.svg
web/.nojekyll
docs/PROJECT_STATUS.md
docs/ORIGINAL_ARCHITECTURE_v0.1.md
```

## Known limits

- Seven starter lessons; not 182 days.
- Audio not present; text-based dialogue practice only.
- Speaking and writing are self-assessed, not AI-graded.
- IndexedDB data are per device/browser, and can be deleted by the browser. Export backups.
- Native HTML/JS/CSS rather than originally suggested React/Vite/Dexie, to publish without dependencies. Components are logically separated for later migration.

## Verified in packaging environment

- Automated Node unit tests: 8 passed on 21 Oct 2026.
- JavaScript syntax: `node --check` passed for all four `.mjs` modules.
- Browser automation: **not verified in packaging environment** due to browser navigation blocked by administrator policy. Browser smoke testing is therefore mandatory in Work before claiming the site is operational.
