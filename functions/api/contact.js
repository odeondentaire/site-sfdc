// POST /api/contact : enregistre un message de contact (ou une demande
// d'adhésion) dans R2, sous formulaires/contact/ ou formulaires/adhesions/.
import { json, readJson, isBot, clean, store, handle } from "../../server/forms.js";

const PROFILS = [
  "Demande d'adhésion",
  "Professionnel de santé",
  "Patient ou aidant",
  "Institution",
  "Presse",
  "Autre",
];

const SCHEMA = {
  profil: { label: "Vous êtes", required: true, oneOf: PROFILS },
  type_adhesion: { label: "Type d'adhésion", oneOf: ["Membre associé", "Membre d'honneur"] },
  profession: { label: "Profession", max: 120 },
  structure: { label: "Structure / ville d'exercice", max: 160 },
  nom: { label: "Nom", required: true, max: 120 },
  email: { label: "E-mail", required: true, email: true, max: 160 },
  objet: { label: "Objet", required: true, max: 160 },
  message: { label: "Message", required: true, max: 5000 },
  consentement: { label: "Consentement", required: true, oneOf: ["oui"] },
};

export const onRequestPost = ({ request, env }) =>
  handle(request, async () => {
    const raw = await readJson(request);
    if (isBot(raw)) return json({ ok: true }); // réponse neutre, rien n'est enregistré
    const data = clean(raw, SCHEMA);
    const adhesion = data.profil === "Demande d'adhésion";
    const { id } = await store(env, adhesion ? "adhesions" : "contact", {
      statut: adhesion ? "à traiter : envoyer montant de la cotisation et RIB" : "nouveau",
      donnees: data,
    });
    return json({ ok: true, id });
  });

export const onRequest = () => json({ ok: false, error: "Méthode non autorisée." }, 405);
