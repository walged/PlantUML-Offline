/**
 * Minimal SVG sanitizer for diagram previews.
 *
 * The preview injects server-rendered SVG via dangerouslySetInnerHTML. The SVG
 * comes from the (local or configured) PlantUML server, but to be safe we strip
 * active content — scripts, event handlers, and external/`javascript:` URLs —
 * before it touches the DOM. This is defense-in-depth for the security audit.
 */
export function sanitizeSvg(svg: string): string {
  if (!svg) return "";

  let out = svg;

  // Remove <script>...</script> blocks.
  out = out.replace(/<script[\s\S]*?<\/script>/gi, "");

  // Remove inline event handlers like onclick="...", onload='...'.
  out = out.replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "");
  out = out.replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "");
  out = out.replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "");

  // Neutralize javascript: URLs in href/xlink:href.
  out = out.replace(/(href\s*=\s*["'])\s*javascript:[^"']*(["'])/gi, "$1#$2");

  // Remove <foreignObject> which can embed arbitrary HTML.
  out = out.replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "");

  return out;
}
