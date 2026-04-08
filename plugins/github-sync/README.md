# github-sync

Paperclip plugin scaffold for building GitHub synchronization workflows.

## Current status

This package is a scaffold focused on:

- a valid Paperclip plugin manifest
- a minimal worker with plugin-backed data and action wiring
- a settings page UI mounted inside Paperclip
- reusable end-to-end automation that boots an isolated Paperclip instance, installs the plugin, and verifies the settings UI renders in the real host

## Available scripts

- `pnpm test` — runs the package-level Node tests.
- `pnpm test:e2e` — installs Playwright Chromium if needed, boots an isolated Paperclip instance, installs this plugin, opens the real settings page, and verifies the scaffold UI renders.
- `pnpm verify:manual` — boots the same disposable Paperclip instance and opens the plugin settings page in your default browser for manual inspection.

## Current package layout

- `src/manifest.ts` - plugin manifest
- `src/worker.ts` - worker logic for scaffold data/action wiring
- `src/ui/index.tsx` - settings page UI scaffold
- `tests/plugin.spec.ts` - package-level tests
- `scripts/e2e/run-paperclip-smoke.mjs` - reusable headless Paperclip + Playwright end-to-end harness
- `scripts/e2e/manual-paperclip-verify.mjs` - disposable manual inspection harness

## Notes

This scaffold intentionally keeps the worker logic minimal so future GitHub sync features can be added incrementally on top of a verified host integration and e2e setup.
