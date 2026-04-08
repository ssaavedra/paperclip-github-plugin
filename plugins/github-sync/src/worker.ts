import { definePlugin, runWorker } from '@paperclipai/plugin-sdk';

const STATUS_SCOPE = {
  scopeKind: 'instance' as const,
  stateKey: 'github-sync-status'
};

const plugin = definePlugin({
  async setup(ctx) {
    ctx.data.register('scaffold.status', async () => {
      const status = await ctx.state.get(STATUS_SCOPE);
      return status ?? {
        ready: true,
        message: 'GitHub Sync scaffold is connected and ready for future features.'
      };
    });

    ctx.actions.register('scaffold.markReady', async () => {
      const next = {
        ready: true,
        message: 'GitHub Sync scaffold action executed successfully.',
        updatedAt: new Date().toISOString()
      };
      await ctx.state.set(STATUS_SCOPE, next);
      return next;
    });
  }
});

export default plugin;
runWorker(plugin, import.meta.url);
