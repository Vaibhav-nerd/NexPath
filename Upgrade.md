upgrade.md — Futuristic UI Upgrade (speed-safe)

For: the AI agent working in client/. Mission: make the roadmap graph UI feel futuristic (lighting, animation, depth) without losing speed. Keep the graph-like layout the user already loves.

1. Rule precedence (read first)

This file amends the visual rules only. It does not remove safety, cost, or performance rules.

This file overrides precision-rules.md for:

§4 Color (dark theme, glow colors, gradients on the background only)
§5 Shape and elevation (glow and glass allowed where listed below)
§10 Motion (the animations listed in §5 below are allowed)

Still fully in force (do NOT bypass):

SKILL.md invariants and cost rules
precision-rules.md §1–3, §6 (node size 200×72), §7–9, §11 accessibility, §12 performance
The protected zone below

If any task seems to need a change that this file does not allow, stop and ask.

2. Protected zone (never modify)
server/ (all of it), .env, .gitignore
Roadmap JSON schema and its zod validators
API calls in client/src/api.js (behavior, endpoints, request count)
Cache, rate-limit, daily-cap logic
Node size constants shared with layout.js (200×72)

Only edit client/src/ styles and presentational components. No new network calls. No new dependencies without asking.

3. Performance budget (hard limits)
Metric	Limit
Frame rate while panning/hovering	≥ 55 fps at 14 nodes, ≥ 45 fps at 40 nodes
Extra JS added	≤ 10 KB gzipped, no animation libraries
React re-renders on mouse move	0 (use CSS variables, not state)
Layout re-runs on hover/select/complete	0
Animated properties	transform and opacity only

If a change breaks a limit, revert that change and report it.

4. Visual theme (all in client/src/theme.css)

Define tokens as CSS variables. Do not hardcode colors in components.

css
:root {
  --bg: #0a0e17;
  --surface: #121826;
  --line: rgba(255,255,255,.10);
  --ink: #e8edf5;
  --muted: #8b95a7;
  --accent: #3dd6f5;      /* selection, primary action */
  --accent-2: #8b7cff;    /* path highlight, secondary glow */
  --done: #3ddc97;
  --glow: 0 0 0 1px var(--accent);   /* applied via pseudo-element */
}
Provide a light variant under prefers-color-scheme: light with equal contrast.
Text contrast stays ≥ 4.5:1.
5. Effects allowed (all in client/src/effects.css)

Lighting

Cursor spotlight: one radial-gradient on the background layer. Update --mx/--my via requestAnimationFrame directly on the element's style. No React state.
Selected-node glow: a ::after pseudo-element with the glow; fade its opacity. Never animate box-shadow.
Depth: static dot grid and soft vignette on the background.
Goal node: a slow, subtle breathing glow using opacity on a pseudo-element (single element only).

Animation 5. Entrance: nodes fade and slide in (transform + opacity), staggered by phase, once per roadmap, max 400ms total. 6. Edge flow: animated stroke-dashoffset on the selected path only; other edges fade to 40% opacity. 7. Hover: transform: scale(1.03), 120ms. 8. Step complete: one-time pulse ring (transform + opacity), 400ms. 9. Side panel: slide in with transform, 150ms. This is the only element allowed backdrop-filter. 10. Camera: smooth setCenter zoom to a node on select (duration ≤ 400ms).

Banned (performance)

Animating box-shadow, width, height, top, left
filter: blur() / drop-shadow() / SVG filters on nodes or edges
Infinite animation on more than one element
Per-frame React state updates
Global will-change (apply only to the node animating, then remove)
6. Safeguards (required)
Lite mode: when nodes > 30, disable the cursor spotlight, edge flow, and goal breathing. Keep the static theme.
Pause all animation when document.hidden.
Honor prefers-reduced-motion: reduce (disable all motion, keep static styling).
Put one data-fx="off" attribute switch on the root that disables every effect in effects.css.
React.memo on NodeCard; memoize nodeTypes, edgeTypes, layout output.
7. Workflow rules
One task per run. Do the first task marked todo, then stop.
Before starting: confirm git status is clean and a v1 tag exists. If not, stop and tell the user.
Work on a branch (ui-futuristic). One commit per task: feat(ui): <task>.
Use LLM_MOCK=true for all testing. No real API calls.
After each task: run the verification in §9, show evidence, update the task to done.
8. Tasks
1. Theme tokens — done

Create theme.css with §4 tokens; apply to background, surface, text, borders. No component logic changes. Done when: app renders in the new theme, contrast verified, graph and panel unchanged in behavior.

2. Node and edge styling — done

Restyle NodeCard and edges using tokens. Keep kind encoding (solid / left bar / dashed / filled goal) and 200×72 size. Done when: all four kinds are distinguishable without color alone; layout positions unchanged.

3. Lighting layer — done

Implement effects 1–4 in effects.css plus the rAF spotlight. Done when: 0 React renders on mouse move (verify in React DevTools Profiler), ≥ 55 fps.

4. Motion layer — todo

Implement effects 5–8 and 10. Done when: entrance plays once per roadmap, hover and complete do not trigger layout, ≥ 55 fps.

5. Side panel and query bar — todo

Glass panel with slide-in (effect 9); restyle query bar with focus glow (pseudo-element). Done when: panel animation smooth at 375px, 768px, 1440px; Esc closes it.

6. Safeguards — todo

Implement lite mode, document.hidden pause, reduced-motion, and the data-fx="off" switch (§6). Done when: each safeguard is demonstrated (screenshot or recorded note) with a 40-node mock.

7. Final audit — todo

Run the full checklist in §9 and the precision-rules.md §13 checklist. Report remaining risks.

9. Verification (evidence required)
 DevTools Performance recording: pan, hover, select, complete a step. Report fps.
 React Profiler: no renders on mouse move; no layout re-run on hover/select/complete
 Bundle size delta ≤ 10 KB gzipped (vite build output compared with before)
 git diff --stat: only client/src/ style/presentational files changed
 Main flow works: new query (mock), repeat query, node click, "Go deeper", mark complete
 Screenshots at 375px, 768px, 1440px
 Reduced-motion and data-fx="off" both disable motion correctly
10. Report format (end of every task)
What changed (files)
fps / bundle numbers measured
Anything reverted for breaking a limit
Next task to run