/**
 * Sanitizes HTML content for email templates to enforce security.
 * Removes script tags, iframes, objects, embeds, forms, inline JavaScript event handlers,
 * and unsafe URI schemes (javascript:), while preserving layout tags, inline styles,
 * `<style>` blocks, and `{{variable}}` template placeholders.
 */
export function sanitizeEmailHtml(html: string): string {
  if (!html || typeof html !== "string") return "";

  let clean = html;

  // 1. Remove script tags and content
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

  // 2. Remove iframe, object, embed, applet, form, input tags
  clean = clean.replace(/<\/?(iframe|object|embed|applet|form|input|button|textarea|select|option)\b[^>]*>/gi, "");

  // 3. Remove inline event handlers (e.g. onclick=, onload=, onerror=, onmouseover=, etc.)
  clean = clean.replace(/\s+on[a-z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, "");

  // 4. Remove javascript: and vbscript: URIs from href, src, etc.
  clean = clean.replace(/(href|src|action|data)\s*=\s*['"]?\s*(?:javascript|vbscript):[^'"]*['"]?/gi, '$1="#"');

  return clean;
}
