// Générateur statique sans dépendance pour le site de la SFDC.
// Chaque page de src/pages/**/index.html commence par un commentaire
// <!--{ ...métadonnées JSON... }--> puis contient le corps de la page.
// Le gabarit commun (en-tête, pied de page) est dans src/partials/.
// Sortie : dist/ (dossier publié par Cloudflare Pages).

import { readFile, writeFile, mkdir, readdir, cp, rm } from "node:fs/promises";
import { join, dirname, relative } from "node:path";

const ROOT = dirname(new URL(import.meta.url).pathname);
const SRC = join(ROOT, "src");
const OUT = join(ROOT, "dist");
const SITE_URL = "https://sfdc-cancer.fr";

const NAV = [
  { id: "la-sfdc", href: "/la-sfdc/", label: "La SFDC" },
  { id: "ruban", href: "/ruban-du-sourire/", label: "Le Ruban du Sourire" },
  { id: "pro", href: "/professionnels/", label: "Professionnels" },
  { id: "patients", href: "/patients/", label: "Patients et aidants" },
  { id: "actualites", href: "/actualites/", label: "Actualités" },
  { id: "contact", href: "/contact/", label: "Contact" },
];

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(p)));
    else if (entry.name.endsWith(".html")) out.push(p);
  }
  return out;
}

function parsePage(raw, file) {
  const m = raw.match(/^\s*<!--(\{[\s\S]*?\})-->\s*/);
  if (!m) throw new Error(`Métadonnées manquantes dans ${file}`);
  return { meta: JSON.parse(m[1]), body: raw.slice(m[0].length) };
}

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function render(layout, header, footer, page, urlPath) {
  const { meta, body } = page;
  const nav = NAV.map(
    (n) =>
      `<li><a href="${n.href}"${n.id === meta.nav ? ' aria-current="page"' : ""}>${n.label}</a></li>`
  ).join("\n          ");
  const title = meta.title === "Accueil"
    ? "SFDC – Société française de dentisterie en cancérologie"
    : `${meta.title} – SFDC`;
  const image = `${SITE_URL}${meta.image || "/assets/img/parcours-pluridisciplinaire-og.jpg"}`;
  const canonical = `${SITE_URL}${urlPath}`;
  const vars = {
    TITLE: esc(title),
    DESCRIPTION: esc(meta.description || ""),
    CANONICAL: canonical,
    OG_IMAGE: image,
    BODY_CLASS: meta.bodyClass || "",
    ROBOTS: meta.noindex ? "noindex" : "index, follow",
    HEADER: header.replace("{{NAV}}", nav),
    FOOTER: footer.replace("{{YEAR}}", String(new Date().getFullYear())),
    CONTENT: body,
  };
  return layout.replace(/\{\{(\w+)\}\}/g, (all, k) => (k in vars ? vars[k] : all));
}

async function main() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  await cp(join(ROOT, "static"), OUT, { recursive: true });

  const [layout, header, footer] = await Promise.all(
    ["layout.html", "header.html", "footer.html"].map((f) => readFile(join(SRC, "partials", f), "utf8"))
  );

  const pagesDir = join(SRC, "pages");
  const sitemap = [];
  for (const file of await walk(pagesDir)) {
    const rel = relative(pagesDir, file);
    const page = parsePage(await readFile(file, "utf8"), rel);
    const urlPath = rel === "404.html" ? "/404" : "/" + rel.replace(/index\.html$/, "");
    const html = render(layout, header, footer, page, urlPath);
    const dest = join(OUT, rel);
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, html);
    if (!page.meta.noindex) sitemap.push(urlPath);
  }

  const today = new Date().toISOString().slice(0, 10);
  await writeFile(
    join(OUT, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      sitemap.sort().map((u) => `  <url><loc>${SITE_URL}${u}</loc><lastmod>${today}</lastmod></url>`).join("\n") +
      `\n</urlset>\n`
  );
  console.log(`✓ ${sitemap.length} pages générées dans dist/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
