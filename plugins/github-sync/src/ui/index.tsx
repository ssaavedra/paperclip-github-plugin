import React, { useEffect, useState } from 'react';
import { useHostContext, usePluginAction, usePluginData, usePluginToast } from '@paperclipai/plugin-sdk/ui';

interface RepositoryMapping {
  id: string;
  repositoryUrl: string;
  paperclipProjectName: string;
  paperclipProjectId?: string;
  companyId?: string;
}

interface SyncRunState {
  status: 'idle' | 'running' | 'success' | 'error';
  message?: string;
  checkedAt?: string;
  syncedIssuesCount?: number;
  createdIssuesCount?: number;
  skippedIssuesCount?: number;
  erroredIssuesCount?: number;
  lastRunTrigger?: 'manual' | 'schedule' | 'retry';
  progress?: SyncProgressState;
  errorDetails?: SyncErrorDetails;
}

type SyncProgressPhase = 'preparing' | 'importing' | 'syncing';
type SyncConfigurationIssue = 'missing_token' | 'missing_mapping';

interface SyncProgressState {
  phase?: SyncProgressPhase;
  totalRepositoryCount?: number;
  currentRepositoryIndex?: number;
  currentRepositoryUrl?: string;
  completedIssueCount?: number;
  totalIssueCount?: number;
  currentIssueNumber?: number;
  detailLabel?: string;
}

type SyncFailurePhase =
  | 'configuration'
  | 'loading_paperclip_labels'
  | 'listing_github_issues'
  | 'building_import_plan'
  | 'importing_issue'
  | 'syncing_labels'
  | 'syncing_description'
  | 'evaluating_github_status'
  | 'updating_paperclip_status';

interface SyncErrorDetails {
  phase?: SyncFailurePhase;
  configurationIssue?: SyncConfigurationIssue;
  repositoryUrl?: string;
  githubIssueNumber?: number;
  rawMessage?: string;
  suggestedAction?: string;
  rateLimitResetAt?: string;
  rateLimitResource?: string;
}

interface GitHubSyncSettings {
  mappings: RepositoryMapping[];
  syncState: SyncRunState;
  scheduleFrequencyMinutes: number;
  paperclipApiBaseUrl?: string;
  githubTokenConfigured?: boolean;
  totalSyncedIssuesCount?: number;
  updatedAt?: string;
}

interface TokenValidationResult {
  login: string;
}

interface ParsedRepositoryReference {
  owner: string;
  repo: string;
  url: string;
}

type ThemeMode = 'light' | 'dark';
type Tone = 'neutral' | 'success' | 'warning' | 'info' | 'danger';
type TokenStatus = 'required' | 'valid' | 'invalid';

interface ThemePalette {
  text: string;
  title: string;
  muted: string;
  surface: string;
  surfaceAlt: string;
  surfaceRaised: string;
  border: string;
  borderSoft: string;
  inputBg: string;
  inputBorder: string;
  inputText: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  primaryBg: string;
  primaryBorder: string;
  primaryText: string;
  secondaryBg: string;
  secondaryBorder: string;
  secondaryText: string;
  dangerBg: string;
  dangerBorder: string;
  dangerText: string;
  successBg: string;
  successBorder: string;
  successText: string;
  warningBg: string;
  warningBorder: string;
  warningText: string;
  infoBg: string;
  infoBorder: string;
  infoText: string;
  shadow: string;
}

const LIGHT_PALETTE: ThemePalette = {
  text: '#18181b',
  title: '#09090b',
  muted: '#71717a',
  surface: '#ffffff',
  surfaceAlt: '#fafafa',
  surfaceRaised: '#f5f5f5',
  border: '#e4e4e7',
  borderSoft: '#f4f4f5',
  inputBg: '#ffffff',
  inputBorder: '#d4d4d8',
  inputText: '#18181b',
  badgeBg: '#fafafa',
  badgeBorder: '#e4e4e7',
  badgeText: '#3f3f46',
  primaryBg: '#18181b',
  primaryBorder: '#18181b',
  primaryText: '#fafafa',
  secondaryBg: '#ffffff',
  secondaryBorder: '#d4d4d8',
  secondaryText: '#27272a',
  dangerBg: '#fff1f2',
  dangerBorder: '#fecdd3',
  dangerText: '#be123c',
  successBg: '#f0fdf4',
  successBorder: '#bbf7d0',
  successText: '#166534',
  warningBg: '#fffbeb',
  warningBorder: '#fde68a',
  warningText: '#a16207',
  infoBg: '#eff6ff',
  infoBorder: '#bfdbfe',
  infoText: '#1d4ed8',
  shadow: '0 12px 30px rgba(15, 23, 42, 0.05)'
};

const DARK_PALETTE: ThemePalette = {
  text: '#f5f5f5',
  title: '#fafafa',
  muted: '#a1a1aa',
  surface: 'rgba(10, 10, 11, 0.96)',
  surfaceAlt: 'rgba(15, 15, 17, 1)',
  surfaceRaised: 'rgba(19, 19, 24, 1)',
  border: 'rgba(63, 63, 70, 0.92)',
  borderSoft: 'rgba(39, 39, 42, 1)',
  inputBg: 'rgba(15, 15, 17, 1)',
  inputBorder: 'rgba(63, 63, 70, 1)',
  inputText: '#fafafa',
  badgeBg: 'rgba(24, 24, 27, 0.9)',
  badgeBorder: 'rgba(63, 63, 70, 1)',
  badgeText: '#d4d4d8',
  primaryBg: '#f4f4f5',
  primaryBorder: 'rgba(82, 82, 91, 1)',
  primaryText: '#111113',
  secondaryBg: 'rgba(24, 24, 27, 1)',
  secondaryBorder: 'rgba(63, 63, 70, 1)',
  secondaryText: '#e4e4e7',
  dangerBg: 'rgba(69, 10, 10, 0.24)',
  dangerBorder: 'rgba(127, 29, 29, 0.8)',
  dangerText: '#fca5a5',
  successBg: 'rgba(20, 83, 45, 0.16)',
  successBorder: 'rgba(34, 197, 94, 0.25)',
  successText: '#bbf7d0',
  warningBg: 'rgba(146, 64, 14, 0.2)',
  warningBorder: 'rgba(245, 158, 11, 0.24)',
  warningText: '#fcd34d',
  infoBg: 'rgba(29, 78, 216, 0.2)',
  infoBorder: 'rgba(96, 165, 250, 0.24)',
  infoText: '#93c5fd',
  shadow: '0 18px 40px rgba(0, 0, 0, 0.24)'
};

const DEFAULT_SCHEDULE_FREQUENCY_MINUTES = 15;
const SYNC_POLL_INTERVAL_MS = 750;
const MISSING_GITHUB_TOKEN_SYNC_MESSAGE = 'Configure a GitHub token secret before running sync.';
const MISSING_GITHUB_TOKEN_SYNC_ACTION = 'Open settings, add a GitHub token secret, validate it, and then run sync again.';
const MISSING_MAPPING_SYNC_MESSAGE = 'Save at least one mapping with a created Paperclip project before running sync.';
const MISSING_MAPPING_SYNC_ACTION =
  'Open settings, add a repository mapping, let Paperclip create the target project, and then retry sync.';

const EMPTY_SETTINGS: GitHubSyncSettings = {
  mappings: [],
  syncState: {
    status: 'idle'
  },
  scheduleFrequencyMinutes: DEFAULT_SCHEDULE_FREQUENCY_MINUTES
};

function createIdleSyncState(): SyncRunState {
  return {
    status: 'idle'
  };
}

function getLegacySyncConfigurationIssue(syncState: SyncRunState): SyncConfigurationIssue | null {
  if (syncState.status !== 'error' || syncState.errorDetails?.phase !== 'configuration') {
    return null;
  }

  const message = syncState.message?.trim();
  const suggestedAction = syncState.errorDetails?.suggestedAction?.trim();

  if (message === MISSING_GITHUB_TOKEN_SYNC_MESSAGE || suggestedAction === MISSING_GITHUB_TOKEN_SYNC_ACTION) {
    return 'missing_token';
  }

  if (message === MISSING_MAPPING_SYNC_MESSAGE || suggestedAction === MISSING_MAPPING_SYNC_ACTION) {
    return 'missing_mapping';
  }

  return null;
}

function getSyncConfigurationIssue(syncState: SyncRunState): SyncConfigurationIssue | null {
  return syncState.errorDetails?.configurationIssue ?? getLegacySyncConfigurationIssue(syncState);
}

function getDisplaySyncState(
  syncState: SyncRunState,
  setup: {
    hasToken: boolean;
    hasMappings: boolean;
  }
): SyncRunState {
  const configurationIssue = getSyncConfigurationIssue(syncState);
  if (!configurationIssue) {
    return syncState;
  }

  if (configurationIssue === 'missing_token' && setup.hasToken) {
    return createIdleSyncState();
  }

  if (configurationIssue === 'missing_mapping' && setup.hasMappings) {
    return createIdleSyncState();
  }

  return syncState;
}

function getGitHubRateLimitResourceLabel(resource?: string): string | null {
  switch (resource?.trim().toLowerCase()) {
    case 'core':
      return 'REST API';
    case 'graphql':
      return 'GraphQL API';
    case 'search':
      return 'Search API';
    default:
      return resource?.trim() ? `GitHub ${resource.trim()} API` : null;
  }
}

function getActiveRateLimitPause(syncState: SyncRunState, referenceTimeMs = Date.now()): {
  resetAt: string;
  resource?: string;
} | null {
  if (syncState.status !== 'error' || !syncState.errorDetails?.rateLimitResetAt) {
    return null;
  }

  const resetAt = syncState.errorDetails.rateLimitResetAt.trim();
  const resetTimeMs = Date.parse(resetAt);
  if (!Number.isFinite(resetTimeMs) || resetTimeMs <= referenceTimeMs) {
    return null;
  }

  return {
    resetAt,
    ...(syncState.errorDetails.rateLimitResource ? { resource: syncState.errorDetails.rateLimitResource } : {})
  };
}

function getSyncToastTitle(syncState: SyncRunState): string {
  if (getActiveRateLimitPause(syncState)) {
    return 'GitHub sync is paused';
  }

  if (syncState.status === 'running') {
    return 'GitHub sync is running';
  }

  return syncState.status === 'error' ? 'GitHub sync needs attention' : 'GitHub sync finished';
}

function getSyncToastBody(syncState: SyncRunState): string {
  if (syncState.message?.trim()) {
    return syncState.message.trim();
  }

  if (syncState.status === 'running') {
    return 'GitHub sync is running in the background.';
  }

  return 'GitHub sync completed.';
}

function getSyncToastTone(syncState: SyncRunState): 'info' | 'error' | 'success' {
  if (getActiveRateLimitPause(syncState)) {
    return 'info';
  }

  if (syncState.status === 'running') {
    return 'info';
  }

  return syncState.status === 'error' ? 'error' : 'success';
}

const SHARED_PROGRESS_STYLES = `
.ghsync-progress {
  display: grid;
  gap: 10px;
  padding: 14px;
  border-radius: 10px;
  border: 1px solid var(--ghsync-info-border);
  background: var(--ghsync-info-bg);
}

.ghsync-progress--compact {
  gap: 8px;
  padding: 12px;
}

.ghsync-progress__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.ghsync-progress__copy strong {
  display: block;
  font-size: 13px;
  color: var(--ghsync-title);
}

.ghsync-progress__copy span {
  display: block;
  margin-top: 4px;
  color: var(--ghsync-muted);
  font-size: 12px;
  line-height: 1.5;
}

.ghsync-progress__pill {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid var(--ghsync-info-border);
  background: var(--ghsync-surfaceAlt);
  color: var(--ghsync-info-text);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
}

.ghsync-progress__track {
  position: relative;
  overflow: hidden;
  height: 10px;
  border-radius: 999px;
  border: 1px solid var(--ghsync-border-soft);
  background: var(--ghsync-surfaceRaised);
}

.ghsync-progress__fill {
  height: 100%;
  min-width: 12px;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--ghsync-info-border) 0%, var(--ghsync-info-text) 100%);
  transition: width 220ms ease;
}

.ghsync-progress__fill--indeterminate {
  width: 34%;
  animation: ghsync-progress-slide 1.4s ease-in-out infinite;
}

.ghsync-progress__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.ghsync-progress__meta span {
  color: var(--ghsync-muted);
  font-size: 11px;
  line-height: 1.5;
}

@keyframes ghsync-progress-slide {
  0% {
    transform: translateX(-120%);
  }

  100% {
    transform: translateX(320%);
  }
}

@media (max-width: 640px) {
  .ghsync-progress__header,
  .ghsync-progress__meta {
    align-items: stretch;
    flex-direction: column;
  }
}
`;

const PAGE_STYLES = `
.ghsync {
  display: grid;
  gap: 16px;
  color: var(--ghsync-text);
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.ghsync * {
  box-sizing: border-box;
}

.ghsync button,
.ghsync input {
  font: inherit;
}

.ghsync__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.ghsync__header-copy {
  min-width: 0;
}

.ghsync__header-copy h2 {
  margin: 0;
  font-size: 20px;
  line-height: 1.2;
  font-weight: 700;
  color: var(--ghsync-title);
}

.ghsync__header-copy p {
  margin: 8px 0 0;
  max-width: 760px;
  color: var(--ghsync-muted);
  font-size: 13px;
  line-height: 1.55;
}

.ghsync__layout {
  display: grid;
  gap: 16px;
  align-items: start;
  grid-template-columns: minmax(0, 1.45fr) minmax(260px, 0.8fr);
}

.ghsync__card {
  overflow: hidden;
  border-radius: 12px;
  border: 1px solid var(--ghsync-border);
  background: var(--ghsync-surface);
  box-shadow: var(--ghsync-shadow);
}

.ghsync__card-header {
  padding: 16px 18px;
  border-bottom: 1px solid var(--ghsync-border-soft);
}

.ghsync__card-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--ghsync-title);
}

.ghsync__card-header p {
  margin: 6px 0 0;
  color: var(--ghsync-muted);
  font-size: 12px;
  line-height: 1.5;
}

.ghsync__loading,
.ghsync__message {
  margin: 0 18px;
}

.ghsync__loading {
  margin-top: 16px;
  color: var(--ghsync-muted);
  font-size: 12px;
}

.ghsync__message {
  margin-top: 16px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--ghsync-border-soft);
  background: var(--ghsync-surfaceAlt);
  color: var(--ghsync-text);
  font-size: 13px;
  line-height: 1.5;
}

.ghsync__message--error {
  border-color: var(--ghsync-danger-border);
  background: var(--ghsync-danger-bg);
  color: var(--ghsync-danger-text);
}

.ghsync-diagnostics {
  display: grid;
  gap: 10px;
  padding: 14px;
  border-radius: 10px;
  border: 1px solid var(--ghsync-dangerBorder);
  background: var(--ghsync-dangerBg);
}

.ghsync-diagnostics__header {
  display: grid;
  gap: 4px;
}

.ghsync-diagnostics__header strong {
  font-size: 13px;
  color: var(--ghsync-dangerText);
}

.ghsync-diagnostics__header span {
  color: var(--ghsync-muted);
  font-size: 12px;
  line-height: 1.5;
}

.ghsync-diagnostics__grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
}

.ghsync-diagnostics__item,
.ghsync-diagnostics__block {
  display: grid;
  gap: 6px;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid var(--ghsync-dangerBorder);
  background: var(--ghsync-surfaceAlt);
}

.ghsync-diagnostics__label {
  color: var(--ghsync-dangerText);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.ghsync-diagnostics__value {
  color: var(--ghsync-title);
  font-size: 13px;
  line-height: 1.5;
  word-break: break-word;
}

.ghsync-diagnostics__value--code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 12px;
  white-space: pre-wrap;
}

.ghsync__section {
  display: grid;
  gap: 14px;
  padding: 18px;
  border-top: 1px solid var(--ghsync-border-soft);
}

.ghsync__section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.ghsync__section-copy {
  min-width: 0;
}

.ghsync__section-copy h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--ghsync-title);
}

.ghsync__section-copy p {
  margin: 6px 0 0;
  color: var(--ghsync-muted);
  font-size: 12px;
  line-height: 1.5;
}

.ghsync__badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid var(--ghsync-badge-border);
  background: var(--ghsync-badge-bg);
  color: var(--ghsync-badge-text);
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
}

.ghsync__badge--success {
  border-color: var(--ghsync-success-border);
  background: var(--ghsync-success-bg);
  color: var(--ghsync-success-text);
}

.ghsync__badge--warning {
  border-color: var(--ghsync-warning-border);
  background: var(--ghsync-warning-bg);
  color: var(--ghsync-warning-text);
}

.ghsync__badge--info {
  border-color: var(--ghsync-info-border);
  background: var(--ghsync-info-bg);
  color: var(--ghsync-info-text);
}

.ghsync__badge--danger {
  border-color: var(--ghsync-danger-border);
  background: var(--ghsync-danger-bg);
  color: var(--ghsync-danger-text);
}

.ghsync__badge--neutral {
  border-color: var(--ghsync-border);
  background: transparent;
  color: var(--ghsync-muted);
}

.ghsync__badge-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: currentColor;
}

.ghsync__stack,
.ghsync__mapping-list,
.ghsync__side-body,
.ghsync__detail-list {
  display: grid;
  gap: 12px;
}

.ghsync__field {
  display: grid;
  gap: 8px;
}

.ghsync__field label {
  font-size: 12px;
  font-weight: 600;
  color: var(--ghsync-title);
}

.ghsync__input {
  width: 100%;
  min-height: 40px;
  border-radius: 10px;
  border: 1px solid var(--ghsync-input-border);
  background: var(--ghsync-input-bg);
  color: var(--ghsync-input-text);
  padding: 0 12px;
  outline: none;
}

.ghsync__input::placeholder {
  color: var(--ghsync-muted);
}

.ghsync__input:focus {
  border-color: var(--ghsync-border);
}

.ghsync__input[readonly] {
  opacity: 0.78;
}

.ghsync__input:disabled {
  opacity: 0.72;
  cursor: not-allowed;
}

.ghsync__hint,
.ghsync__note,
.ghsync__check span {
  margin: 0;
  color: var(--ghsync-muted);
  font-size: 12px;
  line-height: 1.5;
}

.ghsync__hint--error {
  color: var(--ghsync-danger-text);
}

.ghsync__actions,
.ghsync__section-footer,
.ghsync__connected,
.ghsync__locked,
.ghsync__sync-summary,
.ghsync__mapping-head,
.ghsync__check-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.ghsync__section-footer {
  justify-content: flex-end;
}

.ghsync__connected,
.ghsync__locked,
.ghsync__sync-summary,
.ghsync__check {
  border: 1px solid var(--ghsync-border-soft);
  border-radius: 10px;
  background: var(--ghsync-surfaceAlt);
  padding: 14px;
}

.ghsync__connected strong,
.ghsync__locked strong,
.ghsync__sync-summary strong {
  display: block;
  font-size: 13px;
  color: var(--ghsync-title);
}

.ghsync__connected span,
.ghsync__locked span,
.ghsync__sync-summary span {
  display: block;
  margin-top: 4px;
  color: var(--ghsync-muted);
  font-size: 12px;
  line-height: 1.5;
}

.ghsync__sync-summary--success {
  border-color: var(--ghsync-success-border);
  background: var(--ghsync-success-bg);
}

.ghsync__sync-summary--success strong,
.ghsync__sync-summary--success span {
  color: var(--ghsync-success-text);
}

.ghsync__sync-summary--danger {
  border-color: var(--ghsync-danger-border);
  background: var(--ghsync-danger-bg);
}

.ghsync__sync-summary--danger strong,
.ghsync__sync-summary--danger span {
  color: var(--ghsync-danger-text);
}

.ghsync__sync-summary--info {
  border-color: var(--ghsync-info-border);
  background: var(--ghsync-info-bg);
}

.ghsync__sync-summary--info strong,
.ghsync__sync-summary--info span {
  color: var(--ghsync-info-text);
}

.ghsync__button-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.ghsync__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 0 14px;
  border-radius: 10px;
  border: 1px solid transparent;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.ghsync__button:disabled {
  opacity: 0.55;
  cursor: default;
}

.ghsync__button--primary {
  border-color: var(--ghsync-primaryBorder);
  background: var(--ghsync-primaryBg);
  color: var(--ghsync-primaryText);
}

.ghsync__button--secondary {
  border-color: var(--ghsync-secondaryBorder);
  background: var(--ghsync-secondaryBg);
  color: var(--ghsync-secondaryText);
}

.ghsync__button--danger {
  min-height: 36px;
  border-color: var(--ghsync-dangerBorder);
  background: var(--ghsync-dangerBg);
  color: var(--ghsync-dangerText);
}

.ghsync__mapping-card,
.ghsync__schedule-card,
.ghsync__stat {
  border: 1px solid var(--ghsync-border-soft);
  border-radius: 10px;
  background: var(--ghsync-surfaceRaised);
}

.ghsync__mapping-card {
  display: grid;
  gap: 12px;
  padding: 14px;
}

.ghsync__schedule-card {
  display: grid;
  gap: 12px;
  align-items: start;
  padding: 14px;
  grid-template-columns: minmax(0, 1fr) minmax(180px, 0.8fr);
}

.ghsync__mapping-title strong {
  display: block;
  font-size: 13px;
  color: var(--ghsync-title);
}

.ghsync__mapping-title span {
  display: block;
  margin-top: 4px;
  color: var(--ghsync-muted);
  font-size: 12px;
  line-height: 1.5;
}

.ghsync__mapping-grid {
  display: grid;
  align-items: start;
  gap: 12px;
  grid-template-columns: minmax(0, 1.15fr) minmax(220px, 0.85fr);
}

.ghsync__stats {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.ghsync__schedule-meta {
  display: grid;
  gap: 4px;
}

.ghsync__schedule-meta strong {
  font-size: 13px;
  color: var(--ghsync-title);
}

.ghsync__schedule-meta span {
  color: var(--ghsync-muted);
  font-size: 12px;
  line-height: 1.5;
}

.ghsync__stat {
  display: grid;
  gap: 6px;
  padding: 12px;
}

.ghsync__stat--emphasized {
  border-color: var(--ghsync-danger-border);
  background: var(--ghsync-danger-bg);
}

.ghsync__stat span {
  display: block;
  color: var(--ghsync-title);
  font-size: 12px;
  font-weight: 600;
}

.ghsync__stat strong {
  display: block;
  color: var(--ghsync-title);
  font-size: 20px;
  line-height: 1;
}

.ghsync__stat p {
  margin: 0;
  color: var(--ghsync-muted);
  font-size: 11px;
  line-height: 1.5;
}

.ghsync__side-body {
  padding: 16px 18px;
}

.ghsync__check {
  display: grid;
  gap: 6px;
}

.ghsync__check strong {
  font-size: 12px;
  color: var(--ghsync-title);
}

.ghsync__detail-list {
  padding-top: 2px;
}

.ghsync__detail {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--ghsync-border-soft);
}

.ghsync__detail:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.ghsync__detail-label {
  color: var(--ghsync-muted);
  font-size: 12px;
}

.ghsync__detail-value {
  color: var(--ghsync-title);
  font-size: 12px;
  text-align: right;
}

@media (max-width: 980px) {
  .ghsync__layout,
  .ghsync__schedule-card,
  .ghsync__mapping-grid,
  .ghsync__stats {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 640px) {
  .ghsync__header,
  .ghsync__section-head,
  .ghsync__actions,
  .ghsync__section-footer,
  .ghsync__connected,
  .ghsync__locked,
  .ghsync__sync-summary,
  .ghsync__mapping-head,
  .ghsync__check-top {
    align-items: stretch;
    flex-direction: column;
  }

  .ghsync__button-row {
    width: 100%;
  }

  .ghsync__button {
    flex: 1 1 auto;
  }

  .ghsync__detail {
    display: grid;
    gap: 4px;
  }

  .ghsync__detail-value {
    text-align: left;
  }
}

${SHARED_PROGRESS_STYLES}
`;

const WIDGET_STYLES = `
.ghsync-widget {
  color: var(--ghsync-text);
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.ghsync-widget * {
  box-sizing: border-box;
}

.ghsync-widget a,
.ghsync-widget button {
  font: inherit;
}

.ghsync-widget__card {
  display: grid;
  gap: 14px;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid var(--ghsync-border-soft);
  background: var(--ghsync-surface);
  box-shadow: none;
}

.ghsync-widget__top,
.ghsync-widget__actions {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.ghsync-widget__eyebrow {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ghsync-muted);
}

.ghsync-widget__top h3 {
  margin: 4px 0 0;
  font-size: 16px;
  line-height: 1.25;
  color: var(--ghsync-title);
}

.ghsync-widget__top p {
  margin: 4px 0 0;
  max-width: 440px;
  color: var(--ghsync-muted);
  font-size: 12px;
  line-height: 1.55;
}

.ghsync-widget__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  color: var(--ghsync-muted);
  font-size: 11px;
}

.ghsync-widget__meta-dot {
  width: 3px;
  height: 3px;
  border-radius: 999px;
  background: var(--ghsync-muted);
  opacity: 0.75;
}

.ghsync-widget__stats {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border-top: 1px solid var(--ghsync-border-soft);
  padding-top: 14px;
}

.ghsync-widget__stat,
.ghsync-widget__summary,
.ghsync-widget__message {
  border-radius: 0;
}

.ghsync-widget__stat {
  display: grid;
  gap: 6px;
  padding: 12px;
  border: 1px solid var(--ghsync-border-soft);
  border-radius: 10px;
  background: var(--ghsync-surfaceAlt);
}

.ghsync-widget__stat--emphasized {
  border-color: var(--ghsync-danger-border);
  background: var(--ghsync-dangerBg);
}

.ghsync-widget__stat span {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--ghsync-title);
}

.ghsync-widget__stat strong {
  display: block;
  font-size: 24px;
  line-height: 1;
  color: var(--ghsync-title);
}

.ghsync-widget__stat p {
  margin: 0;
  color: var(--ghsync-muted);
  font-size: 11px;
  line-height: 1.5;
}

.ghsync-widget__summary {
  display: grid;
  gap: 4px;
  padding-top: 2px;
}

.ghsync-widget__summary strong {
  font-size: 13px;
  color: var(--ghsync-title);
}

.ghsync-widget__summary span {
  color: var(--ghsync-muted);
  font-size: 12px;
  line-height: 1.5;
}

.ghsync-widget__message {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--ghsync-danger-border);
  background: var(--ghsync-danger-bg);
  color: var(--ghsync-danger-text);
  font-size: 12px;
  line-height: 1.5;
}

.ghsync-diagnostics {
  display: grid;
  gap: 10px;
  padding: 14px;
  border-radius: 10px;
  border: 1px solid var(--ghsync-dangerBorder);
  background: var(--ghsync-dangerBg);
}

.ghsync-diagnostics__header {
  display: grid;
  gap: 4px;
}

.ghsync-diagnostics__header strong {
  font-size: 13px;
  color: var(--ghsync-dangerText);
}

.ghsync-diagnostics__header span {
  color: var(--ghsync-muted);
  font-size: 12px;
  line-height: 1.5;
}

.ghsync-diagnostics__grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
}

.ghsync-diagnostics__item,
.ghsync-diagnostics__block {
  display: grid;
  gap: 6px;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid var(--ghsync-dangerBorder);
  background: var(--ghsync-surfaceAlt);
}

.ghsync-diagnostics__label {
  color: var(--ghsync-dangerText);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.ghsync-diagnostics__value {
  color: var(--ghsync-title);
  font-size: 13px;
  line-height: 1.5;
  word-break: break-word;
}

.ghsync-diagnostics__value--code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 12px;
  white-space: pre-wrap;
}

.ghsync-widget__actions {
  align-items: center;
  justify-content: space-between;
  padding-top: 2px;
}

.ghsync-widget__button-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.ghsync-widget__link {
  text-decoration: none;
}

.ghsync__badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid var(--ghsync-badge-border);
  background: var(--ghsync-badge-bg);
  color: var(--ghsync-badge-text);
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
}

.ghsync__badge--success {
  border-color: var(--ghsync-success-border);
  background: var(--ghsync-success-bg);
  color: var(--ghsync-success-text);
}

.ghsync__badge--warning {
  border-color: var(--ghsync-warning-border);
  background: var(--ghsync-warning-bg);
  color: var(--ghsync-warning-text);
}

.ghsync__badge--info {
  border-color: var(--ghsync-info-border);
  background: var(--ghsync-info-bg);
  color: var(--ghsync-info-text);
}

.ghsync__badge--danger {
  border-color: var(--ghsync-danger-border);
  background: var(--ghsync-danger-bg);
  color: var(--ghsync-danger-text);
}

.ghsync__badge--neutral {
  border-color: var(--ghsync-border);
  background: transparent;
  color: var(--ghsync-muted);
}

.ghsync__badge-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: currentColor;
}

.ghsync__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 38px;
  padding: 0 14px;
  border-radius: 10px;
  border: 1px solid transparent;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.ghsync__button:disabled {
  opacity: 0.55;
  cursor: default;
}

.ghsync__button--primary {
  border-color: var(--ghsync-primaryBorder);
  background: var(--ghsync-primaryBg);
  color: var(--ghsync-primaryText);
}

.ghsync__button--secondary {
  border-color: var(--ghsync-secondaryBorder);
  background: var(--ghsync-secondaryBg);
  color: var(--ghsync-secondaryText);
}

@media (max-width: 720px) {
  .ghsync-widget__stats {
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
  }

  .ghsync-widget__top,
  .ghsync-widget__actions {
    flex-direction: column;
    align-items: stretch;
  }

  .ghsync-widget__stat {
    padding-left: 0;
    border-left: 0;
  }

  .ghsync-widget__button-row {
    width: 100%;
  }

  .ghsync__button,
  .ghsync-widget__link {
    flex: 1 1 auto;
  }
}

${SHARED_PROGRESS_STYLES}
`;

function createEmptyMapping(index: number): RepositoryMapping {
  return {
    id: `mapping-${index + 1}`,
    repositoryUrl: '',
    paperclipProjectName: ''
  };
}

function getComparableMappings(mappings: RepositoryMapping[]): RepositoryMapping[] {
  return mappings
    .map((mapping, index) => ({
      id: mapping.id.trim() || `mapping-${index + 1}`,
      repositoryUrl: mapping.repositoryUrl.trim(),
      paperclipProjectName: mapping.paperclipProjectName.trim(),
      paperclipProjectId: mapping.paperclipProjectId,
      companyId: mapping.companyId
    }))
    .filter((mapping) => mapping.repositoryUrl !== '' || mapping.paperclipProjectName !== '');
}

function normalizeScheduleFrequencyMinutes(value: unknown): number {
  const numericValue =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value.trim())
        : NaN;

  if (!Number.isFinite(numericValue) || numericValue < 1) {
    return DEFAULT_SCHEDULE_FREQUENCY_MINUTES;
  }

  return Math.floor(numericValue);
}

function parseScheduleFrequencyDraft(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const numericValue = Number(trimmed);
  if (!Number.isFinite(numericValue) || numericValue < 1 || !Number.isInteger(numericValue)) {
    return null;
  }

  return numericValue;
}

function getScheduleFrequencyError(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return 'Enter a whole number of minutes.';
  }

  const numericValue = Number(trimmed);
  if (!Number.isFinite(numericValue) || numericValue < 1 || !Number.isInteger(numericValue)) {
    return 'Enter a whole number of minutes greater than 0.';
  }

  return null;
}

function formatScheduleFrequency(minutes: number): string {
  const normalizedMinutes = normalizeScheduleFrequencyMinutes(minutes);
  return `every ${normalizedMinutes} minute${normalizedMinutes === 1 ? '' : 's'}`;
}

function parseRepositoryReference(repositoryInput: string): ParsedRepositoryReference | null {
  const trimmed = repositoryInput.trim();
  if (!trimmed) {
    return null;
  }

  const slugMatch = trimmed.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?$/);
  if (slugMatch) {
    const [, owner, repo] = slugMatch;
    return {
      owner,
      repo,
      url: `https://github.com/${owner}/${repo}`
    };
  }

  try {
    const url = new URL(trimmed);
    if (url.hostname !== 'github.com' && url.hostname !== 'www.github.com') {
      return null;
    }

    const pathSegments = url.pathname.split('/').filter(Boolean);
    if (pathSegments.length !== 2) {
      return null;
    }

    const [owner, rawRepo] = pathSegments;
    const repo = rawRepo.replace(/\.git$/, '');
    if (!owner || !repo) {
      return null;
    }

    return {
      owner,
      repo,
      url: `https://github.com/${owner}/${repo}`
    };
  } catch {
    return null;
  }
}

function formatProjectNameFromRepository(repositoryInput: string): string {
  const parsedRepository = parseRepositoryReference(repositoryInput);
  const repositoryName = parsedRepository?.repo
    ?? repositoryInput.trim().replace(/\/+$/, '').split('/').pop()?.replace(/\.git$/i, '')
    ?? '';

  if (!repositoryName) {
    return '';
  }

  return repositoryName
    .split(/[-_.]+/)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function shouldAutofillProjectName(mapping: RepositoryMapping): boolean {
  if (mapping.paperclipProjectId) {
    return false;
  }

  const currentProjectName = mapping.paperclipProjectName.trim();
  if (!currentProjectName) {
    return true;
  }

  const previousSuggestedProjectName = formatProjectNameFromRepository(mapping.repositoryUrl);
  return previousSuggestedProjectName !== '' && currentProjectName === previousSuggestedProjectName;
}

function getPaperclipApiBaseUrl(): string | undefined {
  if (typeof window === 'undefined' || !window.location?.origin) {
    return undefined;
  }

  return window.location.origin;
}

function formatDate(value?: string, fallback = 'Never'): string {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }

  return parsed.toLocaleString();
}

function getPluginIdFromLocation(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const parts = window.location.pathname.split('/').filter(Boolean);
  const pluginsIndex = parts.indexOf('plugins');
  if (pluginsIndex === -1 || pluginsIndex + 1 >= parts.length) {
    return null;
  }

  return parts[pluginsIndex + 1] ?? null;
}

function getThemeMode(): ThemeMode {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return 'dark';
  }

  const root = document.documentElement;
  const body = document.body;
  const candidates = [root, body].filter((node): node is HTMLElement => Boolean(node));

  for (const node of candidates) {
    const attrTheme = node.getAttribute('data-theme') || node.getAttribute('data-color-mode') || node.getAttribute('data-mode');
    if (attrTheme === 'light' || attrTheme === 'dark') {
      return attrTheme;
    }

    if (node.classList.contains('light')) {
      return 'light';
    }

    if (node.classList.contains('dark')) {
      return 'dark';
    }
  }

  const colorScheme = window.getComputedStyle(body).colorScheme || window.getComputedStyle(root).colorScheme;
  if (colorScheme === 'light' || colorScheme === 'dark') {
    return colorScheme;
  }

  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function useResolvedThemeMode(): ThemeMode {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => getThemeMode());

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const matcher = window.matchMedia('(prefers-color-scheme: light)');
    const handleChange = () => {
      setThemeMode(getThemeMode());
    };

    handleChange();
    matcher.addEventListener('change', handleChange);

    const observer = new MutationObserver(handleChange);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme', 'data-color-mode', 'data-mode']
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class', 'data-theme', 'data-color-mode', 'data-mode']
    });

    return () => {
      matcher.removeEventListener('change', handleChange);
      observer.disconnect();
    };
  }, []);

  return themeMode;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {})
    },
    credentials: 'same-origin',
    ...init
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(`Paperclip API ${response.status}: ${text || response.statusText}`);
  }

  return body as T;
}

async function resolveOrCreateProject(companyId: string, projectName: string): Promise<{ id: string; name: string }> {
  const projects = await fetchJson<Array<{ id: string; name: string }>>(`/api/companies/${companyId}/projects`);
  const existing = projects.find((project) => project.name.trim().toLowerCase() === projectName.trim().toLowerCase());
  if (existing) {
    return existing;
  }

  return fetchJson<{ id: string; name: string }>(`/api/companies/${companyId}/projects`, {
    method: 'POST',
    body: JSON.stringify({
      name: projectName.trim(),
      status: 'planned'
    })
  });
}

async function bindProjectRepo(projectId: string, repositoryUrl: string): Promise<void> {
  await fetchJson(`/api/projects/${projectId}/workspaces`, {
    method: 'POST',
    body: JSON.stringify({
      repoUrl: repositoryUrl,
      sourceType: 'git_repo',
      isPrimary: true
    })
  });
}

async function resolveOrCreateCompanySecret(companyId: string, name: string, value: string): Promise<{ id: string; name: string }> {
  const existingSecrets = await fetchJson<Array<{ id: string; name: string }>>(`/api/companies/${companyId}/secrets`);
  const existing = existingSecrets.find((secret) => secret.name.trim().toLowerCase() === name.trim().toLowerCase());

  if (existing) {
    return fetchJson<{ id: string; name: string }>(`/api/secrets/${existing.id}/rotate`, {
      method: 'POST',
      body: JSON.stringify({
        value
      })
    });
  }

  return fetchJson<{ id: string; name: string }>(`/api/companies/${companyId}/secrets`, {
    method: 'POST',
    body: JSON.stringify({
      name,
      value
    })
  });
}

function getSyncStatus(syncState: SyncRunState, runningSync: boolean, syncUnlocked: boolean): { label: string; tone: Tone } {
  if (!syncUnlocked) {
    return { label: 'Locked', tone: 'neutral' };
  }

  if (runningSync || syncState.status === 'running') {
    return { label: 'Running', tone: 'info' };
  }

  if (getActiveRateLimitPause(syncState)) {
    return { label: 'Paused', tone: 'warning' };
  }

  if (syncState.status === 'error') {
    return { label: 'Needs attention', tone: 'danger' };
  }

  if (syncState.status === 'success') {
    return { label: 'Ready', tone: 'success' };
  }

  return { label: 'Ready', tone: 'info' };
}

function getToneClass(tone: Tone): string {
  switch (tone) {
    case 'success':
      return 'ghsync__badge--success';
    case 'warning':
      return 'ghsync__badge--warning';
    case 'info':
      return 'ghsync__badge--info';
    case 'danger':
      return 'ghsync__badge--danger';
    default:
      return 'ghsync__badge--neutral';
  }
}

const SETTINGS_INDEX_HREF = '/instance/settings/plugins';

function getStringValue(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function resolvePluginSettingsHref(records: unknown): string {
  if (!Array.isArray(records)) {
    return SETTINGS_INDEX_HREF;
  }

  for (const entry of records) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }

    const record = entry as Record<string, unknown>;
    const manifest = record.manifest && typeof record.manifest === 'object' ? record.manifest as Record<string, unknown> : null;
    const id =
      getStringValue(record, 'id') ??
      getStringValue(record, 'pluginId');
    const key =
      getStringValue(record, 'pluginKey') ??
      getStringValue(record, 'key') ??
      getStringValue(record, 'packageName') ??
      getStringValue(record, 'name') ??
      (manifest ? getStringValue(manifest, 'id') : null);
    const displayName =
      getStringValue(record, 'displayName') ??
      (manifest ? getStringValue(manifest, 'displayName') : null);

    if (id && (key === 'github-sync' || displayName === 'GitHub Sync')) {
      return `${SETTINGS_INDEX_HREF}/${id}`;
    }
  }

  return SETTINGS_INDEX_HREF;
}

function formatSyncProgressRepository(repositoryUrl?: string): string | null {
  if (!repositoryUrl?.trim()) {
    return null;
  }

  const parsed = parseRepositoryReference(repositoryUrl);
  if (parsed) {
    return `${parsed.owner}/${parsed.repo}`;
  }

  return repositoryUrl.trim();
}

function getRunningSyncProgressModel(syncState: SyncRunState): {
  title: string;
  description: string;
  repositoryLabel?: string;
  repositoryPosition?: string;
  issueProgressLabel?: string;
  currentIssueLabel?: string;
  completedIssueCount?: number;
  totalIssueCount?: number;
  percent: number | null;
  indeterminate: boolean;
} | null {
  if (syncState.status !== 'running') {
    return null;
  }

  const progress = syncState.progress;
  const repositoryLabel = formatSyncProgressRepository(progress?.currentRepositoryUrl) ?? undefined;
  const repositoryPosition =
    progress?.currentRepositoryIndex && progress.totalRepositoryCount
      ? `Repository ${progress.currentRepositoryIndex} of ${progress.totalRepositoryCount}`
      : progress?.totalRepositoryCount
        ? `${progress.totalRepositoryCount} ${progress.totalRepositoryCount === 1 ? 'repository' : 'repositories'}`
        : undefined;
  const completedIssueCount =
    typeof progress?.completedIssueCount === 'number' ? Math.max(0, progress.completedIssueCount) : undefined;
  const totalIssueCount =
    typeof progress?.totalIssueCount === 'number' ? Math.max(0, progress.totalIssueCount) : undefined;
  const detailLabel = progress?.detailLabel?.trim() ? progress.detailLabel.trim() : undefined;
  const indeterminate = totalIssueCount === undefined;
  const percent =
    totalIssueCount === undefined
      ? null
      : totalIssueCount === 0
        ? 100
        : Math.max(0, Math.min(100, ((completedIssueCount ?? 0) / totalIssueCount) * 100));
  const currentIssueLabel =
    progress?.currentIssueNumber !== undefined
      ? progress.phase === 'importing'
        ? `Importing GitHub issue #${progress.currentIssueNumber}`
        : progress.phase === 'syncing'
          ? `Syncing GitHub issue #${progress.currentIssueNumber}`
          : `Working on GitHub issue #${progress.currentIssueNumber}`
      : repositoryLabel
        ? `Current repository: ${repositoryLabel}`
        : undefined;

  switch (progress?.phase) {
    case 'importing': {
      const importingIssueProgressLabel =
        totalIssueCount !== undefined
          ? totalIssueCount === 0
            ? 'No issues to process'
            : `Processed ${Math.min(completedIssueCount ?? 0, totalIssueCount)} of ${totalIssueCount} issues`
          : detailLabel;
      return {
        title: repositoryLabel ? `Importing issues from ${repositoryLabel}` : 'Importing GitHub issues',
        description: repositoryLabel
          ? `Creating missing Paperclip issues and repairing existing imports from ${repositoryLabel}.`
          : 'Creating missing Paperclip issues and repairing existing imports.',
        ...(repositoryLabel ? { repositoryLabel } : {}),
        ...(repositoryPosition ? { repositoryPosition } : {}),
        ...(importingIssueProgressLabel ? { issueProgressLabel: importingIssueProgressLabel } : {}),
        ...(currentIssueLabel ? { currentIssueLabel } : {}),
        ...(completedIssueCount !== undefined ? { completedIssueCount } : {}),
        ...(totalIssueCount !== undefined ? { totalIssueCount } : {}),
        percent,
        indeterminate
      };
    }
    case 'syncing': {
      const syncingIssueProgressLabel =
        totalIssueCount !== undefined
          ? totalIssueCount === 0
            ? 'No issues to process'
            : `Processed ${Math.min(completedIssueCount ?? 0, totalIssueCount)} of ${totalIssueCount} issues`
          : detailLabel;
      return {
        title: repositoryLabel ? `Syncing ${repositoryLabel}` : 'Syncing Paperclip issue state',
        description: repositoryLabel
          ? `Updating labels, descriptions, and status for imported issues from ${repositoryLabel}.`
          : 'Updating labels, descriptions, and status for imported issues.',
        ...(repositoryLabel ? { repositoryLabel } : {}),
        ...(repositoryPosition ? { repositoryPosition } : {}),
        ...(syncingIssueProgressLabel ? { issueProgressLabel: syncingIssueProgressLabel } : {}),
        ...(currentIssueLabel ? { currentIssueLabel } : {}),
        ...(completedIssueCount !== undefined ? { completedIssueCount } : {}),
        ...(totalIssueCount !== undefined ? { totalIssueCount } : {}),
        percent,
        indeterminate
      };
    }
    default: {
      const preparingIssueProgressLabel =
        detailLabel ??
        (totalIssueCount !== undefined
          ? totalIssueCount === 0
            ? 'No issues to process'
            : `Found ${totalIssueCount} issues to sync`
          : completedIssueCount !== undefined
            ? `Scanned ${completedIssueCount} GitHub ${completedIssueCount === 1 ? 'issue' : 'issues'} so far`
            : undefined);
      return {
        title: repositoryLabel ? `Preparing ${repositoryLabel}` : 'Preparing GitHub sync',
        description:
          detailLabel ??
          (repositoryLabel
            ? `Calculating how many GitHub issues need to be synced for ${repositoryLabel}.`
            : 'Calculating how many GitHub issues need to be synced.'),
        ...(repositoryLabel ? { repositoryLabel } : {}),
        ...(repositoryPosition ? { repositoryPosition } : {}),
        ...(preparingIssueProgressLabel ? { issueProgressLabel: preparingIssueProgressLabel } : {}),
        ...(currentIssueLabel ? { currentIssueLabel } : {}),
        percent: null,
        indeterminate: true
      };
    }
  }
}

function getSyncMetricCards(params: {
  totalSyncedIssuesCount?: number;
  erroredIssuesCount?: number;
  syncState: SyncRunState;
  savedMappingCount: number;
}): Array<{
  key: string;
  value: number;
  label: string;
  description: string;
  emphasized?: boolean;
}> {
  const totalSyncedIssuesCount = Math.max(0, params.totalSyncedIssuesCount ?? 0);
  const erroredIssuesCount = Math.max(0, params.erroredIssuesCount ?? 0);

  return [
    {
      key: 'total-synced',
      value: totalSyncedIssuesCount,
      label: 'Total issues synced',
      description:
        totalSyncedIssuesCount > 0
          ? 'Across all mapped repositories.'
          : params.savedMappingCount > 0
            ? 'No issues imported yet.'
            : 'Add a repository to start syncing.'
    },
    {
      key: 'errored',
      value: erroredIssuesCount,
      label: 'Issues errored',
      description:
        params.syncState.status === 'running'
          ? erroredIssuesCount > 0
            ? 'Detected so far in this run.'
            : 'No issue errors detected yet.'
          : params.syncState.checkedAt
            ? erroredIssuesCount > 0
              ? 'From the latest sync run.'
              : 'No errors in the latest sync run.'
            : 'No sync run yet.',
      emphasized: erroredIssuesCount > 0
    }
  ];
}

function getDashboardSummary(
  tokenValid: boolean,
  savedMappingCount: number,
  syncState: SyncRunState,
  runningSync: boolean,
  scheduleFrequencyMinutes: number
): { label: string; tone: Tone; title: string; body: string } {
  const cadence = formatScheduleFrequency(scheduleFrequencyMinutes);
  const activeRateLimitPause = getActiveRateLimitPause(syncState);
  const rateLimitResourceLabel = getGitHubRateLimitResourceLabel(activeRateLimitPause?.resource);

  if (!tokenValid) {
    return {
      label: 'Setup required',
      tone: 'warning',
      title: 'Finish setup to start syncing',
      body: 'Open settings to validate GitHub access and configure your first repository.'
    };
  }

  if (savedMappingCount === 0) {
    return {
      label: 'Setup required',
      tone: 'warning',
      title: 'Add your first repository',
      body: 'Open settings to connect one repository to a Paperclip project.'
    };
  }

  if (runningSync || syncState.status === 'running') {
    const progress = getRunningSyncProgressModel(syncState);
    return {
      label: 'Syncing',
      tone: 'info',
      title: progress?.title ?? 'Sync in progress',
      body: progress?.description ?? 'GitHub issues are being checked right now. This card refreshes automatically until the run finishes.'
    };
  }

  if (activeRateLimitPause) {
    return {
      label: 'Paused',
      tone: 'warning',
      title: 'GitHub sync paused by rate limit',
      body: `${rateLimitResourceLabel ?? 'GitHub'} rate limiting paused sync until ${formatDate(activeRateLimitPause.resetAt, activeRateLimitPause.resetAt)}.`
    };
  }

  if (syncState.status === 'error') {
    return {
      label: 'Needs attention',
      tone: 'danger',
      title: 'Last sync needs attention',
      body: syncState.message ?? 'Open settings to review the latest GitHub sync issue.'
    };
  }

  if (syncState.checkedAt) {
    return {
      label: 'Ready',
      tone: syncState.status === 'success' ? 'success' : 'info',
      title: 'GitHub sync activity',
      body: syncState.message ?? `Automatic sync runs ${cadence}.`
    };
  }

  return {
    label: 'Ready',
    tone: 'info',
    title: 'Ready for first sync',
    body: `Your repository mapping is in place. Automatic sync runs ${cadence}.`
  };
}

function buildThemeVars(theme: ThemePalette, themeMode: ThemeMode): React.CSSProperties {
  return {
    colorScheme: themeMode,
    ['--ghsync-text' as string]: theme.text,
    ['--ghsync-title' as string]: theme.title,
    ['--ghsync-muted' as string]: theme.muted,
    ['--ghsync-surface' as string]: theme.surface,
    ['--ghsync-surfaceAlt' as string]: theme.surfaceAlt,
    ['--ghsync-surfaceRaised' as string]: theme.surfaceRaised,
    ['--ghsync-border' as string]: theme.border,
    ['--ghsync-border-soft' as string]: theme.borderSoft,
    ['--ghsync-input-bg' as string]: theme.inputBg,
    ['--ghsync-input-border' as string]: theme.inputBorder,
    ['--ghsync-input-text' as string]: theme.inputText,
    ['--ghsync-badge-bg' as string]: theme.badgeBg,
    ['--ghsync-badge-border' as string]: theme.badgeBorder,
    ['--ghsync-badge-text' as string]: theme.badgeText,
    ['--ghsync-primaryBg' as string]: theme.primaryBg,
    ['--ghsync-primaryBorder' as string]: theme.primaryBorder,
    ['--ghsync-primaryText' as string]: theme.primaryText,
    ['--ghsync-secondaryBg' as string]: theme.secondaryBg,
    ['--ghsync-secondaryBorder' as string]: theme.secondaryBorder,
    ['--ghsync-secondaryText' as string]: theme.secondaryText,
    ['--ghsync-dangerBg' as string]: theme.dangerBg,
    ['--ghsync-dangerBorder' as string]: theme.dangerBorder,
    ['--ghsync-dangerText' as string]: theme.dangerText,
    ['--ghsync-danger-bg' as string]: theme.dangerBg,
    ['--ghsync-danger-border' as string]: theme.dangerBorder,
    ['--ghsync-danger-text' as string]: theme.dangerText,
    ['--ghsync-success-bg' as string]: theme.successBg,
    ['--ghsync-success-border' as string]: theme.successBorder,
    ['--ghsync-success-text' as string]: theme.successText,
    ['--ghsync-warning-bg' as string]: theme.warningBg,
    ['--ghsync-warning-border' as string]: theme.warningBorder,
    ['--ghsync-warning-text' as string]: theme.warningText,
    ['--ghsync-info-bg' as string]: theme.infoBg,
    ['--ghsync-info-border' as string]: theme.infoBorder,
    ['--ghsync-info-text' as string]: theme.infoText,
    ['--ghsync-shadow' as string]: theme.shadow
  } as React.CSSProperties;
}

function formatSyncFailurePhase(phase?: SyncFailurePhase): string | null {
  switch (phase) {
    case 'configuration':
      return 'Checking sync configuration';
    case 'loading_paperclip_labels':
      return 'Loading Paperclip labels';
    case 'listing_github_issues':
      return 'Listing GitHub issues';
    case 'building_import_plan':
      return 'Building the GitHub import plan';
    case 'importing_issue':
      return 'Importing a GitHub issue';
    case 'syncing_labels':
      return 'Syncing issue labels';
    case 'syncing_description':
      return 'Syncing issue descriptions';
    case 'evaluating_github_status':
      return 'Checking GitHub review and CI status';
    case 'updating_paperclip_status':
      return 'Updating Paperclip issue status';
    default:
      return null;
  }
}

function formatSyncFailureRepository(repositoryUrl?: string): string | null {
  if (!repositoryUrl?.trim()) {
    return null;
  }

  const parsed = parseRepositoryReference(repositoryUrl);
  if (parsed) {
    return `${parsed.owner}/${parsed.repo}`;
  }

  return repositoryUrl.trim();
}

function getSyncDiagnostics(syncState: SyncRunState): {
  rows: Array<{ label: string; value: string }>;
  rawMessage?: string;
  suggestedAction?: string;
} | null {
  if (syncState.status !== 'error') {
    return null;
  }

  const rows: Array<{ label: string; value: string }> = [];
  const repositoryLabel = formatSyncFailureRepository(syncState.errorDetails?.repositoryUrl);
  const phaseLabel = formatSyncFailurePhase(syncState.errorDetails?.phase);
  const issueNumber = syncState.errorDetails?.githubIssueNumber;
  const rateLimitResetAt = syncState.errorDetails?.rateLimitResetAt;
  const rateLimitResourceLabel = getGitHubRateLimitResourceLabel(syncState.errorDetails?.rateLimitResource);

  if (repositoryLabel) {
    rows.push({
      label: 'Repository',
      value: repositoryLabel
    });
  }

  if (issueNumber !== undefined) {
    rows.push({
      label: 'GitHub issue',
      value: `#${issueNumber}`
    });
  }

  if (phaseLabel) {
    rows.push({
      label: 'Failed while',
      value: phaseLabel
    });
  }

  if (rateLimitResourceLabel) {
    rows.push({
      label: 'GitHub bucket',
      value: rateLimitResourceLabel
    });
  }

  if (rateLimitResetAt) {
    rows.push({
      label: 'Paused until',
      value: formatDate(rateLimitResetAt, rateLimitResetAt)
    });
  }

  const rawMessage =
    syncState.errorDetails?.rawMessage && syncState.errorDetails.rawMessage !== syncState.message
      ? syncState.errorDetails.rawMessage
      : undefined;
  const suggestedAction = syncState.errorDetails?.suggestedAction;

  if (rows.length === 0 && !rawMessage && !suggestedAction) {
    return null;
  }

  return {
    rows,
    ...(rawMessage ? { rawMessage } : {}),
    ...(suggestedAction ? { suggestedAction } : {})
  };
}

function SyncProgressPanel(props: {
  syncState: SyncRunState;
  compact?: boolean;
}): React.JSX.Element | null {
  const progress = getRunningSyncProgressModel(props.syncState);
  const progressValueText = progress?.issueProgressLabel ?? progress?.description;

  if (!progress) {
    return null;
  }

  const progressFillWidth =
    progress.indeterminate || progress.percent === null
      ? undefined
      : `${progress.percent > 0 ? Math.max(progress.percent, 3) : 0}%`;

  return (
    <section
      className={`ghsync-progress${props.compact ? ' ghsync-progress--compact' : ''}`}
      aria-live="polite"
    >
      <div className="ghsync-progress__header">
        <div className="ghsync-progress__copy">
          <strong>{progress.title}</strong>
          <span>{progress.description}</span>
        </div>
        {progress.repositoryPosition ? <span className="ghsync-progress__pill">{progress.repositoryPosition}</span> : null}
      </div>

      <div
        className="ghsync-progress__track"
        role="progressbar"
        aria-label={progress.title}
        aria-valuemin={0}
        aria-valuemax={progress.totalIssueCount}
        aria-valuenow={progress.indeterminate ? undefined : progress.completedIssueCount}
        aria-valuetext={progressValueText}
      >
        <div
          className={`ghsync-progress__fill${progress.indeterminate ? ' ghsync-progress__fill--indeterminate' : ''}`}
          style={progressFillWidth ? { width: progressFillWidth } : undefined}
        />
      </div>

      <div className="ghsync-progress__meta">
        <span>{progress.issueProgressLabel ?? 'Calculating the total number of issues to sync.'}</span>
        <span>{progress.currentIssueLabel ?? progress.repositoryLabel ?? 'GitHub sync is running.'}</span>
      </div>
    </section>
  );
}

function SyncDiagnosticsPanel(props: {
  syncState: SyncRunState;
  requestError?: string | null;
  compact?: boolean;
}): React.JSX.Element | null {
  const diagnostics = getSyncDiagnostics(props.syncState);
  const requestError = props.requestError?.trim() ? props.requestError.trim() : null;

  if (!diagnostics && !requestError) {
    return null;
  }

  return (
    <section className={`ghsync-diagnostics${props.compact ? ' ghsync-diagnostics--compact' : ''}`}>
      <div className="ghsync-diagnostics__header">
        <strong>{diagnostics ? 'Troubleshooting details' : 'Sync request failed'}</strong>
        <span>
          {diagnostics
            ? 'GitHub Sync saved this snapshot from the latest failed run.'
            : 'The sync request failed before the worker returned a saved result.'}
        </span>
      </div>

      {requestError ? (
        <div className="ghsync-diagnostics__block">
          <span className="ghsync-diagnostics__label">Request error</span>
          <div className="ghsync-diagnostics__value ghsync-diagnostics__value--code">{requestError}</div>
        </div>
      ) : null}

      {diagnostics?.rows.length ? (
        <div className="ghsync-diagnostics__grid">
          {diagnostics.rows.map((row) => (
            <div key={row.label} className="ghsync-diagnostics__item">
              <span className="ghsync-diagnostics__label">{row.label}</span>
              <strong className="ghsync-diagnostics__value">{row.value}</strong>
            </div>
          ))}
        </div>
      ) : null}

      {diagnostics?.rawMessage ? (
        <div className="ghsync-diagnostics__block">
          <span className="ghsync-diagnostics__label">Raw error</span>
          <div className="ghsync-diagnostics__value ghsync-diagnostics__value--code">{diagnostics.rawMessage}</div>
        </div>
      ) : null}

      {diagnostics?.suggestedAction ? (
        <div className="ghsync-diagnostics__block">
          <span className="ghsync-diagnostics__label">Next step</span>
          <div className="ghsync-diagnostics__value">{diagnostics.suggestedAction}</div>
        </div>
      ) : null}
    </section>
  );
}

export function GitHubSyncSettingsPage(): React.JSX.Element {
  const hostContext = useHostContext();
  const toast = usePluginToast();
  const pluginIdFromLocation = getPluginIdFromLocation();
  const settings = usePluginData<GitHubSyncSettings>('settings.registration', {});
  const saveRegistration = usePluginAction('settings.saveRegistration');
  const validateToken = usePluginAction('settings.validateToken');
  const runSyncNow = usePluginAction('sync.runNow');
  const [form, setForm] = useState<GitHubSyncSettings>(EMPTY_SETTINGS);
  const [submittingToken, setSubmittingToken] = useState(false);
  const [submittingSetup, setSubmittingSetup] = useState(false);
  const [runningSync, setRunningSync] = useState(false);
  const [manualSyncRequestError, setManualSyncRequestError] = useState<string | null>(null);
  const [scheduleFrequencyDraft, setScheduleFrequencyDraft] = useState(String(DEFAULT_SCHEDULE_FREQUENCY_MINUTES));
  const [tokenStatusOverride, setTokenStatusOverride] = useState<TokenStatus | null>(null);
  const [validatedLogin, setValidatedLogin] = useState<string | null>(null);
  const [tokenDraft, setTokenDraft] = useState('');
  const [showSavedTokenHint, setShowSavedTokenHint] = useState(false);
  const [showTokenEditor, setShowTokenEditor] = useState(false);
  const [cachedSettings, setCachedSettings] = useState<GitHubSyncSettings | null>(null);
  const themeMode = useResolvedThemeMode();

  const currentSettings = settings.data ?? cachedSettings;
  const showInitialLoadingState = settings.loading && !settings.data && !cachedSettings;

  useEffect(() => {
    if (settings.data) {
      setCachedSettings(settings.data);
    }
  }, [settings.data]);

  useEffect(() => {
    if (!settings.data) {
      return;
    }

    const nextScheduleFrequencyMinutes = normalizeScheduleFrequencyMinutes(settings.data.scheduleFrequencyMinutes);
    setForm({
      mappings: settings.data.mappings ?? [],
      syncState: settings.data.syncState ?? { status: 'idle' },
      scheduleFrequencyMinutes: nextScheduleFrequencyMinutes,
      paperclipApiBaseUrl: settings.data.paperclipApiBaseUrl,
      githubTokenConfigured: settings.data.githubTokenConfigured,
      totalSyncedIssuesCount: settings.data.totalSyncedIssuesCount,
      updatedAt: settings.data.updatedAt
    });
    setScheduleFrequencyDraft(String(nextScheduleFrequencyMinutes));
    setTokenDraft('');

    if (settings.data.githubTokenConfigured) {
      setShowSavedTokenHint(true);
      setShowTokenEditor(false);
      setTokenStatusOverride('valid');
    } else if (!showSavedTokenHint) {
      setShowTokenEditor(true);
      setValidatedLogin(null);
    }
  }, [settings.data, showSavedTokenHint]);

  useEffect(() => {
    const hasSavedToken = Boolean(form.githubTokenConfigured || showSavedTokenHint);
    const tokenStatus = tokenStatusOverride ?? (hasSavedToken ? 'valid' : 'required');
    if (tokenStatus !== 'valid' || form.mappings.length > 0) {
      return;
    }

    setForm((current) => ({
      ...current,
      mappings: [createEmptyMapping(0)]
      }));
  }, [form.githubTokenConfigured, form.mappings.length, showSavedTokenHint, tokenStatusOverride]);

  useEffect(() => {
    if (form.syncState.status !== 'running') {
      return;
    }

    const refreshSettings = () => {
      try {
        settings.refresh();
      } catch {
        return;
      }
    };

    const intervalId = globalThis.setInterval(() => {
      refreshSettings();
    }, SYNC_POLL_INTERVAL_MS);

    refreshSettings();

    return () => {
      globalThis.clearInterval(intervalId);
    };
  }, [form.syncState.status, settings.refresh]);

  const theme = themeMode === 'light' ? LIGHT_PALETTE : DARK_PALETTE;
  const themeVars = buildThemeVars(theme, themeMode);
  const hasSavedToken = Boolean(form.githubTokenConfigured || showSavedTokenHint);
  const tokenStatus = tokenStatusOverride ?? (hasSavedToken ? 'valid' : 'required');
  const tokenTone: Tone = tokenStatus === 'valid' ? 'success' : tokenStatus === 'invalid' ? 'danger' : 'warning';
  const tokenBannerLabel = tokenStatus === 'valid' ? 'Token valid' : tokenStatus === 'invalid' ? 'Token invalid' : 'Token required';
  const tokenBadgeLabel = tokenStatus === 'valid' ? 'Valid' : tokenStatus === 'invalid' ? 'Invalid' : 'Required';
  const tokenDescription =
    tokenStatus === 'invalid'
        ? 'GitHub rejected the last token. Save a valid token to continue.'
        : tokenStatus === 'required'
          ? 'Add a token to continue.'
          : null;
  const repositoriesUnlocked = tokenStatus === 'valid';
  const savedMappingsSource = currentSettings ? currentSettings.mappings ?? [] : form.mappings;
  const savedMappings = getComparableMappings(savedMappingsSource);
  const draftMappings = getComparableMappings(form.mappings);
  const savedMappingCount = savedMappings.length;
  const syncUnlocked = tokenStatus === 'valid' && savedMappingCount > 0;
  const displaySyncState = getDisplaySyncState(form.syncState, {
    hasToken: tokenStatus === 'valid',
    hasMappings: savedMappingCount > 0
  });
  const mappingsDirty = JSON.stringify(draftMappings) !== JSON.stringify(savedMappings);
  const scheduleFrequencyError = getScheduleFrequencyError(scheduleFrequencyDraft);
  const scheduleFrequencyMinutes = parseScheduleFrequencyDraft(scheduleFrequencyDraft) ?? form.scheduleFrequencyMinutes;
  const savedScheduleFrequencyMinutes = normalizeScheduleFrequencyMinutes(currentSettings?.scheduleFrequencyMinutes);
  const scheduleDirty = scheduleFrequencyError === null && scheduleFrequencyMinutes !== savedScheduleFrequencyMinutes;
  const mappings = form.mappings.length > 0 ? form.mappings : [createEmptyMapping(0)];
  const syncInFlight = runningSync || displaySyncState.status === 'running';
  const settingsMutationsLocked = syncInFlight;
  const settingsMutationsLockReason = settingsMutationsLocked
    ? 'Settings are temporarily locked while a sync is running to avoid overwriting local edits.'
    : null;
  const syncStatus = getSyncStatus(displaySyncState, runningSync, syncUnlocked);
  const canSaveToken =
    !settingsMutationsLocked &&
    !submittingToken &&
    !showInitialLoadingState &&
    tokenDraft.trim().length > 0;
  const canSaveSetup =
    repositoriesUnlocked &&
    !settingsMutationsLocked &&
    !submittingSetup &&
    !showInitialLoadingState &&
    scheduleFrequencyError === null &&
    (mappingsDirty || scheduleDirty);
  const showTokenForm = tokenStatus !== 'valid' || showTokenEditor;
  const lastUpdated = formatDate(form.updatedAt ?? currentSettings?.updatedAt, 'Not saved yet');
  const lastSync = formatDate(displaySyncState.checkedAt, 'Never');
  const scheduleDescription = formatScheduleFrequency(scheduleFrequencyMinutes);
  const syncProgress = getRunningSyncProgressModel(displaySyncState);
  const syncMetricCards = getSyncMetricCards({
    totalSyncedIssuesCount: currentSettings?.totalSyncedIssuesCount ?? form.totalSyncedIssuesCount,
    erroredIssuesCount: displaySyncState.erroredIssuesCount,
    syncState: displaySyncState,
    savedMappingCount
  });
  const syncSummaryPrimaryText =
    syncProgress?.title ??
    displaySyncState.message ??
    (syncUnlocked ? 'Ready to sync.' : tokenStatus === 'valid' ? 'Save a repository to enable sync.' : 'Add a valid token to enable sync.');
  const syncSummarySecondaryText = syncProgress
    ? [
        syncProgress.issueProgressLabel,
        syncProgress.currentIssueLabel ?? syncProgress.repositoryPosition,
        `Auto-sync: ${scheduleDescription}`
      ].filter((value): value is string => Boolean(value))
        .join(' · ')
    : `Auto-sync: ${scheduleDescription} · Last trigger: ${displaySyncState.lastRunTrigger ?? 'none'} · Last checked: ${displaySyncState.checkedAt ? formatDate(displaySyncState.checkedAt) : 'never'}`;
  const syncSummaryClass =
    syncStatus.tone === 'success'
      ? 'ghsync__sync-summary ghsync__sync-summary--success'
      : syncStatus.tone === 'danger'
        ? 'ghsync__sync-summary ghsync__sync-summary--danger'
        : 'ghsync__sync-summary ghsync__sync-summary--info';

  function updateMapping(mappingId: string, field: keyof RepositoryMapping, value: string) {
    setForm((current) => {
      const hasMapping = current.mappings.some((mapping) => mapping.id === mappingId);
      const nextMappings = hasMapping
        ? current.mappings
        : [
            ...current.mappings,
            {
              ...createEmptyMapping(current.mappings.length),
              id: mappingId
            }
          ];

      return {
        ...current,
        mappings: nextMappings.map((mapping) => {
          if (mapping.id !== mappingId) {
            return mapping;
          }

          if (field === 'repositoryUrl') {
            return {
              ...mapping,
              repositoryUrl: value,
              ...(shouldAutofillProjectName(mapping)
                ? { paperclipProjectName: formatProjectNameFromRepository(value) }
                : {})
            };
          }

          return {
            ...mapping,
            [field]: value
          };
        })
      };
    });
  }

  function addMapping() {
    setForm((current) => ({
      ...current,
      mappings: [...current.mappings, createEmptyMapping(current.mappings.length)]
    }));
  }

  function removeMapping(mappingId: string) {
    setForm((current) => {
      const remaining = current.mappings.filter((mapping) => mapping.id !== mappingId);
      return {
        ...current,
        mappings: remaining.length > 0 ? remaining : [createEmptyMapping(0)]
      };
    });
  }

  async function handleSaveToken(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittingToken(true);

    let validation: TokenValidationResult;

    try {
      const trimmedToken = tokenDraft.trim();
      if (!trimmedToken) {
        throw new Error('Enter a GitHub token.');
      }

      validation = await validateToken({
        token: trimmedToken
      }) as TokenValidationResult;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'GitHub rejected this token.';
      if (!hasSavedToken) {
        setTokenStatusOverride('invalid');
      }
      setValidatedLogin(null);

      toast({
        title: 'GitHub token invalid',
        body: message,
        tone: 'error'
      });
      setSubmittingToken(false);
      return;
    }

    try {
      const companyId = hostContext.companyId;
      if (!companyId) {
        throw new Error('Company context is required to save the GitHub token.');
      }

      if (!pluginIdFromLocation) {
        throw new Error('Plugin id is required to save the GitHub token.');
      }

      const trimmedToken = tokenDraft.trim();

      const secretName = `github_sync_${companyId.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}`;
      const secret = await resolveOrCreateCompanySecret(companyId, secretName, trimmedToken);

      await fetchJson(`/api/plugins/${pluginIdFromLocation}/config`, {
        method: 'POST',
        body: JSON.stringify({
          configJson: {
            githubTokenRef: secret.id
          }
        })
      });

      setForm((current) => ({
        ...current,
        githubTokenConfigured: true
      }));
      setShowSavedTokenHint(true);
      setShowTokenEditor(false);
      setTokenStatusOverride('valid');
      setValidatedLogin(validation.login);
      setTokenDraft('');
      toast({
        title: `Authenticated as ${validation.login}`,
        body: 'Token saved.',
        tone: 'success'
      });

      try {
        await settings.refresh();
      } catch {
        return;
      }
    } catch (error) {
      toast({
        title: 'GitHub token could not be saved',
        body: error instanceof Error ? error.message : 'Paperclip could not save the validated token.',
        tone: 'error'
      });
    } finally {
      setSubmittingToken(false);
    }
  }

  async function handleSaveSetup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittingSetup(true);

    try {
      const companyId = hostContext.companyId;
      if (!companyId) {
        throw new Error('Company context is required to save setup.');
      }

      if (tokenStatus !== 'valid') {
        throw new Error('Validate a GitHub token first.');
      }

      if (scheduleFrequencyError) {
        throw new Error(scheduleFrequencyError);
      }

      const resolvedMappings: RepositoryMapping[] = [];
      for (const mapping of form.mappings) {
        const repositoryInput = mapping.repositoryUrl.trim();
        const paperclipProjectName = mapping.paperclipProjectName.trim();

        if (!repositoryInput && !paperclipProjectName) {
          continue;
        }

        if (!repositoryInput || !paperclipProjectName) {
          throw new Error('Each repository needs both a GitHub repository and a Paperclip project name.');
        }

        const parsedRepository = parseRepositoryReference(repositoryInput);
        if (!parsedRepository) {
          throw new Error(`Invalid GitHub repository: ${repositoryInput}. Use owner/repo or https://github.com/owner/repo.`);
        }

        const project = mapping.paperclipProjectId && mapping.companyId === companyId
          ? { id: mapping.paperclipProjectId, name: paperclipProjectName }
          : await resolveOrCreateProject(companyId, paperclipProjectName);

        await bindProjectRepo(project.id, parsedRepository.url);

        resolvedMappings.push({
          ...mapping,
          repositoryUrl: parsedRepository.url,
          paperclipProjectName: project.name,
          paperclipProjectId: project.id,
          companyId
        });
      }

      const result = await saveRegistration({
        mappings: resolvedMappings,
        syncState: form.syncState,
        scheduleFrequencyMinutes,
        paperclipApiBaseUrl: getPaperclipApiBaseUrl()
      }) as GitHubSyncSettings;

      setForm((current) => ({
        ...current,
        mappings: result.mappings.length > 0 ? result.mappings : [createEmptyMapping(0)],
        syncState: result.syncState,
        scheduleFrequencyMinutes: normalizeScheduleFrequencyMinutes(result.scheduleFrequencyMinutes),
        paperclipApiBaseUrl: result.paperclipApiBaseUrl,
        updatedAt: result.updatedAt
      }));
      setScheduleFrequencyDraft(String(normalizeScheduleFrequencyMinutes(result.scheduleFrequencyMinutes)));

      toast({
        title: 'GitHub sync setup saved',
        body: `Automatic sync runs ${scheduleDescription}.`,
        tone: 'success'
      });

      try {
        await settings.refresh();
      } catch {
        return;
      }
    } catch (error) {
      toast({
        title: 'Setup could not be saved',
        body: error instanceof Error ? error.message : 'Unable to save GitHub sync setup.',
        tone: 'error'
      });
    } finally {
      setSubmittingSetup(false);
    }
  }

  async function handleRunSyncNow() {
    setRunningSync(true);
    setManualSyncRequestError(null);

    try {
      if (!syncUnlocked) {
        throw new Error('Save at least one repository before running sync.');
      }

      const result = await runSyncNow({
        paperclipApiBaseUrl: getPaperclipApiBaseUrl()
      }) as GitHubSyncSettings;

      setForm((current) => ({
        ...current,
        syncState: result.syncState
      }));
      setManualSyncRequestError(null);

      toast({
        title: getSyncToastTitle(result.syncState),
        body: getSyncToastBody(result.syncState),
        tone: getSyncToastTone(result.syncState)
      });

      try {
        await settings.refresh();
      } catch {
        return;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to run sync.';
      setManualSyncRequestError(message);
      toast({
        title: 'Unable to run GitHub sync',
        body: message,
        tone: 'error'
      });

      try {
        await settings.refresh();
      } catch {
        return;
      }
    } finally {
      setRunningSync(false);
    }
  }

  return (
    <div className="ghsync" style={themeVars}>
      <style>{PAGE_STYLES}</style>

      <section className="ghsync__header">
        <div className="ghsync__header-copy">
          <h2>GitHub Sync settings</h2>
          <p>Add a token to get started.</p>
          {settingsMutationsLockReason ? <p className="ghsync__hint">{settingsMutationsLockReason}</p> : null}
        </div>
        <span className={`ghsync__badge ${getToneClass(tokenTone)}`}>
          <span className="ghsync__badge-dot" aria-hidden="true" />
          {tokenBannerLabel}
        </span>
      </section>

      <div className="ghsync__layout">
        <section className="ghsync__card">
          <div className="ghsync__card-header">
            <h3>Connect GitHub</h3>
          </div>

          {showInitialLoadingState ? <p className="ghsync__loading">Loading saved settings…</p> : null}

          <section className="ghsync__section">
            <div className="ghsync__section-head">
              <div className="ghsync__section-copy">
                <h4>GitHub access</h4>
                {tokenDescription ? <p>{tokenDescription}</p> : null}
              </div>
              <span className={`ghsync__badge ${getToneClass(tokenTone)}`}>
                {tokenBadgeLabel}
              </span>
            </div>

            {showTokenForm ? (
              <form className="ghsync__stack" onSubmit={handleSaveToken}>
                <div className="ghsync__field">
                  <label htmlFor="github-token">GitHub token</label>
                  <input
                    id="github-token"
                    className="ghsync__input"
                    type="password"
                    value={tokenDraft}
                    disabled={settingsMutationsLocked}
                    onChange={(event) => {
                      setTokenDraft(event.currentTarget.value);
                      setTokenStatusOverride(hasSavedToken ? 'valid' : null);
                    }}
                    placeholder="ghp_..."
                    autoComplete="new-password"
                  />
                </div>

                <div className="ghsync__actions">
                  <div className="ghsync__button-row">
                    {hasSavedToken ? (
                      <button
                        type="button"
                        className="ghsync__button ghsync__button--secondary"
                        disabled={settingsMutationsLocked}
                        onClick={() => {
                          setShowTokenEditor(false);
                          setTokenDraft('');
                          setTokenStatusOverride('valid');
                        }}
                      >
                        Cancel
                      </button>
                    ) : null}
                    <button
                      type="submit"
                      className="ghsync__button ghsync__button--primary"
                      disabled={!canSaveToken}
                    >
                      {submittingToken ? 'Saving…' : 'Save token'}
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="ghsync__connected">
                <div>
                  <strong>{validatedLogin ? `Authenticated as ${validatedLogin}` : 'Token ready'}</strong>
                  <span>Ready.</span>
                </div>
                <button
                  type="button"
                  className="ghsync__button ghsync__button--secondary"
                  disabled={settingsMutationsLocked}
                  onClick={() => {
                    setShowTokenEditor(true);
                    setTokenDraft('');
                    setTokenStatusOverride('valid');
                  }}
                >
                  Replace token
                </button>
              </div>
            )}
          </section>

          <section className="ghsync__section">
            <div className="ghsync__section-head">
              <div className="ghsync__section-copy">
                <h4>Repositories</h4>
              </div>
              <span className={`ghsync__badge ${getToneClass(!repositoriesUnlocked ? 'neutral' : savedMappingCount > 0 ? 'success' : 'info')}`}>
                {!repositoriesUnlocked ? 'Locked' : savedMappingCount > 0 ? `${savedMappingCount} saved` : 'Open'}
              </span>
            </div>

            {!repositoriesUnlocked ? (
              <div className="ghsync__locked">
                <div>
                  <strong>Repositories are locked</strong>
                  <span>Add a valid token first.</span>
                </div>
                <span className="ghsync__badge ghsync__badge--neutral">Locked</span>
              </div>
            ) : (
              <div className="ghsync__stack">
                {settingsMutationsLockReason ? <p className="ghsync__hint">{settingsMutationsLockReason}</p> : null}
                <div className="ghsync__mapping-list">
                  {mappings.map((mapping, index) => {
                    const canRemove = mappings.length > 1 || mapping.repositoryUrl.trim() !== '' || mapping.paperclipProjectName.trim() !== '';

                    return (
                      <section key={mapping.id} className="ghsync__mapping-card">
                        <div className="ghsync__mapping-head">
                          <div className="ghsync__mapping-title">
                            <strong>Repository {index + 1}</strong>
                          </div>
                          {canRemove ? (
                            <button
                              type="button"
                              className="ghsync__button ghsync__button--danger"
                              disabled={settingsMutationsLocked}
                              onClick={() => removeMapping(mapping.id)}
                            >
                              Remove
                            </button>
                          ) : null}
                        </div>

                        <div className="ghsync__mapping-grid">
                          <div className="ghsync__field">
                            <label htmlFor={`repository-url-${mapping.id}`}>GitHub repository</label>
                            <input
                              id={`repository-url-${mapping.id}`}
                              className="ghsync__input"
                              type="text"
                              value={mapping.repositoryUrl}
                              disabled={settingsMutationsLocked}
                              onChange={(event) => updateMapping(mapping.id, 'repositoryUrl', event.currentTarget.value)}
                              placeholder="owner/repository or https://github.com/owner/repository"
                              autoComplete="off"
                            />
                          </div>

                          <div className="ghsync__field">
                            <label htmlFor={`project-name-${mapping.id}`}>Paperclip project</label>
                            <input
                              id={`project-name-${mapping.id}`}
                              className="ghsync__input"
                              type="text"
                              value={mapping.paperclipProjectName}
                              disabled={settingsMutationsLocked}
                              onChange={(event) => updateMapping(mapping.id, 'paperclipProjectName', event.currentTarget.value)}
                              autoComplete="off"
                              readOnly={Boolean(mapping.paperclipProjectId)}
                            />
                          </div>
                        </div>
                      </section>
                    );
                  })}
                </div>

                <div className="ghsync__section-footer">
                  <div className="ghsync__button-row">
                    <button
                      type="button"
                      className="ghsync__button ghsync__button--secondary"
                      disabled={settingsMutationsLocked}
                      onClick={addMapping}
                    >
                      Add another repository
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="ghsync__section">
            <div className="ghsync__section-head">
              <div className="ghsync__section-copy">
                <h4>Sync</h4>
              </div>
              <span className={`ghsync__badge ${getToneClass(syncStatus.tone)}`}>{syncStatus.label}</span>
            </div>

            {!repositoriesUnlocked ? (
              <div className="ghsync__locked">
                <div>
                  <strong>Sync is locked</strong>
                  <span>Add a valid token first.</span>
                </div>
                <span className="ghsync__badge ghsync__badge--neutral">Locked</span>
              </div>
            ) : (
              <form className="ghsync__stack" onSubmit={handleSaveSetup}>
                <div className="ghsync__schedule-card">
                  <div className="ghsync__field">
                    <label htmlFor="sync-frequency-minutes">Automatic sync cadence</label>
                    <input
                      id="sync-frequency-minutes"
                      className="ghsync__input"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      step={1}
                      value={scheduleFrequencyDraft}
                      disabled={settingsMutationsLocked}
                      onChange={(event) => {
                        setScheduleFrequencyDraft(event.currentTarget.value);
                      }}
                      placeholder="15"
                    />
                    <p className={`ghsync__hint${scheduleFrequencyError ? ' ghsync__hint--error' : ''}`}>
                      {scheduleFrequencyError ?? 'Minutes between syncs.'}
                    </p>
                  </div>

                  <div className="ghsync__schedule-meta">
                    <strong>Auto-sync {scheduleDescription}</strong>
                  </div>
                </div>

                {!syncUnlocked ? (
                  <div className="ghsync__locked">
                    <div>
                      <strong>Manual sync is locked</strong>
                      <span>Save a repository first.</span>
                    </div>
                    <span className="ghsync__badge ghsync__badge--neutral">Locked</span>
                  </div>
                ) : (
                  <>
                    <div className="ghsync__stats">
                      {syncMetricCards.map((metric) => (
                        <div
                          key={metric.key}
                          className={`ghsync__stat${metric.emphasized ? ' ghsync__stat--emphasized' : ''}`}
                        >
                          <strong>{metric.value}</strong>
                          <span>{metric.label}</span>
                          <p>{metric.description}</p>
                        </div>
                      ))}
                    </div>

                    <SyncProgressPanel syncState={displaySyncState} />

                    <div className={syncSummaryClass}>
                      <div>
                        <strong>{syncSummaryPrimaryText}</strong>
                        <span>{syncSummarySecondaryText}</span>
                      </div>
                      <button
                        type="button"
                        className="ghsync__button ghsync__button--primary"
                        onClick={handleRunSyncNow}
                        disabled={syncInFlight || showInitialLoadingState}
                      >
                        {syncInFlight ? 'Running…' : 'Run sync now'}
                      </button>
                    </div>
                  </>
                )}

                <SyncDiagnosticsPanel
                  syncState={displaySyncState}
                  requestError={manualSyncRequestError}
                />

                <div className="ghsync__section-footer">
                  <div className="ghsync__button-row">
                    <button
                      type="submit"
                      className="ghsync__button ghsync__button--primary"
                      disabled={!canSaveSetup}
                    >
                      {submittingSetup ? 'Saving…' : 'Save setup'}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </section>
        </section>

        <aside className="ghsync__card">
          <div className="ghsync__card-header">
            <h3>Setup</h3>
          </div>

          <div className="ghsync__side-body">
            <div className="ghsync__check">
              <div className="ghsync__check-top">
                <strong>GitHub token</strong>
                <span className={`ghsync__badge ${getToneClass(tokenTone)}`}>
                  {tokenBadgeLabel}
                </span>
              </div>
              <span>{tokenStatus === 'valid' ? (validatedLogin ? `Authenticated as ${validatedLogin}.` : 'Ready.') : tokenStatus === 'invalid' ? 'Needs attention.' : 'Required.'}</span>
            </div>

            <div className="ghsync__check">
              <div className="ghsync__check-top">
                <strong>Repositories</strong>
                <span className={`ghsync__badge ${getToneClass(!repositoriesUnlocked ? 'neutral' : savedMappingCount > 0 ? 'success' : 'info')}`}>
                  {!repositoriesUnlocked ? 'Locked' : savedMappingCount > 0 ? 'Ready' : 'Open'}
                </span>
              </div>
              <span>{!repositoriesUnlocked ? 'Requires a token.' : savedMappingCount > 0 ? `${savedMappingCount} saved.` : 'Add a repository.'}</span>
            </div>

            <div className="ghsync__check">
              <div className="ghsync__check-top">
                <strong>Sync</strong>
                <span className={`ghsync__badge ${getToneClass(syncStatus.tone)}`}>{syncStatus.label}</span>
              </div>
              <span>{!syncUnlocked ? (tokenStatus === 'valid' ? 'Save a repository to enable sync.' : 'Requires a token.') : `Auto-sync ${scheduleDescription}.`}</span>
            </div>

            <div className="ghsync__detail-list">
              <div className="ghsync__detail">
                <span className="ghsync__detail-label">Last saved</span>
                <strong className="ghsync__detail-value">{lastUpdated}</strong>
              </div>
              <div className="ghsync__detail">
                <span className="ghsync__detail-label">Auto-sync</span>
                <strong className="ghsync__detail-value">{scheduleDescription}</strong>
              </div>
              <div className="ghsync__detail">
                <span className="ghsync__detail-label">Last sync</span>
                <strong className="ghsync__detail-value">{lastSync}</strong>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export function GitHubSyncDashboardWidget(): React.JSX.Element {
  useHostContext();
  const toast = usePluginToast();
  const settings = usePluginData<GitHubSyncSettings>('settings.registration', {});
  const runSyncNow = usePluginAction('sync.runNow');
  const [runningSync, setRunningSync] = useState(false);
  const [manualSyncRequestError, setManualSyncRequestError] = useState<string | null>(null);
  const [settingsHref, setSettingsHref] = useState(SETTINGS_INDEX_HREF);
  const [cachedSettings, setCachedSettings] = useState<GitHubSyncSettings | null>(null);
  const themeMode = useResolvedThemeMode();

  const theme = themeMode === 'light' ? LIGHT_PALETTE : DARK_PALETTE;
  const themeVars = buildThemeVars(theme, themeMode);
  const current = settings.data ?? cachedSettings ?? EMPTY_SETTINGS;
  const showInitialLoadingState = settings.loading && !settings.data && !cachedSettings;
  const syncState = current.syncState ?? EMPTY_SETTINGS.syncState;
  const tokenValid = Boolean(current.githubTokenConfigured);
  const savedMappingCount = getComparableMappings(current.mappings ?? []).length;
  const displaySyncState = getDisplaySyncState(syncState, {
    hasToken: tokenValid,
    hasMappings: savedMappingCount > 0
  });
  const syncUnlocked = tokenValid && savedMappingCount > 0;
  const syncInFlight = runningSync || displaySyncState.status === 'running';
  const scheduleFrequencyMinutes = normalizeScheduleFrequencyMinutes(current.scheduleFrequencyMinutes);
  const scheduleDescription = formatScheduleFrequency(scheduleFrequencyMinutes);
  const summary = getDashboardSummary(tokenValid, savedMappingCount, displaySyncState, runningSync, scheduleFrequencyMinutes);
  const syncProgress = getRunningSyncProgressModel(displaySyncState);
  const syncMetricCards = getSyncMetricCards({
    totalSyncedIssuesCount: current.totalSyncedIssuesCount,
    erroredIssuesCount: displaySyncState.erroredIssuesCount,
    syncState: displaySyncState,
    savedMappingCount
  });
  const lastSync = formatDate(displaySyncState.checkedAt, 'Never');

  useEffect(() => {
    if (settings.data) {
      setCachedSettings(settings.data);
    }
  }, [settings.data]);

  useEffect(() => {
    let cancelled = false;

    async function loadSettingsHref(): Promise<void> {
      try {
        const plugins = await fetchJson<unknown>('/api/plugins');
        if (!cancelled) {
          setSettingsHref(resolvePluginSettingsHref(plugins));
        }
      } catch {
        if (!cancelled) {
          setSettingsHref(SETTINGS_INDEX_HREF);
        }
      }
    }

    void loadSettingsHref();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (displaySyncState.status !== 'running') {
      return;
    }

    const refreshSettings = () => {
      try {
        settings.refresh();
      } catch {
        return;
      }
    };

    const intervalId = globalThis.setInterval(() => {
      refreshSettings();
    }, SYNC_POLL_INTERVAL_MS);

    refreshSettings();

    return () => {
      globalThis.clearInterval(intervalId);
    };
  }, [displaySyncState.status, settings.refresh]);

  async function handleRunSync(): Promise<void> {
    setRunningSync(true);
    setManualSyncRequestError(null);

    try {
      const result = await runSyncNow({
        paperclipApiBaseUrl: getPaperclipApiBaseUrl()
      }) as GitHubSyncSettings;
      const nextSyncState = result.syncState ?? EMPTY_SETTINGS.syncState;
      setManualSyncRequestError(null);

      toast({
        title: getSyncToastTitle(nextSyncState),
        body: getSyncToastBody(nextSyncState),
        tone: getSyncToastTone(nextSyncState)
      });

      await settings.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to run GitHub sync.';
      setManualSyncRequestError(message);
      toast({
        title: 'Unable to run GitHub sync',
        body: message,
        tone: 'error'
      });

      try {
        await settings.refresh();
      } catch {
        return;
      }
    } finally {
      setRunningSync(false);
    }
  }

  return (
    <section className="ghsync-widget" style={themeVars}>
      <style>{WIDGET_STYLES}</style>

      <div className="ghsync-widget__card">
        <div className="ghsync-widget__top">
          <div>
            <div className="ghsync-widget__eyebrow">GitHub Sync</div>
            <h3>{summary.title}</h3>
            <p>{summary.body}</p>
            <div className="ghsync-widget__meta">
              <span>{savedMappingCount} {savedMappingCount === 1 ? 'repository' : 'repositories'}</span>
              <span className="ghsync-widget__meta-dot" aria-hidden="true" />
              <span>Auto-sync {scheduleDescription}</span>
              <span className="ghsync-widget__meta-dot" aria-hidden="true" />
              <span>Last sync {lastSync}</span>
            </div>
          </div>
          <span className={`ghsync__badge ${getToneClass(summary.tone)}`}>
            <span className="ghsync__badge-dot" aria-hidden="true" />
            {summary.label}
          </span>
        </div>

        {settings.error ? <div className="ghsync-widget__message">{settings.error.message}</div> : null}

        <div className="ghsync-widget__stats">
          {syncMetricCards.map((metric) => (
            <div
              key={metric.key}
              className={`ghsync-widget__stat${metric.emphasized ? ' ghsync-widget__stat--emphasized' : ''}`}
            >
              <strong>{metric.value}</strong>
              <span>{metric.label}</span>
              <p>{metric.description}</p>
            </div>
          ))}
        </div>

        <SyncProgressPanel
          syncState={displaySyncState}
          compact
        />

        <div className="ghsync-widget__summary">
          <strong>
            {showInitialLoadingState
              ? 'Loading sync status…'
              : syncInFlight
                ? 'Live run'
                : syncUnlocked
                  ? 'Latest result'
                  : 'Next step'}
          </strong>
          <span>
            {showInitialLoadingState
              ? 'Fetching the latest GitHub sync state from the worker.'
              : syncProgress
                ? [
                    syncProgress.issueProgressLabel,
                    syncProgress.currentIssueLabel ?? syncProgress.repositoryPosition
                  ].filter((value): value is string => Boolean(value))
                    .join(' · ')
              : !tokenValid
                ? 'Open settings to validate GitHub access.'
                : savedMappingCount === 0
                  ? 'Open settings and add a repository. The Paperclip project will be created if it does not exist.'
                  : displaySyncState.checkedAt
                    ? `Last checked ${lastSync}.`
                    : 'Everything is configured. Run the first sync when you are ready.'}
          </span>
        </div>

        <SyncDiagnosticsPanel
          syncState={displaySyncState}
          requestError={manualSyncRequestError}
          compact
        />

        <div className="ghsync-widget__actions">
          <div className="ghsync-widget__button-row">
            <a
              href={settingsHref}
              className={`ghsync__button ${syncUnlocked ? 'ghsync__button--secondary' : 'ghsync__button--primary'} ghsync-widget__link`}
            >
              Open settings
            </a>
            {syncUnlocked ? (
              <button
                type="button"
                className="ghsync__button ghsync__button--primary"
                onClick={handleRunSync}
                disabled={syncInFlight || showInitialLoadingState}
              >
                {syncInFlight ? 'Running…' : 'Run sync now'}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export default GitHubSyncSettingsPage;
