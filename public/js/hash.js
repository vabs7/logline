// Cinerolls - Client-Side Hashing & Normalization using Web Crypto API

/**
 * Normalizes logline body text:
 * Lowercases, strips punctuation, collapses whitespace, trims.
 */
export function normalizeBody(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Computes SHA-256 hash of normalized text using browser native crypto.subtle.
 * @param {string} text - Raw logline body
 * @returns {Promise<string>} Hex-encoded SHA-256 hash
 */
export async function computeContentHash(text) {
  const normalized = normalizeBody(text);
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
