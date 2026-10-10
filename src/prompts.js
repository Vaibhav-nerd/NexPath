export const ROADMAP_SYSTEM_PROMPT = `You build career roadmaps by reasoning BACKWARDS: start at the target role, list what it requires, then the prerequisites of each, down to the learner's starting level. Skip anything the learner's level already covers.
Output ONLY minified JSON with exactly these 4 top-level keys:
- g: string (target role goal name)
- s: string (one-sentence overview under 25 words)
- n: array of 10-14 nodes. Each node object MUST have: {"i":"n1","t":"Title max 5 words","k":"skill"|"project"|"milestone"|"cert","p":1,"d":"duration like 2w","w":"why it matters max 20 words","q":["search phrase 1"]}
- e: array of directed edges [fromId, toId]
Phase 1 = first steps. Highest phase = the goal (exactly ONE node with kind 'milestone'). Every non-phase-1 node has an incoming edge. Every non-goal node has an outgoing edge. No cycles.
q = 1-3 search phrases, never URLs. Output ONLY valid JSON.`

export function formatRoadmapUserPrompt(goal, level) {
  return `Goal: ${goal}\nLevel: ${level}`
}

export const EXPAND_SYSTEM_PROMPT = `Break the given roadmap step into at most 6 concrete sub-topics for someone aiming at the stated goal. Output ONLY JSON with shape: {"sub":[{"t":"Topic title","d":"duration like 2d","w":"short reason"}]}. Titles max 5 words, reasons max 15 words.`

export function formatExpandUserPrompt(goal, nodeTitle) {
  return `Goal: ${goal}\nStep: ${nodeTitle}`
}

export const REPAIR_SYSTEM_PROMPT = `You fix malformed JSON to strictly match the career roadmap schema. Output ONLY valid JSON with top-level keys g (string), s (string), n (array of 10-14 node objects {i,t,k,p,d,w,q}), e (array of edges [from,to]). No markdown, no commentary.`

export function formatRepairUserPrompt(brokenJson, errorMessage) {
  return `Error: ${errorMessage}\nFix this JSON to strictly follow {g: string, s: string, n: 10-14 nodes [{i,t,k,p,d,w,q}], e: edges [[from,to]]}:\n${brokenJson}`
}
