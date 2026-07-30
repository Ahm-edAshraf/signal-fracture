const originalMessageMarkers = [
  /^-{2,}\s*original message\s*-{2,}$/i,
  /^on .+wrote:$/i,
  /^from:\s.+$/i,
  /^sent:\s.+$/i,
  /^subject:\s.+$/i,
];

export function stripEmailQuotedReply(text: string): string {
  const kept: string[] = [];
  for (const line of text.replaceAll("\r\n", "\n").split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith(">")) continue;
    if (originalMessageMarkers.some((marker) => marker.test(trimmed))) break;
    kept.push(line);
  }
  return kept.join("\n").trim();
}
