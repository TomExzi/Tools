# PDF Editor

Éditeur de PDF **100 % côté navigateur** : les fichiers ne quittent jamais la machine, aucun serveur, aucun stockage.

## Fonctionnalités (socle)

- Ouvrir un PDF local et le visualiser (rendu via pdf.js)
- Ajouter du **texte** en édition directe sur la page (voir ce qu'on tape, corriger, double-clic pour rééditer)
- Ajouter une **signature** dessinée à la souris/au doigt
- Déplacer et supprimer les annotations
- **Exporter** un nouveau PDF avec les annotations aplaties (pdf-lib)

## Stack

- Vite + React 19 + TypeScript
- [pdf.js](https://mozilla.github.io/pdf.js/) — rendu / affichage
- [pdf-lib](https://pdf-lib.js.org/) — écriture / export
- [signature_pad](https://github.com/szimek/signature_pad) — capture de signature
- [Konva](https://konvajs.org/) / react-konva — calque d'annotations interactif

## Développement

```bash
npm install
npm run dev      # serveur de dev (http://localhost:5173)
npm run build    # typecheck + build de production
npm run preview  # prévisualiser le build
```

## Notes techniques

Les annotations sont stockées en **points PDF**, origine haut-gauche, Y vers le bas ; la conversion vers le repère pdf-lib (origine bas-gauche) est centralisée dans `src/pdf/coords.ts`.

## À venir

Redimensionnement des annotations, choix taille/couleur du texte, undo/redo, manipulation de pages (fusion/rotation/split), remplissage de formulaires AcroForm.
