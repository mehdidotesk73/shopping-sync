/**
 * Deterministic background/text color for a tag, derived from its text so the same
 * category or store name always renders the same color everywhere in the app.
 */
export function tagColor(text: string): { background: string; color: string } {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0
  }
  const hue = hash % 360
  return { background: `hsl(${hue}, 55%, 38%)`, color: '#fff' }
}
