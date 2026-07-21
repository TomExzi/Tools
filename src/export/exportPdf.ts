import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { Annotation } from '../pdf/types';
import { topLeftYToPdfLibY } from '../pdf/coords';

/** "#rrggbb" -> composantes 0..1 pour pdf-lib. */
function hexToRgb(hex: string) {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return rgb(r, g, b);
}

/** data URL PNG -> octets. */
function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] ?? '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Aplatit les annotations dans le PDF original et renvoie un Blob téléchargeable.
 * Le document original n'est jamais modifié (on repart de ses octets bruts).
 */
export async function exportAnnotatedPdf(
  originalBytes: ArrayBuffer,
  annotations: Annotation[],
): Promise<Blob> {
  const pdfDoc = await PDFDocument.load(originalBytes);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();

  // Cache d'images embarquées (une signature placée plusieurs fois n'est
  // encodée qu'une seule fois).
  const imageCache = new Map<string, Awaited<ReturnType<typeof pdfDoc.embedPng>>>();

  for (const ann of annotations) {
    const page = pages[ann.pageIndex];
    if (!page) continue;
    const pageHeight = page.getHeight();

    if (ann.type === 'text') {
      const lines = ann.text.split('\n');
      lines.forEach((line, i) => {
        const lineTopY = ann.y + i * ann.fontSize * 1.2;
        page.drawText(line, {
          x: ann.x,
          y: topLeftYToPdfLibY(lineTopY, ann.fontSize, pageHeight),
          size: ann.fontSize,
          font: helvetica,
          color: hexToRgb(ann.color),
        });
      });
    } else {
      let png = imageCache.get(ann.dataUrl);
      if (!png) {
        png = await pdfDoc.embedPng(dataUrlToBytes(ann.dataUrl));
        imageCache.set(ann.dataUrl, png);
      }
      page.drawImage(png, {
        x: ann.x,
        y: topLeftYToPdfLibY(ann.y, ann.height, pageHeight),
        width: ann.width,
        height: ann.height,
      });
    }
  }

  const out = await pdfDoc.save();
  // Copie dans un ArrayBuffer neuf pour un Blob parfaitement typé.
  return new Blob([out.slice().buffer], { type: 'application/pdf' });
}

/** Déclenche le téléchargement d'un Blob côté navigateur. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
