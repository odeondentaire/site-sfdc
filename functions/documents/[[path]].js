// /documents/* → objets R2 « documents/* » (statuts en PDF, etc.)
import { serveFromR2 } from "../../server/r2-files.js";
export const onRequest = (context) => serveFromR2(context, "documents");
