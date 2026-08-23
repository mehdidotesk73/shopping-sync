/**
 * Deterministic hue for a ghost-style tag (transparent fill, colored border + text),
 * derived from its text so the same category or store name always renders the same
 * color everywhere in the app. Exposed as a CSS custom property so the `.color-tag`
 * class can pick a theme-appropriate lightness (see `--tag-lightness` in vars.css)
 * instead of baking in one that only reads well in dark mode.
 */
export function tagColor(text: string): Record<string, string> {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0
  }
  const hue = hash % 360
  return { '--tag-hue': String(hue) }
}
