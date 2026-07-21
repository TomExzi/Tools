import { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Text as KonvaText, Image as KonvaImage, Rect } from 'react-konva';
import type Konva from 'konva';
import type { PdfPage } from '../pdf/pdfjs';
import type { Annotation, ToolId } from '../pdf/types';
import { pointsToScreen, screenToPoints } from '../pdf/coords';
import { TextEditor } from './TextEditor';

interface Props {
  page: PdfPage;
  pageIndex: number;
  displayScale: number;
  annotations: Annotation[];
  tool: ToolId;
  selectedId: string | null;
  editingId: string | null;
  onPlace: (pageIndex: number, xPoints: number, yPoints: number) => void;
  onUpdate: (id: string, patch: Partial<Annotation>) => void;
  onSelect: (id: string | null) => void;
  onStartEdit: (id: string) => void;
  onCommitText: (id: string, text: string) => void;
}

/** Charge une data URL en HTMLImageElement pour Konva. */
function useHtmlImage(src: string): HTMLImageElement | null {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    const image = new window.Image();
    image.onload = () => setImg(image);
    image.src = src;
  }, [src]);
  return img;
}

export function PdfPageView({
  page,
  pageIndex,
  displayScale,
  annotations,
  tool,
  selectedId,
  editingId,
  onPlace,
  onUpdate,
  onSelect,
  onStartEdit,
  onCommitText,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewport = page.getViewport({ scale: displayScale });
  const width = Math.floor(viewport.width);
  const height = Math.floor(viewport.height);

  // Rendu de la page dans le canvas via pdf.js.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const context = canvas.getContext('2d');
    if (!context) return;

    // Backing store en haute résolution, taille CSS = taille logique.
    canvas.width = Math.floor(viewport.width * dpr);
    canvas.height = Math.floor(viewport.height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const renderTask = page.render({
      canvas,
      canvasContext: context,
      viewport,
      transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
    });
    renderTask.promise.catch((err: unknown) => {
      // L'annulation lors d'un re-render est normale, on l'ignore.
      if (err && (err as { name?: string }).name !== 'RenderingCancelledException') {
        console.error('Erreur de rendu de la page', err);
      }
    });
    return () => renderTask.cancel();
  }, [page, viewport, width, height]);

  function handleStageMouseDown(e: Konva.KonvaEventObject<MouseEvent>) {
    const stage = e.target.getStage();
    if (!stage) return;

    // Clic sur le fond (la page) : placement ou désélection.
    const clickedOnEmpty = e.target === stage || e.target.name() === 'page-bg';
    if (!clickedOnEmpty) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    if (tool === 'text' || tool === 'signature') {
      // Empêche le navigateur de remettre le focus sur le <body> à la fin du
      // mousedown, ce qui ferait perdre le focus (et donc disparaître) au champ
      // d'édition que l'on s'apprête à monter.
      e.evt.preventDefault();
      onPlace(
        pageIndex,
        screenToPoints(pointer.x, displayScale),
        screenToPoints(pointer.y, displayScale),
      );
    } else {
      onSelect(null);
    }
  }

  const cursor = tool === 'select' ? 'default' : 'crosshair';

  return (
    <div className="pdf-page" style={{ width, height }}>
      <canvas ref={canvasRef} className="pdf-canvas" />
      <Stage
        width={width}
        height={height}
        className="pdf-overlay"
        style={{ cursor }}
        onMouseDown={handleStageMouseDown}
      >
        <Layer>
          {/* Rectangle transparent qui capte les clics de placement. */}
          <Rect name="page-bg" x={0} y={0} width={width} height={height} />

          {annotations.map((ann) => {
            const isSelected = ann.id === selectedId;
            const draggable = tool === 'select';
            const commonDrag = {
              draggable,
              onClick: () => onSelect(ann.id),
              onTap: () => onSelect(ann.id),
              onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
                onUpdate(ann.id, {
                  x: screenToPoints(e.target.x(), displayScale),
                  y: screenToPoints(e.target.y(), displayScale),
                });
              },
            };

            if (ann.type === 'text') {
              // Masqué pendant l'édition : c'est le champ HTML qui prend le relais.
              if (ann.id === editingId) return null;
              return (
                <KonvaText
                  key={ann.id}
                  x={pointsToScreen(ann.x, displayScale)}
                  y={pointsToScreen(ann.y, displayScale)}
                  text={ann.text}
                  fontSize={ann.fontSize * displayScale}
                  lineHeight={1.2}
                  fontFamily="Helvetica, Arial, sans-serif"
                  fill={ann.color}
                  stroke={isSelected ? '#2563eb' : undefined}
                  strokeWidth={isSelected ? 0.5 : 0}
                  onDblClick={() => onStartEdit(ann.id)}
                  onDblTap={() => onStartEdit(ann.id)}
                  {...commonDrag}
                />
              );
            }
            return (
              <ImageNode
                key={ann.id}
                ann={ann}
                displayScale={displayScale}
                selected={isSelected}
                {...commonDrag}
              />
            );
          })}
        </Layer>
      </Stage>

      {/* Éditeur de texte en direct, positionné sur l'annotation en cours. */}
      {annotations.map((ann) =>
        ann.type === 'text' && ann.id === editingId ? (
          <TextEditor
            key={`edit-${ann.id}`}
            x={pointsToScreen(ann.x, displayScale)}
            y={pointsToScreen(ann.y, displayScale)}
            fontSize={ann.fontSize * displayScale}
            color={ann.color}
            initial={ann.text}
            onCommit={(text) => onCommitText(ann.id, text)}
          />
        ) : null,
      )}
    </div>
  );
}

function ImageNode({
  ann,
  displayScale,
  selected,
  draggable,
  onClick,
  onTap,
  onDragEnd,
}: {
  ann: Extract<Annotation, { type: 'image' }>;
  displayScale: number;
  selected: boolean;
  draggable: boolean;
  onClick: () => void;
  onTap: () => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
}) {
  const img = useHtmlImage(ann.dataUrl);
  if (!img) return null;
  return (
    <KonvaImage
      image={img}
      x={pointsToScreen(ann.x, displayScale)}
      y={pointsToScreen(ann.y, displayScale)}
      width={pointsToScreen(ann.width, displayScale)}
      height={pointsToScreen(ann.height, displayScale)}
      stroke={selected ? '#2563eb' : undefined}
      strokeWidth={selected ? 1 : 0}
      draggable={draggable}
      onClick={onClick}
      onTap={onTap}
      onDragEnd={onDragEnd}
    />
  );
}
