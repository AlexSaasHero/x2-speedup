// Locale compiler: src/_locales/<lang>.json ({ key: "text with {1}" }) → Chrome messages.json.
// - Literal "$" is escaped as "$$" (Chrome treats "$" specially).
// - {1}…{9} become named placeholders ($p1$ → $1).
// - Keys starting with "//" are comments.
// - Every locale must have exactly the keys of en.json.
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export function toChromeMessages(src) {
  const out = {};
  for (const [key, text] of Object.entries(src)) {
    if (key.startsWith('//')) continue;
    const placeholders = {};
    const message = String(text)
      .replace(/\$/g, '$$$$')
      .replace(/\{(\d)\}/g, (_, n) => {
        placeholders[`p${n}`] = { content: `$${n}` };
        return `$p${n}$`;
      });
    out[key] = Object.keys(placeholders).length ? { message, placeholders } : { message };
  }
  return out;
}

const realKeys = (obj) => Object.keys(obj).filter((k) => !k.startsWith('//')).sort();

export async function readLocaleSources(srcDir) {
  const files = (await readdir(srcDir)).filter((f) => f.endsWith('.json'));
  const out = {};
  for (const f of files) out[f.replace(/\.json$/, '')] = JSON.parse(await readFile(path.join(srcDir, f), 'utf8'));
  return out;
}

/** Problems per locale compared to en (missing / extra keys, placeholder mismatch). */
export function checkLocales(sources) {
  const problems = [];
  const en = sources.en;
  if (!en) return ['en.json is missing'];
  const enKeys = realKeys(en);
  for (const [lang, src] of Object.entries(sources)) {
    const keys = realKeys(src);
    const missing = enKeys.filter((k) => !keys.includes(k));
    const extra = keys.filter((k) => !enKeys.includes(k));
    if (missing.length) problems.push(`${lang}: missing ${missing.join(', ')}`);
    if (extra.length) problems.push(`${lang}: extra ${extra.join(', ')}`);
    for (const k of enKeys) {
      if (!(k in src)) continue;
      const want = (String(en[k]).match(/\{\d\}/g) ?? []).sort().join();
      const got = (String(src[k]).match(/\{\d\}/g) ?? []).sort().join();
      if (want !== got) problems.push(`${lang}.${k}: placeholders ${got || 'none'} ≠ en ${want || 'none'}`);
    }
  }
  return problems;
}

export async function buildLocales(srcDir, outdir) {
  const sources = await readLocaleSources(srcDir);
  const problems = checkLocales(sources);
  if (problems.length) throw new Error(`locale errors:\n  ${problems.join('\n  ')}`);
  for (const [lang, src] of Object.entries(sources)) {
    await mkdir(path.join(outdir, '_locales', lang), { recursive: true });
    await writeFile(path.join(outdir, '_locales', lang, 'messages.json'), JSON.stringify(toChromeMessages(src), null, 2));
  }
  return Object.keys(sources);
}
