import type { ToolId } from '../pdf/types';

interface Props {
  tool: ToolId;
  onToolChange: (tool: ToolId) => void;
  onOpenFile: () => void;
  onSignature: () => void;
  onExport: () => void;
  hasDocument: boolean;
  exporting: boolean;
}

export function Toolbar({
  tool,
  onToolChange,
  onOpenFile,
  onSignature,
  onExport,
  hasDocument,
  exporting,
}: Props) {
  return (
    <header className="toolbar">
      <div className="toolbar-group">
        <strong className="brand">PDF Editor</strong>
        <button type="button" onClick={onOpenFile} className="btn">
          Ouvrir un PDF…
        </button>
      </div>

      <div className="toolbar-group">
        <button
          type="button"
          className={`btn ${tool === 'select' ? 'active' : ''}`}
          onClick={() => onToolChange('select')}
          disabled={!hasDocument}
        >
          Sélection
        </button>
        <button
          type="button"
          className={`btn ${tool === 'text' ? 'active' : ''}`}
          onClick={() => onToolChange('text')}
          disabled={!hasDocument}
        >
          Texte
        </button>
        <button
          type="button"
          className="btn"
          onClick={onSignature}
          disabled={!hasDocument}
        >
          Signature…
        </button>
      </div>

      <div className="toolbar-group">
        <button
          type="button"
          className="btn-primary"
          onClick={onExport}
          disabled={!hasDocument || exporting}
        >
          {exporting ? 'Export…' : 'Exporter le PDF'}
        </button>
      </div>
    </header>
  );
}
