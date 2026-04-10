# GitHub Sync plugin specification

GitHub Sync is a Paperclip plugin for registering one or more GitHub repositories and synchronizing their open issues into Paperclip projects.

## Repository registration

The plugin MUST provide a settings page inside Paperclip where an operator can configure:

- a GitHub token stored as a Paperclip secret reference
- one or more GitHub repository mappings
- the frequency for automatic scheduled sync runs
- a Paperclip project name per mapping where synchronized issues should be created

The settings page MUST allow saving mappings and triggering a manual sync.
- When a manual sync will outlive a quick action response, the worker MUST persist a `running` sync state immediately and complete the sync asynchronously.

## Secret handling

- The raw GitHub token MUST NOT be persisted in plugin state.
- Saving a token from the settings UI MUST create or reuse a company secret through the Paperclip host API.
- The plugin MUST persist only the resulting secret UUID in plugin instance config.
- The worker MUST resolve that secret UUID at runtime via `ctx.secrets.resolve(...)`.

## Synchronization behavior

The plugin MUST persist repository mappings and sync state in plugin state.
- The worker MUST expose at least one data endpoint for reading the current settings and sync status.
- The worker MUST expose action endpoints for saving mappings and triggering a manual sync.
- The `sync.runNow` action SHOULD return the final sync result when it completes quickly, but MUST otherwise return promptly with the saved `running` state instead of waiting long enough to time out the host request.
- The plugin MUST declare a scheduled job that ticks every minute and only performs a scheduled sync when the saved frequency is due.
- The sync flow MUST fetch open GitHub issues from every configured repository.
- The sync flow MUST create one top-level Paperclip issue per imported GitHub issue when the target mapping has a resolved Paperclip project identifier.
- Imported Paperclip issues MUST keep the original GitHub issue title without adding a `[GitHub]` prefix.
- Imported issue descriptions MUST prepend markdown links for the source GitHub issue and any currently linked GitHub PRs, followed by a horizontal rule, SHOULD include the original GitHub body when present, and MUST normalize the GitHub raw HTML constructs that Paperclip cannot render in multiline descriptions.
- Repeated sync runs MUST continue reconciling imported Paperclip issue descriptions against the latest GitHub issue body while preserving the linked GitHub issue reference and refreshing the linked PR references.
- Saving setup MUST persist the current Paperclip host origin so scheduled sync runs can call the local Paperclip label API later.
- When the Paperclip runtime exposes existing issue labels for the target company, the sync flow MUST map GitHub labels onto matching Paperclip labels by name and SHOULD prefer an exact color match when multiple Paperclip labels share the same name.
- When no matching Paperclip label exists and the local Paperclip label API is reachable, the sync flow MUST create the missing Paperclip label using the GitHub label color when available before attaching it to the imported issue.
- Repeated sync runs MUST skip recreating issues that were already imported for the same mapping.
- If the plugin-owned import registry is stale or missing, repeated sync runs MUST repair deduplication by reusing an existing imported Paperclip issue in the mapped project when its description source link matches the GitHub issue URL.
- Repeated sync runs MUST continue reconciling imported Paperclip issue statuses against the latest GitHub state.
- When the local Paperclip host API is available, sync-driven Paperclip status transitions SHOULD go through the same issue-update path Paperclip UI uses so timeline activity is recorded for agents and humans.
- Repeated sync runs MUST continue reconciling imported Paperclip issue labels against the latest mapped GitHub labels, including removing labels that were removed on GitHub.
- An open GitHub issue without a linked PR MUST map to Paperclip `backlog` when it is first imported.
- If an imported Paperclip issue is currently `backlog` and its linked GitHub issue is still open, the sync flow MUST preserve `backlog`; only a manual Paperclip transition may move it out of `backlog`.
- If a Paperclip issue that came from an open GitHub issue without a linked PR is later moved out of `backlog`, the sync flow SHOULD preserve that Paperclip status until another open-issue GitHub rule applies.
- An open GitHub issue with a linked PR that still has unfinished CI jobs MUST map to Paperclip `in_progress`.
- An open GitHub issue with a linked PR that has red CI jobs or unresolved review threads MUST map to Paperclip `todo`.
- An open GitHub issue with a linked PR that has green CI and all review threads resolved MUST map to Paperclip `in_review`.
- A closed GitHub issue completed as finished work MUST map to Paperclip `done`.
- A closed GitHub issue closed as not planned or duplicate MUST map to Paperclip `cancelled`.
- A new GitHub issue comment on an open imported issue MUST move the corresponding Paperclip issue back to `todo`, unless that Paperclip issue is currently `backlog`, in which case it MUST remain `backlog`.
- Whenever the sync flow changes a Paperclip issue status, it MUST add a Paperclip issue comment that explains the old status, the new status, the GitHub condition that caused the transition, and markdown links for the referenced GitHub issue and PRs when applicable.

## Project binding behavior

- Saving a mapping MUST create or reuse the target Paperclip project.
- Saving a mapping MUST bind the GitHub repository URL to the Paperclip project workspace.
- Once a project has been created and linked, its project name field SHOULD be treated as read-only in the settings UI.

## Host integration requirements

- The plugin MUST register successfully in Paperclip.
- The plugin MUST expose a dashboard widget contribution.
- The plugin MUST expose a settings page contribution.
- The dashboard widget MUST summarize the current GitHub sync readiness and link to setup.
- The settings page MUST render inside the real Paperclip host.
- The plugin MUST include end-to-end automation that boots a disposable Paperclip instance, installs the plugin, and verifies the settings page renders.
