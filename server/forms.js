// Outils communs aux formulaires (adhésion, contact).
// Les réponses sont enregistrées en JSON dans le bucket R2 « database-sfdc »
// (liaison SFDC_BUCKET déclarée dans wrangler.toml / le tableau de bord Cloudflare).

const MAX_BODY = 20_000; // octets
const MIN_ELAPSED_MS = 2500; // anti-robot : délai minimal de remplissage

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export async function readJson(request) {
  const type = request.headers.get("Content-Type") || "";
  if (!type.includes("application/json")) throw new FormError("Format de requête non pris en charge.", 415);
  const text = await request.text();
  if (text.length > MAX_BODY) throw new FormError("Le message est trop long.", 413);
  try {
    const data = JSON.parse(text);
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error();
    return data;
  } catch {
    throw new FormError("Requête invalide.", 400);
  }
}

export class FormError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

/** Détecte les envois automatisés (champ piège rempli ou envoi trop rapide). */
export function isBot(data) {
  if (typeof data.site_web === "string" && data.site_web.trim() !== "") return true;
  const elapsed = Number(data._elapsed);
  return Number.isFinite(elapsed) && elapsed < MIN_ELAPSED_MS;
}

const EMAIL_RE = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']{2,}$/;

/**
 * Ne conserve que les champs attendus, tronque et nettoie les valeurs.
 * schema : { champ: { max, required, email, oneOf } }
 */
export function clean(data, schema) {
  const out = {};
  for (const [key, rule] of Object.entries(schema)) {
    let v = data[key];
    if (Array.isArray(v)) v = v.join(", ");
    v = typeof v === "string" ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim() : "";
    if (v.length > (rule.max || 200)) v = v.slice(0, rule.max || 200);
    if (rule.required && !v) throw new FormError(`Le champ « ${rule.label || key} » est obligatoire.`);
    if (v && rule.email && !EMAIL_RE.test(v)) throw new FormError("L'adresse e-mail semble invalide.");
    if (v && rule.oneOf && !rule.oneOf.includes(v)) throw new FormError(`Valeur invalide pour « ${rule.label || key} ».`);
    if (v) out[key] = v;
  }
  return out;
}

/** Enregistre un formulaire dans R2 : formulaires/<dossier>/AAAA/MM/<horodatage>-<id>.json */
export async function store(env, folder, record) {
  if (!env.SFDC_BUCKET) throw new FormError("Stockage indisponible (liaison R2 absente).", 500);
  const now = new Date();
  const id = crypto.randomUUID();
  const iso = now.toISOString();
  const key = `formulaires/${folder}/${iso.slice(0, 4)}/${iso.slice(5, 7)}/${iso.replace(/[:.]/g, "-")}-${id}.json`;
  const payload = { id, formulaire: folder, recuLe: iso, ...record };
  await env.SFDC_BUCKET.put(key, JSON.stringify(payload, null, 2), {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
    customMetadata: { formulaire: folder },
  });
  return { id, key };
}

export async function handle(request, fn) {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof FormError) return json({ ok: false, error: err.message }, err.status);
    console.error(err);
    return json({ ok: false, error: "Erreur inattendue." }, 500);
  }
}
