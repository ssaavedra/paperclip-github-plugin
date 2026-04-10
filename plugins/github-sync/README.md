# github-sync

Paperclip plugin for synchronizing GitHub issues into Paperclip.

## Current status

This package now includes:

- a valid Paperclip plugin manifest
- a dashboard widget UI mounted inside Paperclip for setup and sync readiness
- a worker that persists repository mappings and sync state in plugin state
- a token flow that stores the GitHub credential as a Paperclip company secret and persists only its secret reference in plugin config
- a settings page UI mounted inside Paperclip for configuring GitHub sync
- a configurable automatic sync cadence saved from the settings UI
- a scheduled sync job declaration that checks every minute and runs when the saved cadence is due
- a manual sync action from the settings page
- GitHub issue fetching through Octokit
- imported issue titles that preserve the original GitHub title text
- imported issue descriptions that prepend linked GitHub issue and PR references above the synced GitHub body
- GitHub label mapping onto Paperclip issue labels, including creating missing Paperclip labels through the local Paperclip API when the host URL is known and re-syncing label changes for already-imported issues
- GitHub issue status mapping onto Paperclip issue statuses, including linked PR CI/review state, closed reasons, and preserving `backlog` for open issues until a human transitions them
- Paperclip comments added whenever the plugin changes an issue status, explaining what changed and why
- GitHub issue imports as top-level Paperclip issues to avoid extra hierarchy lookups and rate-limit cost
- sync status reporting in the settings UI
- plugin-owned deduplication so repeated sync runs skip GitHub issues that were already imported, including repairing stale import-registry entries from existing imported issue source links
- reusable end-to-end automation that boots an isolated Paperclip instance, installs the plugin, and verifies the settings UI renders in the real host

## Available scripts

- `pnpm build` — bundles `src/manifest.ts`, `src/worker.ts`, and `src/ui/index.tsx` into `dist/`.
- `pnpm test` — runs the package-level Node tests.
- `pnpm test:e2e` — builds the plugin, installs Playwright Chromium if needed, boots an isolated Paperclip instance, installs this plugin, opens the real settings page, and verifies the settings UI renders.
- `pnpm verify:manual` — builds the plugin, boots the same disposable Paperclip instance, and opens the plugin settings page in your default browser for manual inspection.
- `pnpm typecheck` — runs TypeScript without emitting files.

## Current package layout

- `src/manifest.ts` - plugin manifest source, including dashboard/settings UI slots, the scheduled job declaration, and config schema
- `src/worker.ts` - worker logic for persisted mappings, sync state, configurable scheduled sync cadence, GitHub issue fetching, Paperclip label lookup/creation, GitHub-to-Paperclip status reconciliation, and deduplication
- `src/ui/index.tsx` - dashboard widget and settings page UI for token secret creation, mappings, configurable sync cadence, and sync status
- `dist/` - built plugin artifacts consumed by Paperclip
- `tests/plugin.spec.ts` - package-level tests
- `scripts/build.mjs` - package build script powered by esbuild
- `scripts/e2e/run-paperclip-smoke.mjs` - reusable headless Paperclip + Playwright end-to-end harness
- `scripts/e2e/manual-paperclip-verify.mjs` - disposable manual inspection harness

## Notes

The package now has a real build step so `dist/` stays aligned with `src/` before manual verification or plugin installation. The dashboard widget surfaces the current blocker or readiness state and links back to plugin setup. Saving a token validates it against the GitHub API, creates or reuses a company secret, and stores only the returned secret UUID in plugin config. Saving setup now persists both repository mappings, the selected automatic sync cadence, and the current Paperclip host origin so scheduled syncs can call the local Paperclip label API. Scheduled job ticks happen every minute, and the worker skips runs until the saved cadence is actually due. Saving a mapping creates or reuses the target Paperclip project and binds the GitHub repository URL to the project workspace. Manual `Run sync now` requests now return promptly with a persisted `running` state when the sync is long-lived, and the UI keeps polling until the worker writes the final success or failure result. Repeated sync runs keep a plugin-owned import registry so previously imported GitHub issues are skipped instead of being recreated while their Paperclip statuses and mapped label sets continue to reconcile against GitHub issue and linked-PR state. If that registry is stale or missing for a project, the worker now repairs it by reusing existing imported issues whose description source link matches the GitHub issue URL. Imported issues now keep the original GitHub title instead of adding a `[GitHub]` prefix. When GitHub labels match existing Paperclip labels, the worker reuses them and prefers exact color matches when available; if a matching Paperclip label does not exist and the local Paperclip label API is reachable, the worker creates it with the GitHub color before attaching it to the imported issue. Later GitHub label changes now reapply the full mapped label set onto the already-imported Paperclip issue, including label removals. Imported issue descriptions now prepend markdown links for the GitHub issue and any linked PRs, separate that metadata from the body with a horizontal rule, refresh the synced body text whenever it changes on GitHub, and normalize the GitHub raw HTML constructs that Paperclip's multiline description renderer cannot display. Open GitHub issues without linked PRs land in Paperclip backlog on import, and once an open synced issue is in `backlog` the plugin leaves it there until a human moves it, even if new comments arrive or linked PR CI/review state changes. Open issues that are already active still use linked PR CI/review state to drive `todo`/`in_progress`/`in_review`, and closed issues map to `done` or `cancelled`. Whenever the plugin changes a Paperclip issue status, it now prefers the local Paperclip issue update API so Paperclip records the standard status activity entry, and it also leaves a Paperclip comment explaining the transition, the GitHub condition that caused it, and linked references to the GitHub issue or PRs involved. To conserve GitHub API calls and reduce rate-limit pressure, the worker now imports every synced GitHub issue as a top-level Paperclip issue instead of recreating GitHub's nested issue relationships inside Paperclip.
