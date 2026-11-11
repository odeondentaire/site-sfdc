// Redirige les domaines secondaires vers le domaine principal sfdc-cancer.fr.
// (Alternative recommandée à terme : règle « Bulk Redirects » côté Cloudflare.)
const CANONICAL = "sfdc-cancer.fr";
const REDIRECT_HOSTS = new Set([
  "www.sfdc-cancer.fr",
  "dentcancer.fr",
  "www.dentcancer.fr",
  "dentcancer.com",
  "www.dentcancer.com",
]);

export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (REDIRECT_HOSTS.has(url.hostname)) {
    url.hostname = CANONICAL;
    url.protocol = "https:";
    url.port = "";
    return Response.redirect(url.toString(), 301);
  }
  return context.next();
}
