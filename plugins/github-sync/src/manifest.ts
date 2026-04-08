import type { PaperclipPluginManifestV1 } from '@paperclipai/plugin-sdk';

export const manifest: PaperclipPluginManifestV1 = {
  id: 'github-sync',
  apiVersion: 1,
  version: '0.1.0',
  displayName: 'GitHub Sync',
  description: 'Scaffold plugin for future GitHub synchronization workflows.',
  author: 'Álvaro Sánchez-Mariscal',
  categories: ['workspace'],
  capabilities: ['ui.page.register', 'plugin.state.read', 'plugin.state.write', 'instance.settings.register'],
  entrypoints: {
    worker: './dist/worker.js',
    ui: './dist/ui/'
  },
  ui: {
    slots: [
      {
        type: 'settingsPage',
        id: 'github-sync-settings-page',
        displayName: 'GitHub Sync',
        exportName: 'GitHubSyncSettingsPage'
      }
    ]
  }
};

export default manifest;
