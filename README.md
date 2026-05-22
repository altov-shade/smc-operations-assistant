# SMC Operations Assistant

A lightweight retrieval-style chat assistant for the **fictional** Southern Metro Conference (SMC). Built as a portfolio demo using Next.js (App Router) + the Anthropic Claude API.

> All conference materials in this project are fictional and created for demonstration purposes. No NCAA or real conference branding is used.

## What it does

- Answers operational questions grounded **only** in the uploaded SMC documents (`knowledge-base/*.md`).
- Streams responses in the structured operational format defined in the system prompt (Primary Guidance Source → Event Operations Guidance → Supporting Sources → Confidence → Key Procedural Language → Event Staff Takeaways).
- Cites the source document and section for every answer.
- Returns `"I do not know based on the currently provided SMC documentation."` when guidance is missing rather than inventing policy.

## Stack

- **Next.js 15** (App Router, Node runtime)
- **TypeScript + Tailwind CSS**
- **Anthropic Claude API** via `@anthropic-ai/sdk`
  - Model: `claude-opus-4-7`
  - System prompt + knowledge base sent as a single cached system block (prompt caching, `cache_control: { type: "ephemeral" }`)
  - Streamed responses

## Local development

```bash
cd ~/projects/smc-operations-assistant
cp .env.local.example .env.local       # add your Anthropic API key
npm install
npm run dev                            # http://localhost:3000
```

Required env var:

| Name | Value |
|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic API key (`sk-ant-...`) |

## Updating the knowledge base

The corpus lives at `knowledge-base/*.md`. Each file is included verbatim in the system prompt at request time. To add or update a document:

1. Drop a `.md` file in `knowledge-base/` — the first `# Heading` line becomes the document title used in citations.
2. Redeploy (or restart `npm run dev`). The KB is cached in-process, so a server restart picks up changes.

For best caching behavior, avoid editing the KB on every request — Anthropic's prompt cache invalidates whenever the cached prefix bytes change.

## Deploying to Vercel

This is a standard Next.js project — deploy works out of the box.

1. Push the directory to a new GitHub repo:
   ```bash
   git init && git add . && git commit -m "Initial commit"
   gh repo create smc-operations-assistant --private --source=. --push
   ```
2. In Vercel, **Import Project** → select the repo.
3. Under **Environment Variables**, add `ANTHROPIC_API_KEY`.
4. Deploy. No build config changes needed.

## Embedding as a dashboard card

The app is a single page at `/`. To link it from another dashboard, add a card that links to the deployed URL — e.g.

```html
<a href="https://your-smc-app.vercel.app" class="card">
  <h3>SMC Operations Assistant</h3>
  <p>Retrieval assistant over Southern Metro Conference operational documents.</p>
</a>
```

## Project layout

```
app/
  api/chat/route.ts      Streaming chat endpoint (Anthropic SDK)
  layout.tsx             Root layout
  page.tsx               Chat UI
  globals.css            Tailwind + base styles
lib/
  system-prompt.ts       SMC system instructions
  knowledge-base.ts      Loads + composes knowledge-base/*.md into one block
knowledge-base/          Authoritative SMC operational docs (markdown)
```

## Notes

- The system prompt + KB block are sent on every request but **prompt caching** means subsequent calls within ~5 minutes pay ~10% of the input cost for that prefix.
- The assistant streams plaintext; the client parses the structured section labels (`PRIMARY GUIDANCE SOURCE:`, etc.) and renders them as scannable sections.
- Event staff retain final operational authority — the assistant is a retrieval aid, not a decision-maker.
