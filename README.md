# paperclip-github

Paperclip plugin for synchronizing GitHub issues into Paperclip projects.

## Repository layout

This repository now contains a single publishable Paperclip plugin package at the root.

```text
.
├── .github/workflows/
├── scripts/
│   └── e2e/
├── src/
│   └── ui/
├── tests/
├── SPEC.md
├── package.json
└── tsconfig.json
```

## Current status

This plugin currently includes:

- a valid Paperclip plugin manifest
- a dashboard widget UI mounted inside Paperclip for setup and sync readiness
- a worker that persists repository mappings and sync state in plugin state
- a token flow that stores the GitHub credential as a Paperclip company secret and persists only its secret reference in plugin config
- a settings page UI mounted inside Paperclip for configuring GitHub sync
- a configurable automatic sync cadence saved from the settings UI
- a scheduled sync job declaration that checks every minute and runs when the saved cadence is due
- a manual sync action from the settings page
- a global toolbar button for running a full GitHub sync from anywhere in Paperclip
- project and issue toolbar buttons for targeted manual syncs
- GitHub issue fetching through Octokit
- imported issue titles that preserve the original GitHub title text
- imported issue descriptions that keep the synced GitHub body without prepended source metadata
- an issue detail tab that shows GitHub repository, issue, PR, label, and sync metadata
- GitHub label mapping onto Paperclip issue labels, including creating missing Paperclip labels through the local Paperclip API when the host URL is known and re-syncing label changes for already-imported issues
- GitHub issue status mapping onto Paperclip issue statuses, including linked PR CI/review state, closed reasons, and preserving `backlog` for open issues until a human transitions them
- Paperclip comments added whenever the plugin changes an issue status, explaining what changed and why, plus comment annotations that surface GitHub links below those comments
- GitHub issue imports as top-level Paperclip issues to avoid extra hierarchy lookups and rate-limit cost
- sync status reporting in the settings UI
- plugin-owned deduplication so repeated sync runs skip GitHub issues that were already imported, including repairing stale import-registry entries from existing imported issue source links and durable per-issue GitHub link metadata
- reusable end-to-end automation that boots an isolated Paperclip instance, installs the plugin, and verifies the settings UI renders in the real host

## Scripts

- `pnpm build` bundles `src/manifest.ts`, `src/worker.ts`, and `src/ui/index.tsx` into `dist/`.
- `pnpm test` runs the package-level Node tests.
- `pnpm test:e2e` builds the plugin, installs Playwright Chromium if needed, boots an isolated Paperclip instance, installs this plugin, opens the real settings page, and verifies the settings UI renders.
- `pnpm typecheck` runs TypeScript without emitting files.
- `pnpm verify:manual` builds the plugin, boots a Paperclip instance for manual inspection, and opens the plugin settings page in your default browser.

## Publishing

CI runs on pushes and pull requests via GitHub Actions. npm publishing is wired to the `release` workflow and is intended to run from a published GitHub Release after the package version matches the release tag.

To enable publishing, configure npm trusted publishing for this GitHub repository and the `.github/workflows/release.yml` workflow, then publish a GitHub Release whose tag matches `package.json` like `v0.1.2`.

For repeated manual testing, prefer a dedicated local state directory instead of re-entering credentials every run:

```bash
PAPERCLIP_E2E_STATE_DIR="$HOME/.paperclip-dev/github-sync-manual" pnpm verify:manual
```
