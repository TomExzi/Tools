import { useEffect, useRef } from 'react';
import SignaturePad from 'signature_pad';

interface Props {
  onCancel: () => void;
  onConfirm: (dataUrl: string, aspectRatio: number) => void;
}

/** Modale de capture d'une signature dessinée à la souris/au doigt. */
export function SignatureModal({ onCancel, onConfirm }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Adapter la résolution du canvas au devicePixelRatio pour un tracé net.
    const ratio = window.devicePixelRatio || 1;
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.getContext('2d')?.scale(ratio, ratio);

    padRef.current = new SignaturePad(canvas, {
      penColor: '#111111',
      backgroundColor: 'rgba(0,0,0,0)', // fond transparent
    });

    return () => padRef.current?.off();
  }, []);

  function handleClear() {
    padRef.current?.clear();
  }

  function handleConfirm() {
    const pad = padRef.current;
    if (!pad || pad.isEmpty()) return;
    // Rogner le tracé à sa boîte englobante serait idéal ; pour le socle on
    // exporte le canvas entier et on en déduit le ratio largeur/hauteur.
    const canvas = canvasRef.current!;
    const dataUrl = pad.toDataURL('image/png');
    const aspectRatio = canvas.clientWidth / canvas.clientHeight;
    onConfirm(dataUrl, aspectRatio);
  }

  return (
    <div className="modal-backdrop" onMouseDown={onCancel}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <h2>Draw your signature</h2>
        <canvas ref={canvasRef} className="signature-canvas" />
        <div className="modal-actions">
          <button type="button" onClick={handleClear} className="btn-ghost">
            Clear
          </button>
          <div className="spacer" />
          <button type="button" onClick={onCancel} className="btn-ghost">
            Cancel
          </button>
          <button type="button" onClick={handleConfirm} className="btn-primary">
            Confirm
          </button>
        </div>
        <p className="hint">After confirming, click on the page to place it.</p>
      </div>
    </div>
  );
}
