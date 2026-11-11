// Vérifie que les liens internes et les ressources des pages générées existent dans dist/.
import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";

const DIST = new URL("../dist/", import.meta.url).pathname;
// Routes servies par les fonctions Cloudflare ou par _redirects.
const DYNAMIC = [/^\/documents\//, /^\/medias\//, /^\/api\//];

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (e.name.endsWith(".html")) out.push(p);
  }
  return out;
}
const exists = (p) => stat(p).then(() => true, () => false);

let errors = 0;
for (const file of await walk(DIST)) {
  const html = await readFile(file, "utf8");
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  for (const [, url] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if (/^(https?:|mailto:|tel:|data:)/.test(url)) continue;
    const [pathQ, hash] = url.split("#");
    const path = pathQ.split("?")[0];
    if (!pathQ && hash) {
      if (!ids.has(hash)) { console.error(`✗ ${file}: ancre #${hash} absente`); errors++; }
      continue;
    }
    if (DYNAMIC.some((re) => re.test(path))) continue;
    const target = join(DIST, path.endsWith("/") ? path + "index.html" : path);
    if (!(await exists(target))) { console.error(`✗ ${file.replace(DIST, "")}: lien cassé ${url}`); errors++; continue; }
    if (hash && target.endsWith(".html")) {
      const t = await readFile(target, "utf8");
      if (!t.includes(`id="${hash}"`)) { console.error(`✗ ${file.replace(DIST, "")}: ancre ${url} absente`); errors++; }
    }
  }
}
console.log(errors ? `${errors} problème(s)` : "✓ Tous les liens internes sont valides");
process.exit(errors ? 1 : 0);
