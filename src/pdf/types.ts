// Modèle d'annotations.
//
// CONVENTION DE COORDONNÉES (source unique de vérité) :
// Toutes les positions/tailles des annotations sont stockées en POINTS PDF,
// dans l'espace de la page à l'échelle 1, avec l'origine en HAUT-À-GAUCHE et
// l'axe Y vers le BAS (comme pdf.js à scale=1).
//
// - Pour l'affichage : on multiplie par l'échelle d'affichage courante.
// - Pour l'export pdf-lib : on inverse l'axe Y (pdf-lib a l'origine en bas).
// La conversion est centralisée dans coords.ts — ne pas recalculer ailleurs.

export type ToolId = 'select' | 'text' | 'signature';

interface BaseAnnotation {
  id: string;
  pageIndex: number; // 0-based
  x: number; // points, depuis le bord gauche
  y: number; // points, depuis le bord HAUT
}

export interface TextAnnotation extends BaseAnnotation {
  type: 'text';
  text: string;
  fontSize: number; // points
  color: string; // hex, ex. "#111111"
}

export interface ImageAnnotation extends BaseAnnotation {
  type: 'image'; // signature dessinée ou image importée
  dataUrl: string; // PNG en data URL
  width: number; // points
  height: number; // points
}

export type Annotation = TextAnnotation | ImageAnnotation;

let counter = 0;
export function newId(prefix = 'ann'): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter}`;
}
