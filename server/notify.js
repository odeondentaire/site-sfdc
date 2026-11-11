// Notification par e-mail des demandes d'adhésion et des messages de contact, via l'API transactionnelle
// de Brevo (société française, données hébergées dans l'Union européenne).
// Configuration :
//   - BREVO_API_KEY : secret à créer dans Cloudflare Pages (Settings → Variables and Secrets)
//   - NOTIFY_TO / NOTIFY_FROM : dans wrangler.toml
// Si la clé est absente, rien n'est envoyé : la demande reste enregistrée dans R2.

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const LABELS = {
  profil: "Profil",
  type_adhesion: "Type d'adhésion",
  nom: "Nom",
  email: "E-mail",
  profession: "Profession",
  structure: "Structure / ville",
  objet: "Objet",
  message: "Message",
};

export async function notifyForm(env, data, id, adhesion) {
  if (!env.BREVO_API_KEY) return { sent: false, reason: "secret BREVO_API_KEY absent de ce déploiement" };
  if (!env.NOTIFY_TO || !env.NOTIFY_FROM) return { sent: false, reason: "NOTIFY_TO / NOTIFY_FROM manquants" };

  const title = adhesion
    ? "Nouvelle demande d'adhésion reçue sur sfdc-cancer.fr"
    : "Nouveau message de contact reçu sur sfdc-cancer.fr";
  const todo = adhesion
    ? "À faire : répondre avec le montant de la cotisation et le RIB."
    : "Pour répondre, utilisez simplement le bouton « Répondre ».";
  const subject = adhesion
    ? `Demande d'adhésion – ${data.nom}`
    : `Contact (${data.profil}) – ${data.nom} – ${data.objet}`.slice(0, 180);
  const rows = Object.entries(LABELS).filter(([k]) => data[k] && !(adhesion && k === "profil"));
  const text =
    `${title}\n\n` +
    rows.map(([k, l]) => `${l} : ${data[k]}`).join("\n") +
    `\n\n${todo}\nRéférence : ${id}\n`;
  const html =
    `<p><strong>${esc(title)}</strong></p><table cellpadding="6">` +
    rows.map(([k, l]) => `<tr><td valign="top"><strong>${esc(l)}</strong></td><td>${esc(data[k]).replace(/\n/g, "<br>")}</td></tr>`).join("") +
    `</table><p>${esc(todo)}</p><p style="color:#777">Référence : ${esc(id)}</p>`;

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": env.BREVO_API_KEY, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      sender: { name: "Site SFDC", email: env.NOTIFY_FROM },
      to: [{ email: env.NOTIFY_TO, name: "SFDC" }],
      replyTo: { email: data.email, name: data.nom },
      subject,
      textContent: text,
      htmlContent: html,
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 500);
    console.error("Brevo:", res.status, detail);
    return { sent: false, reason: `Brevo ${res.status} : ${detail}` };
  }
  const body = await res.json().catch(() => ({}));
  return { sent: true, messageId: body.messageId || null };
}
