import { useCallback, useEffect, useRef, useState } from 'react';
import { Toolbar } from './components/Toolbar';
import { PdfPageView } from './components/PdfPageView';
import { SignatureModal } from './components/SignatureModal';
import { PropertiesBar } from './components/PropertiesBar';
import { loadPdfDocument, type PdfDocument, type PdfPage } from './pdf/pdfjs';
import type { Annotation, ToolId } from './pdf/types';
import { newId } from './pdf/types';
import { exportAnnotatedPdf, downloadBlob } from './export/exportPdf';
import './App.css';

const TARGET_WIDTH = 820; // largeur d'affichage cible d'une page, en px

interface PendingSignature {
  dataUrl: string;
  aspectRatio: number;
}

export default function App() {
  const [doc, setDoc] = useState<PdfDocument | null>(null);
  const [pages, setPages] = useState<PdfPage[]>([]);
  const [originalBytes, setOriginalBytes] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState('document.pdf');
  const [displayScale, setDisplayScale] = useState(1.3);

  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [tool, setTool] = useState<ToolId>('select');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [pendingSignature, setPendingSignature] = useState<PendingSignature | null>(null);
  const [exporting, setExporting] = useState(false);
  const [clipboard, setClipboard] = useState<Annotation | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const openFileDialog = () => fileInputRef.current?.click();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // permet de rouvrir le même fichier
    if (!file) return;

    const bytes = await file.arrayBuffer();
    const pdfDoc = await loadPdfDocument(bytes);
    const loadedPages: PdfPage[] = [];
    for (let i = 1; i <= pdfDoc.numPages; i += 1) {
      loadedPages.push(await pdfDoc.getPage(i));
    }

    // Échelle d'affichage : on cale la 1re page sur TARGET_WIDTH.
    const firstWidth = loadedPages[0].getViewport({ scale: 1 }).width;
    const scale = Math.min(2, Math.max(0.5, TARGET_WIDTH / firstWidth));

    setOriginalBytes(bytes);
    setDoc(pdfDoc);
    setPages(loadedPages);
    setDisplayScale(scale);
    setAnnotations([]);
    setSelectedId(null);
    setTool('select');
    setFileName(file.name.replace(/\.pdf$/i, '') + '-edité.pdf');
  }

  const handlePlace = useCallback(
    (pageIndex: number, xPoints: number, yPoints: number) => {
      if (tool === 'text') {
        // On crée une annotation vide et on passe aussitôt en édition en direct.
        const id = newId('txt');
        setAnnotations((prev) => [
          ...prev,
          {
            id,
            type: 'text',
            pageIndex,
            x: xPoints,
            y: yPoints,
            text: '',
            fontSize: 16,
            color: '#111111',
          },
        ]);
        setEditingId(id);
        setSelectedId(id);
        setTool('select');
      } else if (tool === 'signature' && pendingSignature) {
        const width = 150; // points
        const height = width / pendingSignature.aspectRatio;
        setAnnotations((prev) => [
          ...prev,
          {
            id: newId('sig'),
            type: 'image',
            pageIndex,
            x: xPoints,
            y: yPoints,
            dataUrl: pendingSignature.dataUrl,
            width,
            height,
          },
        ]);
        setPendingSignature(null);
        setTool('select');
      }
    },
    [tool, pendingSignature],
  );

  const handleUpdate = useCallback((id: string, patch: Partial<Annotation>) => {
    setAnnotations((prev) =>
      prev.map((a) => (a.id === id ? ({ ...a, ...patch } as Annotation) : a)),
    );
  }, []);

  const handleStartEdit = useCallback((id: string) => {
    setSelectedId(id);
    setEditingId(id);
  }, []);

  // Fin d'édition : on enregistre le texte, ou on retire l'annotation si vide.
  const handleCommitText = useCallback((id: string, text: string) => {
    setEditingId(null);
    if (text.trim() === '') {
      setAnnotations((prev) => prev.filter((a) => a.id !== id));
    } else {
      setAnnotations((prev) =>
        prev.map((a) => (a.id === id && a.type === 'text' ? { ...a, text } : a)),
      );
    }
  }, []);

  const handleDelete = useCallback(() => {
    setSelectedId((id) => {
      if (id) setAnnotations((prev) => prev.filter((a) => a.id !== id));
      return null;
    });
  }, []);

  // Duplique une annotation (nouvel id, léger décalage) et la sélectionne.
  const duplicateAnnotation = useCallback((source: Annotation): Annotation => {
    const copy = {
      ...source,
      id: newId(source.type === 'text' ? 'txt' : 'sig'),
      x: source.x + 14,
      y: source.y + 14,
    } as Annotation;
    setAnnotations((prev) => [...prev, copy]);
    setSelectedId(copy.id);
    return copy;
  }, []);

  // Raccourcis clavier : suppression, copier/coller/dupliquer.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const typing = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      if (typing || editingId) return; // ne pas interférer avec la saisie de texte
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId) {
          e.preventDefault();
          handleDelete();
        }
      } else if (mod && key === 'c' && selectedId) {
        const ann = annotations.find((a) => a.id === selectedId);
        if (ann) setClipboard(ann);
      } else if (mod && key === 'v' && clipboard) {
        e.preventDefault();
        setClipboard(duplicateAnnotation(clipboard)); // colle en cascade
      } else if (mod && key === 'd' && selectedId) {
        e.preventDefault();
        const ann = annotations.find((a) => a.id === selectedId);
        if (ann) duplicateAnnotation(ann);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, editingId, annotations, clipboard, handleDelete, duplicateAnnotation]);

  async function handleExport() {
    if (!originalBytes) return;
    setExporting(true);
    try {
      const blob = await exportAnnotatedPdf(originalBytes, annotations);
      downloadBlob(blob, fileName);
    } catch (err) {
      console.error(err);
      alert("Échec de l'export du PDF. Voir la console pour le détail.");
    } finally {
      setExporting(false);
    }
  }

  function handleSignatureConfirm(dataUrl: string, aspectRatio: number) {
    setPendingSignature({ dataUrl, aspectRatio });
    setTool('signature');
    setShowSignatureModal(false);
  }

  const selectedAnnotation = annotations.find((a) => a.id === selectedId) ?? null;

  return (
    <div className="app">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        hidden
      />

      <Toolbar
        tool={tool}
        onToolChange={setTool}
        onOpenFile={openFileDialog}
        onSignature={() => setShowSignatureModal(true)}
        onExport={handleExport}
        hasDocument={!!doc}
        exporting={exporting}
      />

      {selectedAnnotation && !editingId && (
        <PropertiesBar
          annotation={selectedAnnotation}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}

      {pendingSignature && (
        <div className="banner">Signature prête — cliquez sur la page pour la placer.</div>
      )}

      <main className="canvas-area">
        {!doc && (
          <div className="empty-state">
            <p>Ouvrez un PDF pour commencer.</p>
            <button type="button" className="btn-primary" onClick={openFileDialog}>
              Ouvrir un PDF…
            </button>
          </div>
        )}

        {pages.map((page, i) => (
          <PdfPageView
            key={i}
            page={page}
            pageIndex={i}
            displayScale={displayScale}
            annotations={annotations.filter((a) => a.pageIndex === i)}
            tool={tool}
            selectedId={selectedId}
            editingId={editingId}
            onPlace={handlePlace}
            onUpdate={handleUpdate}
            onSelect={setSelectedId}
            onStartEdit={handleStartEdit}
            onCommitText={handleCommitText}
          />
        ))}
      </main>

      {showSignatureModal && (
        <SignatureModal
          onCancel={() => setShowSignatureModal(false)}
          onConfirm={handleSignatureConfirm}
        />
      )}
    </div>
  );
}
