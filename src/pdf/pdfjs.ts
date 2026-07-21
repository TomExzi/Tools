// Configuration centralisée de pdf.js (rendu / affichage).
// Le worker est importé en tant qu'URL grâce à Vite (`?url`), ce qui évite
// les problèmes classiques de résolution du worker dans un bundle navigateur.
import * as pdfjsLib from 'pdfjs-dist';
import PdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = PdfWorkerUrl;

export { pdfjsLib };
export type PdfDocument = Awaited<ReturnType<typeof pdfjsLib.getDocument>['promise']>;
export type PdfPage = Awaited<ReturnType<PdfDocument['getPage']>>;

/** Charge un document PDF à partir d'un ArrayBuffer (fichier local). */
export async function loadPdfDocument(data: ArrayBuffer): Promise<PdfDocument> {
  // On copie le buffer : pdf.js peut le « détacher », or on en a besoin
  // intact plus tard pour l'export avec pdf-lib.
  const copy = data.slice(0);
  const task = pdfjsLib.getDocument({ data: copy });
  return task.promise;
}
