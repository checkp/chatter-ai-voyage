

## Update SEO Tags with 2026 AI Keywords

The current SEO metadata references outdated model names (GPT-4, Grok, Gemini without version) and misses trending 2026 keywords like "agentic AI", "AI orchestration", and current model names. The landing page content was already updated but `index.html` SEO tags lag behind.

### Changes

**1. `index.html` — Meta tags overhaul**
- **Title**: Update to include "Agentic AI Orchestration" and "Multi-Model AI Platform"
- **Keywords meta**: Replace with 2026-relevant terms:
  - `agentic AI, AI orchestration, AI conductor, multi-agent AI, GPT-5, Claude 4, Gemini 2.5, Grok-4, DeepSeek-R2, frontier AI models, AI debate platform, collaborative AI, conductor mode, AI delegation, AI synthesis, multi-model AI chat, AI super-intelligence, autonomous AI agents, AI workflow automation, RoboHeard, AI platform 2026`
- **Description meta**: Refresh to mention GPT-5, Claude 4, Gemini 2.5, Grok-4, DeepSeek-R2, agentic orchestration
- **OG tags**: Update `og:title`, `og:description`, `og:updated_time` to 2026-04-08
- **Twitter tags**: Update title/description with same 2026 keywords
- **Structured data (JSON-LD)**: Update `softwareVersion` to 2.2.0, `dateModified` to 2026-04-08, model names in `featureList`, and review text

**2. `public/sitemap.xml` — Update `lastmod` dates**
- Set all `lastmod` values to `2026-04-08`

**3. `public/robots.txt` — Add `/help` route**
- Add `Allow: /help` to the allow list

**4. `src/pages/Help.tsx` — Update `setSEO` meta description**
- Refresh the meta description to reference 2026 models and agentic AI

