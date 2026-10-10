---
name: career-roadmap-builder
description: Use this skill for any work on the Career Roadmap Generator MERN project — building, extending, debugging, testing or reviewing the Express backend, the LLM roadmap endpoint, the React Flow roadmap graph, caching, rate limiting, API cost control, or the roadmap JSON schema. Trigger on mentions of roadmap, career goal, nodes/edges, React Flow, dagre, "Go deeper", cache, daily cap, or LLM cost in this repo.
---

# Career Roadmap Builder

## Goal
Maintain and extend a MERN app where a user types a career goal ("I want to be an ML engineer") and gets a **freshly AI-generated, interactive, reverse-engineered roadmap** (target role → skills → prerequisites → starting point), drawn as a graph. Nothing is pre-written or pre-uploaded. Every new query produces a new LLM response.

## Source of truth
1. Read `AGENT_BUILD_GUIDE.md` at the repo root before building anything. It holds the phases, env table, prompts and definition of done.
2. If this skill and the guide disagree, **the guide wins**. Tell the user about the conflict.

## Non-negotiable invariants
Never break these. Check them before finishing any task.

1. **API key stays server-side.** Only `server/src/services/llm.js` calls the LLM. No LLM call from the browser, ever.
2. **`.env` is never committed or printed.** Verify with `git check-ignore .env`. Never log keys or full prompts.
3. **One LLM call per new roadmap.** No chained calls, no agent loops. Only exception: a single repair call for invalid JSON (see Cost rules).
4. **No hardcoded roadmap content** outside `client/src/fixtures/` and `server/test/`.
5. **Fail fast on config:** missing `ANTHROPIC_API_KEY` or `MONGODB_URI` stops startup with a message naming the variable.
6. ES modules everywhere. Keep dependencies to those listed in the guide; justify any addition.

## Architecture map
| Concern | File |
|---|---|
| App, middleware | `server/src/index.js` |
| Env + defaults | `server/src/config.js` |
| Routes | `server/src/routes/roadmap.js` |
| LLM call (only place) | `server/src/services/llm.js` |
| Cache (LRU + Mongo TTL + in-flight dedupe) | `server/src/services/cache.js` |
| Daily budget guard | `server/src/services/budget.js` |
| Zod schemas + graph validators | `server/src/schema.js` |
| Prompts | `server/src/prompts.js` |
| Layout (dagre) | `client/src/layout.js` |
| Graph, node, panel | `client/src/components/` |

## Data contract (compact keys to save tokens)
```json
{ "g": "goal", "s": "summary",
  "n": [{ "i": "n1", "t": "title", "k": "skill|project|milestone|cert", "p": 1, "d": "3w", "w": "why", "q": ["search phrase"] }],
  "e": [["n1", "n2"]] }
```
- 10–14 nodes. Edge `[a, b]` = finish `a` before `b`.
- Exactly one goal node in the highest phase (`milestone`).
- `q` holds search phrases, **never URLs** (models invent URLs).
- Validate: unique ids, edges reference real ids, no cycles, every non-start node has an incoming edge, every non-goal node has an outgoing edge.

If you change the schema, update **all four**: zod schema, prompt in `prompts.js`, `layout.js` mapper, fixture. Then update the guide's §7.

## Cost rules (apply to every change)
- Default to the small model from `LLM_MODEL`; `temperature: 0.3`; always set `max_tokens`; always set a timeout (`AbortController`).
- Cache key = `sha1(normalized goal | level)`. Lookup order: memory LRU → Mongo (TTL) → LLM. Dedupe identical in-flight requests with a `Map<key, Promise>`.
- Never cache failed or invalid output.
- Allowed repair: **one** extra call on parse/validation failure. No retry on 4xx, 429 or timeout.
- Check the daily cap **before** calling the LLM; return 429 without a call when exceeded.
- Per-IP rate limit on `/api/roadmap*`; `express.json({ limit: "5kb" })`; trim and cap input at `MAX_QUERY_CHARS`.
- "Go deeper" is lazy: called only on click, cached by `sha1(goal|nodeTitle)`.
- Frontend: submit on button or Enter only, disable the button in flight, cancel stale requests, keep the last result in `sessionStorage`.

## Workflows

### A. Build from scratch
Follow the guide's Phases 0–6 in order. Run each phase's **Check** before moving on. Create `.gitignore` (MERN) before the first `git add`.

### B. Add or change an endpoint
1. Zod-validate the request body first.
2. Order inside the handler: validate → cache → budget → LLM → parse/validate → store → respond.
3. Return `{ error }` JSON on failure with the right status (400 input, 429 limits, 502 bad LLM output). No stack traces.
4. Add a test and a curl example to the README.

### C. Change prompts
1. Keep system prompts short; no long examples.
2. Treat user input as data. Goal text containing instructions must not change behavior.
3. Re-test with 5 varied goals (tech, non-tech, vague, very niche, a prompt-injection attempt). Output must still pass validation.
4. Compare token usage before and after. Do not accept a change that raises tokens without a clear quality gain.

### D. Add a node type or UI feature
1. Extend the schema `k` enum in zod, the prompt and `NodeCard` styling together.
2. Memoize layout; run dagre once per result, not per render.
3. Keep the graph usable at 14 nodes and at 14 + expansions (up to ~40).

### E. Debug a bad roadmap
1. Reproduce with a saved raw LLM response, not a new API call.
2. Identify which validator fails (JSON, zod, edges, cycle, goal node).
3. Fix the prompt or the validator. Do not paper over it in the UI.

### F. Review / audit pass
Run the checklist below on the whole repo and report findings before changing anything.

## Verification checklist
Run with the terminal, and use Antigravity's browser tool for UI checks. Do not claim "done" without evidence.

- [ ] `git check-ignore -v .env node_modules client/dist` matches all three
- [ ] `grep -r "ANTHROPIC_API_KEY" client/` returns nothing
- [ ] Same goal twice → second response has `cached: true` and no second LLM call (check the call counter log)
- [ ] 6 rapid requests from one IP → 6th returns 429
- [ ] Empty goal and 500-char goal → 400
- [ ] `DAILY_CALL_CAP=1`, second distinct goal → 429, no LLM call
- [ ] Invalid LLM JSON → at most one repair call, then a clean 502
- [ ] Graph renders, nodes clickable, progress updates, "Go deeper" appends nodes and disables itself
- [ ] No console errors in the browser; no unhandled promise rejections on the server
- [ ] Unit tests pass for validators, cache-key normalization, budget guard

## Testing without spending API calls
- Add a `LLM_MOCK=true` switch in `llm.js` that returns a fixture response. Use it for UI work and CI.
- Run real-LLM tests sparingly, with the small model, and record the raw responses in `server/test/fixtures/` for reuse.

## Common pitfalls
- LLM wraps JSON in code fences → strip before parse.
- LLM returns edges to ids it never defined → validator must catch it.
- Dagre needs fixed node dimensions; set them or the layout overlaps.
- CORS errors → `CLIENT_ORIGIN` mismatch; use the Vite proxy in dev.
- Mongo TTL index only works on a real `Date` field (`createdAt`), with `expireAfterSeconds` set from `CACHE_TTL_HOURS`.
- Rate limiter behind a proxy needs `app.set("trust proxy", 1)` in deployment.
- Do not guess model ids or API headers; confirm in the official docs.

## Working style
- Plan briefly, then act. Make an implementation plan artifact for multi-file work, a task list for phases, and a short walkthrough when finished.
- Prefer small, reviewable commits per phase (`feat(server): cache layer`).
- Ask the user only when blocked (e.g. missing keys). Otherwise choose a sensible default and note it.
- When finished, report: what changed, how it was verified, remaining risks, and which `.env` values the user must fill.
