# English Path v0.1 — implementation status

Date: 21 October 2026

## Implemented
- Static, mobile-first five-screen website (Home, Learn, Review, Library, Progress)
- Seven starter lessons using the previously prepared lesson content IDs L001–L007
- Four deterministic questions per lesson with correction, two self-assessed tasks per lesson
- Lesson completion logic and persistence
- Vocabulary/phrase review scheduling by local calendar days
- Local IndexedDB storage with stable record keys, schema version 1
- Backup export and validated, confirmation-based non-destructive merge import
- Searchable 91-item library (56 words + 35 phrases)
- Dependency-free automated Node tests
- GitHub Pages workflow using GitHub Actions

## Not implemented, do not claim otherwise
- Real recorded audio or measured listening proficiency
- Speech recognition, auto-graded writing, AI tutoring, login, cloud sync
- Objective CEFR certification
- Complete 182-day B1→B2 course
- React/TypeScript migration, due to choosing lower-complexity static MVP for fast dependable publication

## Publication acceptance criteria
- [ ] Tests pass in GitHub Actions
- [ ] Pages URL loads all seven lessons and static assets (HTTP status 200)
- [ ] All four automatic exercises in each lesson can be answered correctly
- [ ] Self-check tasks allow progress to be completed
- [ ] Completion survives reload and creates 13 review cards per lesson
- [ ] Backup round-trip works in a clean test browser profile
- [ ] Site looks good on a ~390px mobile viewport
- [ ] No user personal data exported into repository

## Caveats
- Import conflict policy is based on `updatedAt` from backups. It is safe for non-deleting merges but local clock changes may influence which record wins. Export a backup before importing.
- Browser privacy modes or storage restrictions can prevent persistence. The app shows a storage error rather than claiming progress was saved.
- Learning content is a first draft; obtain an editorial review before any wider public educational launch.
