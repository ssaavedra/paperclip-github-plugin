import { strict as assert } from 'node:assert';
import test from 'node:test';

import { createTestHarness } from '@paperclipai/plugin-sdk/testing';

import manifest from '../src/manifest.ts';
import plugin from '../src/worker.ts';

test('manifest exposes GitHub Sync settings page metadata', () => {
  assert.equal(manifest.id, 'github-sync');
  assert.equal(manifest.apiVersion, 1);
  assert.equal(manifest.entrypoints.worker, './dist/worker.js');
  const firstSlot = manifest.ui?.slots?.[0];
  assert.ok(firstSlot);
  assert.equal(firstSlot?.type, 'settingsPage');
  assert.equal(firstSlot?.exportName, 'GitHubSyncSettingsPage');
});

test('worker scaffold status returns default message and action updates it', async () => {
  const harness = createTestHarness({ manifest });
  await plugin.definition.setup(harness.ctx);

  const initial = await harness.getData('scaffold.status', {});
  assert.deepEqual(initial, {
    ready: true,
    message: 'GitHub Sync scaffold is connected and ready for future features.'
  });

  const result = await harness.performAction('scaffold.markReady', {});
  assert.equal((result as { ready: boolean }).ready, true);
  assert.equal((result as { message: string }).message, 'GitHub Sync scaffold action executed successfully.');
  assert.equal(typeof (result as { updatedAt: string }).updatedAt, 'string');

  const updated = await harness.getData('scaffold.status', {}) as { ready: boolean; message: string };
  assert.equal(updated.ready, true);
  assert.equal(updated.message, 'GitHub Sync scaffold action executed successfully.');
});
