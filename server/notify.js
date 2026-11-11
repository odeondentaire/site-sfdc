// Notification par e-mail des demandes d'adhésion, via l'API transactionnelle
// de Brevo (société française, données hébergées dans l'Union européenne).
// Configuration :
//   - BREVO_API_KEY : secret à créer dans Cloudflare Pages (Settings → Variables and Secrets)
//   - NOTIFY_TO / NOTIFY_FROM : dans wrangler.toml
// Si la clé est absente, rien n'est envoyé : la demande reste enregistrée dans R2.

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const LABELS = {
  type_adhesion: "Type d'adhésion",
  nom: "Nom",
  email: "E-mail",
  profession: "Profession",
  structure: "Structure / ville",
  objet: "Objet",
  message: "Message",
};

export async function notifyAdhesion(env, data, id) {
  if (!env.BREVO_API_KEY || !env.NOTIFY_TO || !env.NOTIFY_FROM) return { sent: false, reason: "non configuré" };

  const rows = Object.entries(LABELS).filter(([k]) => data[k]);
  const text =
    "Nouvelle demande d'adhésion reçue sur sfdc-cancer.fr\n\n" +
    rows.map(([k, l]) => `${l} : ${data[k]}`).join("\n") +
    `\n\nÀ faire : répondre avec le montant de la cotisation et le RIB.\nRéférence : ${id}\n`;
  const html =
    `<p><strong>Nouvelle demande d'adhésion reçue sur sfdc-cancer.fr</strong></p><table cellpadding="6">` +
    rows.map(([k, l]) => `<tr><td><strong>${esc(l)}</strong></td><td>${esc(data[k]).replace(/\n/g, "<br>")}</td></tr>`).join("") +
    `</table><p>À faire : répondre (bouton « Répondre ») avec le montant de la cotisation et le RIB.</p><p style="color:#777">Référence : ${esc(id)}</p>`;

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": env.BREVO_API_KEY, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      sender: { name: "Site SFDC", email: env.NOTIFY_FROM },
      to: [{ email: env.NOTIFY_TO, name: "SFDC" }],
      replyTo: { email: data.email, name: data.nom },
      subject: `Demande d'adhésion – ${data.nom}`,
      textContent: text,
      htmlContent: html,
    }),
  });
  if (!res.ok) {
    console.error("Brevo:", res.status, await res.text());
    return { sent: false, reason: `Brevo ${res.status}` };
  }
  return { sent: true };
}
