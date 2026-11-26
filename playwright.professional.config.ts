import {defineConfig} from '@playwright/test';

// Isolated UI checks use synthetic API fixtures and never mutate a working DB.
export default defineConfig({
  testDir:'./e2e', testMatch:'professional.spec.ts', workers:1, timeout:60000,
  expect:{timeout:10000}, reporter:'list',
  outputDir:'../.runtime/new-features-preview/test-results',
  use:{baseURL:'http://localhost:3109',viewport:{width:1440,height:1000},screenshot:'only-on-failure'},
  webServer:{command:'node node_modules/next/dist/bin/next start -p 3109',url:'http://localhost:3109',reuseExistingServer:false,timeout:60000},
});
