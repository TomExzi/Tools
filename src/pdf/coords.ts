// Conversions de coordonnées centralisées.
// Les annotations sont stockées en points PDF, origine haut-gauche, Y vers le bas.

/** Points (espace page) -> pixels écran, selon l'échelle d'affichage. */
export function pointsToScreen(value: number, displayScale: number): number {
  return value * displayScale;
}

/** Pixels écran -> points (espace page). */
export function screenToPoints(value: number, displayScale: number): number {
  return value / displayScale;
}

/**
 * Convertit une position stockée (origine haut-gauche, Y vers le bas) vers le
 * repère pdf-lib (origine bas-gauche, Y vers le haut).
 *
 * @param topLeftY  Y de l'annotation depuis le HAUT de la page (points).
 * @param elementHeight Hauteur de l'élément (points). Pour du texte, passer la
 *                      taille de police (approximation de l'ascendante).
 * @param pageHeight Hauteur de la page (points).
 * @returns Y du bas de l'élément depuis le BAS de la page (repère pdf-lib).
 */
export function topLeftYToPdfLibY(
  topLeftY: number,
  elementHeight: number,
  pageHeight: number,
): number {
  return pageHeight - topLeftY - elementHeight;
}
