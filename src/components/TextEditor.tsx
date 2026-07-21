import { useEffect, useLayoutEffect, useRef, useState } from 'react';

interface Props {
  /** Position et style en pixels ÉCRAN (déjà multipliés par l'échelle). */
  x: number;
  y: number;
  fontSize: number;
  color: string;
  initial: string;
  /** Appelé à la fin de l'édition (perte de focus ou Échap). */
  onCommit: (text: string) => void;
}

/**
 * Champ de saisie de texte affiché EN DIRECT par-dessus la page, à l'endroit
 * exact de l'annotation. Permet de voir et corriger le texte pendant la frappe.
 */
export function TextEditor({ x, y, fontSize, color, initial, onCommit }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState(initial);

  // Ajuste la taille du champ à son contenu (pas de retour à la ligne auto).
  function autosize() {
    const el = ref.current;
    if (!el) return;
    el.style.width = '0px';
    el.style.height = '0px';
    el.style.width = `${el.scrollWidth + 2}px`;
    el.style.height = `${el.scrollHeight}px`;
  }

  useLayoutEffect(autosize, [value, fontSize]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    // Sélectionne le texte existant pour un remplacement rapide.
    if (initial) el.select();
  }, [initial]);

  return (
    <textarea
      ref={ref}
      className="text-editor"
      wrap="off"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => onCommit(value)}
      onKeyDown={(e) => {
        // Échap valide et sort ; Entrée insère un retour à la ligne (défaut).
        if (e.key === 'Escape') {
          e.preventDefault();
          ref.current?.blur();
        }
        // On évite que la touche Suppr supprime l'annotation en arrière-plan.
        e.stopPropagation();
      }}
      style={{
        left: x,
        top: y,
        fontSize: `${fontSize}px`,
        lineHeight: 1.2,
        color,
      }}
    />
  );
}
