# precision-rules.md — Clean Interface Rules

> **For:** the AI agent building the Career Roadmap UI (`client/`).
> **Place at:** `.agent/rules/precision-rules.md` (or repo root, and reference it from `SKILL.md`).
> **Principle:** every pixel must carry information. If an element does not help the user read, choose, or act, remove it. These rules override personal taste; when unsure, choose the quieter option.

---

## 1. Layout

- **Two regions only:** query bar (top, fixed height 64px) and workspace (graph fills the rest). The side panel overlays the graph's right edge (width 360px, 100% width on mobile). No sidebars, footers, or banners.
- The **graph is the hero**. It takes at least 80% of the viewport. Nothing decorative competes with it.
- Max content width for text blocks: **65ch**. Never center-align paragraphs; left-align all text.
- Use CSS grid/flex only. No absolute positioning except the side panel, minimap, and controls.
- Responsive breakpoints: 640px and 1024px. At <640px the panel becomes a bottom sheet (max 70vh), the minimap is hidden.

## 2. Spacing (4px base, no exceptions)

Allowed values only: `4, 8, 12, 16, 24, 32, 48`.
- Inside components: 8–16. Between components: 16–24. Between regions: 24–48.
- Never use arbitrary values (`13px`, `22px`). Define as CSS variables `--s-1 … --s-7`.

## 3. Typography

- **One family** (e.g. *Public Sans*) with a system-ui fallback stack. No second family, no monospace for labels.
- Scale (px): `12, 14, 16, 20, 28`. Weights: `400` and `600` only.

| Role | Size / weight |
|---|---|
| Goal title | 28 / 600 |
| Panel heading | 20 / 600 |
| Body, node title | 14 / 600 for titles, 14 / 400 for body |
| Meta (duration, phase) | 12 / 400, muted color |

- Sentence case everywhere. **No ALL CAPS, no letter-spaced eyebrow labels, no italic emphasis, no single highlighted word in a heading.**
- Node titles: max 5 words, truncate with ellipsis at 2 lines. Full text appears in the panel.
- Line-height: 1.5 for body, 1.25 for headings.

## 4. Color (meaning first)

One neutral system, one accent, one status color. Define as CSS variables with a dark-mode set via `prefers-color-scheme`.

| Token | Light | Use |
|---|---|---|
| `--bg` | `#F6F7F9` | app background |
| `--surface` | `#FFFFFF` | nodes, panel, inputs |
| `--ink` | `#16202E` | primary text |
| `--muted` | `#5B6675` | secondary text |
| `--line` | `#D9DEE5` | borders, edges |
| `--accent` | `#2457D6` | selection, primary button, focus ring |
| `--done` | `#1E8E5A` | completed state only |

Rules:
- **Do not use a different hue per node kind.** Encode kind by shape and border (section 6), so color stays reserved for state.
- Accent appears on at most **two** things at once (selected node + primary button).
- Text contrast ≥ 4.5:1, UI boundaries ≥ 3:1. Verify; do not assume.
- No gradients, glows, or drop-shadow stacks. One shadow allowed: panel `0 8px 24px rgba(22,32,46,.12)`.

## 5. Shape and elevation

- One border radius for interactive controls (`8px`), one for nodes (`10px`). Nothing else.
- Borders are `1px solid var(--line)`. No double borders.
- Nodes are flat. Elevation is used **only** for the side panel and popovers.

## 6. Graph precision (React Flow)

**Nodes**
- Fixed size **200 × 72px**. Set the same numbers in `layout.js` for dagre so nothing overlaps.
- Content: title (14/600), then one meta line: `duration · phase` is **not** allowed (no dot-joined strings). Use the duration alone, e.g. `3 weeks`, with the phase shown by column position.
- Kind encoding:
  - `skill`: white surface, solid 1px border
  - `project`: white surface, 4px accent **left bar**
  - `cert`: white surface, **dashed** 1px border
  - `milestone` (the goal): filled `--ink` background, white text
- State encoding: `selected` = 2px accent outline; `done` = `--done` check icon (16px) top right and muted title; `locked` is **not** used (all nodes stay clickable).

**Edges**
- 1.5px, `--line` color, smoothstep type, small arrowhead. No animated edges, no labels.
- On node hover/select, highlight that node's incoming and outgoing edges in `--accent` and fade unrelated edges to 40% opacity.

**Layout**
- dagre `rankdir: "LR"`, `ranksep: 80`, `nodesep: 24`. Phase 1 on the left, the goal on the right.
- Run `fitView` once after layout with `padding: 0.15`. Do not re-fit on every state change (progress toggles must not move the camera).
- Minimap and zoom controls: bottom-left, monochrome, default off on mobile.
- Show at most **~40 nodes** after expansions; beyond that, collapse expanded children under their parent.

## 7. Components

**Query bar**
- Single text input (placeholder: `What do you want to become?`), level select, one primary button `Generate roadmap`.
- Enter submits. Button is disabled while loading. Character count appears only at 80% of `MAX_QUERY_CHARS`.

**Side panel**
- Order: title → duration → why it matters → search phrases (as links) → actions.
- Actions: `Mark complete` (toggle) and `Go deeper` (one-time per node, disabled after use with the label `Expanded`).
- Close with Esc, the close button, or clicking empty graph space.

**Progress**
- A 4px bar under the query bar plus text `4 of 12 steps complete`. No circular charts.

## 8. States (always design all five)

| State | Behavior |
|---|---|
| Empty | One sentence of direction plus 3 example goals as plain text buttons. No illustration. |
| Loading | Skeleton of 5 node-sized blocks in the graph area. Text: `Building your roadmap…`. |
| Success | Graph fades in once (≤200ms). Show a small `Cached` tag only when `cached: true`. |
| Error | Inline message above the graph: what failed and what to do. Include a `Try again` button. Never apologize, never show codes or stack traces. |
| Limit | For 429: `You've reached today's limit. Try again tomorrow.` Disable submit. |

## 9. Copy

- Plain verbs, sentence case, active voice. Name the action exactly: `Generate roadmap`, `Mark complete`, `Go deeper`.
- The same action uses the same word everywhere (button, toast, panel).
- No marketing text, no emojis in UI chrome, no `→` appended to buttons.
- Error format: `<What happened>. <What to do>.` Example: `The roadmap could not be read. Try again in a moment.`

## 10. Motion

- No motion on page load, scroll, or hover. Motion only answers an action:
  - panel open/close: 150ms ease-out slide
  - node complete: 120ms check fade-in
  - new expanded nodes: 150ms fade-in
- Respect `prefers-reduced-motion`: disable all of the above.

## 11. Accessibility (quality floor)

- Every control reachable by keyboard; visible 2px focus ring in `--accent` with 2px offset.
- Nodes are focusable buttons (`role="button"`, `aria-label="<title>, <duration>, <done|not done>"`). Arrow keys move focus between connected nodes if feasible; Enter opens the panel.
- Do not rely on color alone for state (use icon + label).
- Touch targets ≥ 44×44px on mobile.
- Provide a **list view toggle** (ordered by phase) as a text alternative to the graph.

## 12. Performance rules for the UI

- Memoize `nodeTypes`, `edgeTypes`, and layout output (`useMemo`). Define them outside the component or memoize; never recreate per render.
- Wrap `NodeCard` in `React.memo`.
- Progress toggles update node data only; they must not trigger a dagre re-layout.
- No UI library beyond React Flow and what the guide lists. Plain CSS (variables) or CSS modules. No animation libraries.
- Lazy-load `html-to-image` only when the user clicks Export.

## 13. Review checklist (run before finishing any UI task)

- [ ] Only allowed spacing, font sizes, weights, and radii are used (grep for stray px values)
- [ ] No ALL CAPS, dot-joined strings, gradients, or per-kind hues
- [ ] Node size in CSS equals node size in `layout.js`
- [ ] All five states render correctly (empty, loading, success, error, limit)
- [ ] Keyboard-only run-through works: query → graph → panel → close
- [ ] Contrast measured on text, muted text, and borders in light and dark mode
- [ ] Verified at 375px, 768px, 1440px (screenshot each with the browser tool)
- [ ] Toggling `done` does not move the camera or re-layout
- [ ] No console warnings; no layout shift when the graph appears
- [ ] Removed one element that was not needed
