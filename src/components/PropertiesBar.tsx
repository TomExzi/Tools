import type { Annotation } from '../pdf/types';

interface Props {
  annotation: Annotation;
  onUpdate: (id: string, patch: Partial<Annotation>) => void;
  onDelete: () => void;
}

/** Barre contextuelle affichée quand une annotation est sélectionnée. */
export function PropertiesBar({ annotation, onUpdate, onDelete }: Props) {
  return (
    <div className="props-bar">
      <span className="props-label">
        {annotation.type === 'text' ? 'Texte' : 'Signature'}
      </span>

      {annotation.type === 'text' && (
        <>
          <label className="props-field">
            Couleur
            <input
              type="color"
              value={annotation.color}
              onChange={(e) => onUpdate(annotation.id, { color: e.target.value })}
            />
          </label>
          <label className="props-field">
            Taille
            <input
              type="number"
              min={6}
              max={200}
              value={Math.round(annotation.fontSize)}
              onChange={(e) => {
                const size = Number(e.target.value);
                if (Number.isFinite(size) && size >= 6) {
                  onUpdate(annotation.id, { fontSize: size });
                }
              }}
            />
          </label>
        </>
      )}

      <div className="spacer" />
      <span className="props-hint">Ctrl+C / Ctrl+V pour copier-coller</span>
      <button type="button" className="btn-danger" onClick={onDelete}>
        Supprimer
      </button>
    </div>
  );
}
