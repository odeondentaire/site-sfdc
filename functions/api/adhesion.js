// POST /api/adhesion : enregistre une demande d'adhésion dans R2.
import { json, readJson, isBot, clean, store, handle } from "../../server/forms.js";

const PROFESSIONS = [
  "Chirurgien-dentiste",
  "Oncologue / radiothérapeute",
  "Autre médecin",
  "Pharmacien",
  "Infirmier",
  "Diététicien",
  "Orthophoniste",
  "Autre professionnel de santé",
  "Chercheur / universitaire",
  "Patient / aidant",
  "Autre",
];

const SCHEMA = {
  type_adhesion: { label: "Type d'adhésion", required: true, oneOf: ["membre-associe", "membre-honneur"] },
  civilite: { label: "Civilité", max: 20 },
  prenom: { label: "Prénom", required: true, max: 80 },
  nom: { label: "Nom", required: true, max: 80 },
  email: { label: "E-mail", required: true, email: true, max: 160 },
  telephone: { label: "Téléphone", max: 30 },
  profession: { label: "Profession", required: true, oneOf: PROFESSIONS },
  specialite: { label: "Spécialité", max: 120 },
  mode_exercice: { label: "Mode d'exercice", max: 60 },
  structure: { label: "Structure", max: 160 },
  ville: { label: "Ville d'exercice", max: 80 },
  rpps: { label: "N° RPPS", max: 20 },
  message: { label: "Message", max: 2000 },
  consentement: { label: "Consentement", required: true, oneOf: ["oui"] },
  statuts: { label: "Statuts", required: true, oneOf: ["oui"] },
};

export const onRequestPost = ({ request, env }) =>
  handle(request, async () => {
    const raw = await readJson(request);
    if (isBot(raw)) return json({ ok: true }); // réponse neutre, rien n'est enregistré
    const data = clean(raw, SCHEMA);
    const { id } = await store(env, "adhesions", {
      statut: "nouvelle",
      donnees: data,
      origine: { pays: request.cf?.country || null },
    });
    const body = { ok: true, id };
    if (data.type_adhesion === "membre-associe" && env.PAYMENT_URL) body.redirect = env.PAYMENT_URL;
    return json(body);
  });

export const onRequest = () => json({ ok: false, error: "Méthode non autorisée." }, 405);
