// POST /api/contact : enregistre un message de contact dans R2.
import { json, readJson, isBot, clean, store, handle } from "../../server/forms.js";

const SCHEMA = {
  profil: {
    label: "Vous êtes",
    required: true,
    oneOf: ["Professionnel de santé", "Patient ou aidant", "Institution", "Presse", "Autre"],
  },
  nom: { label: "Nom", required: true, max: 120 },
  email: { label: "E-mail", required: true, email: true, max: 160 },
  objet: { label: "Objet", required: true, max: 160 },
  message: { label: "Message", required: true, max: 5000 },
  consentement: { label: "Consentement", required: true, oneOf: ["oui"] },
};

export const onRequestPost = ({ request, env }) =>
  handle(request, async () => {
    const raw = await readJson(request);
    if (isBot(raw)) return json({ ok: true });
    const data = clean(raw, SCHEMA);
    const { id } = await store(env, "contact", { statut: "nouveau", donnees: data });
    return json({ ok: true, id });
  });

export const onRequest = () => json({ ok: false, error: "Méthode non autorisée." }, 405);
