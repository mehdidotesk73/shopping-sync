// Parses text pasted from elsewhere (an Apple Notes checklist, a plain list, a comma-separated
// line) into bare item names. Category/store/quantity aren't part of this — those are added or
// edited afterward through the normal grid, same as any other item.

function stripLinePrefix(line: string): string {
  return line
    .replace(/^[-*•]\s*\[[ xX]\]\s*/, '') // markdown checkbox: "- [ ] " / "- [x] "
    .replace(/^[-*•]\s+/, '') // plain bullet: "- " / "* " / "• "
    .replace(/^\d+[.)]\s+/, '') // numbered: "1. " / "1) "
    .trim()
}

export function parsePastedItems(text: string): string[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  // A single line is ambiguous between "one item" and "a comma-separated list on one line" —
  // commas inside it settle it in favor of the list, since a real item name rarely has one.
  if (lines.length <= 1) {
    const only = lines[0] ?? ''
    if (only.includes(',')) {
      return only
        .split(',')
        .map((part) => stripLinePrefix(part.trim()))
        .filter(Boolean)
    }
    const stripped = stripLinePrefix(only)
    return stripped ? [stripped] : []
  }

  return lines.map(stripLinePrefix).filter(Boolean)
}
