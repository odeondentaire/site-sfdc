// /medias/* → objets R2 « medias/* » (photos définitives, visuels)
import { serveFromR2 } from "../../server/r2-files.js";
export const onRequest = (context) => serveFromR2(context, "medias");
