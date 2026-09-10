import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json' with { type: 'json' }

export default defineManifest({
  manifest_version: 3,
  name: 'Clean Git - Bulk Repository Manager',
  description: 'Gerencie e limpe seus repositorios do GitHub em massa, direto do navegador.',
  version: pkg.version,
  action: {
    default_popup: 'src/popup/index.html',
  },
  background: {
    service_worker: 'src/background/service-worker.js',
    type: 'module',
  },
  permissions: ['storage'],
  host_permissions: ['https://api.github.com/*'],
  web_accessible_resources: [
    {
      resources: ['src/dashboard/index.html', 'src/connect/index.html'],
      matches: ['<all_urls>'],
    },
  ],
})
