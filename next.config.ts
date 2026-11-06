import { fileURLToPath } from 'node:url'
import type { NextConfig } from 'next'

const config: NextConfig = {
  // Plain files: pages for people, and the same docs as Markdown for agents (llms.txt, SKILL.md)
  output: 'export',
  // This folder is the root, with docs/ and skills/ in it: Next shouldn't look above it
  turbopack: { root: fileURLToPath(new URL('.', import.meta.url)) },
  // next dev writes an AGENTS.md otherwise
  agentRules: false,
}

export default config
