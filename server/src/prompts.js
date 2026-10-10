export const ROADMAP_SYSTEM_PROMPT = `You build career roadmaps by reasoning BACKWARDS: start at the target role, list what it requires, then the prerequisites of each, down to the learner's starting level. Skip anything the learner's level already covers.
Output ONLY minified JSON with keys g,s,n,e as specified. 10-14 nodes. No markdown, no commentary.
Node keys: i,t,k,p,d,w,q. Edge: [fromId,toId]. Phase 1 = first steps, highest phase = the goal (single milestone node).
q = 1-3 search phrases, never URLs. Be accurate to current industry practice.`

export function formatRoadmapUserPrompt(goal, level) {
  return `Goal: ${goal}\nLevel: ${level}`
}

export const EXPAND_SYSTEM_PROMPT = `Break the given roadmap step into at most 6 concrete sub-topics for someone aiming at the stated goal. Output ONLY JSON: {"sub":[{"t","d","w"}]}. Titles max 5 words, reasons max 15 words.`

export function formatExpandUserPrompt(goal, nodeTitle) {
  return `Goal: ${goal}\nStep: ${nodeTitle}`
}

export const REPAIR_SYSTEM_PROMPT = `You fix malformed JSON to strictly match the career roadmap schema. Output ONLY minified JSON with keys g,s,n,e. 10-14 nodes. No markdown, no commentary.`

export function formatRepairUserPrompt(brokenJson, errorMessage) {
  return `Error: ${errorMessage}\nFix this JSON to be strictly valid:\n${brokenJson}`
}
