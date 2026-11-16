/* ?company= personalization.
   Key = lowercase company name. Any company gets the board note and calling-card greeting;
   known ones also get order.skills / order.missions (ids from resume.js, listed first in that order). */

export const companies = {
  google: {
    name: 'Google',
    order: { skills: ['agents', 'aieval', 'python'], missions: ['meliona', 'arcas'] }
  },
  microsoft: {
    name: 'Microsoft',
    order: { skills: ['agents', 'js', 'flask'], missions: ['arcas', 'meliona'] }
  },
  anthropic: {
    name: 'Anthropic',
    order: { skills: ['agents', 'aieval', 'testing'], missions: ['meliona', 'arcas'] }
  }
};

const SAFE = /[^A-Za-z0-9 &.\-]/g;

/** Reads ?company= from the URL. Returns null or { key, name, order }. Text only, max 30 chars. */
export function readCompany(search = window.location.search) {
  const raw = new URLSearchParams(search).get('company');
  if (!raw) return null;
  const clean = raw.replace(SAFE, '').trim().slice(0, 30);
  if (!clean) return null;
  const key = clean.toLowerCase();
  const known = Object.prototype.hasOwnProperty.call(companies, key) ? companies[key] : null;
  return { key, name: known ? known.name : clean, order: known ? known.order : null };
}

/** Puts listed ids first, keeps the rest in original order. */
export function reorder(items, ids, getId = (x) => x.id ?? x) {
  if (!ids || !ids.length) return items.slice();
  const first = ids.map((id) => items.find((x) => getId(x) === id)).filter(Boolean);
  return [...first, ...items.filter((x) => !first.includes(x))];
}
