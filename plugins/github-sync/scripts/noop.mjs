#!/usr/bin/env node
const command = process.argv[2] ?? 'noop';
console.log(`[github-sync] no-op ${command}`);
