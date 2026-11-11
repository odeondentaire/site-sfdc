// Sert en lecture seule des fichiers publics stockés dans R2
// (ex. documents/statuts-sfdc.pdf, medias/photo.jpg).
// Si le fichier n'est pas dans R2, on sert la version présente dans le dépôt
// (static/documents/, static/medias/) lorsqu'elle existe.

const SAFE_PATH = /^[A-Za-z0-9][A-Za-z0-9._\-\/]{0,200}$/;

export async function serveFromR2(context, prefix) {
  const { request, env, params } = context;
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Méthode non autorisée", { status: 405, headers: { Allow: "GET, HEAD" } });
  }
  const rel = Array.isArray(params.path) ? params.path.join("/") : String(params.path || "");
  if (!SAFE_PATH.test(rel) || rel.includes("..")) return new Response("Introuvable", { status: 404 });
  const fallback = () => (env.ASSETS ? env.ASSETS.fetch(request) : new Response("Introuvable", { status: 404 }));
  if (!env.SFDC_BUCKET) return fallback();

  const object = await env.SFDC_BUCKET.get(`${prefix}/${rel}`, { onlyIf: request.headers });
  if (object === null) return fallback();

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("ETag", object.httpEtag);
  headers.set("Cache-Control", "public, max-age=3600");
  headers.set("X-Content-Type-Options", "nosniff");
  // Un objet sans corps signifie que la condition If-None-Match est satisfaite.
  if (!("body" in object) || !object.body) return new Response(null, { status: 304, headers });
  return new Response(request.method === "HEAD" ? null : object.body, { headers });
}
