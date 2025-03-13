import React, { useEffect, useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Trash2, Download, Check } from "lucide-react";

interface SignatureCanvasProps {
  onSave: (signatureData: string) => void;
  initialSignature?: string;
  width?: number;
  height?: number;
}

export default function SignatureCanvas({ 
  onSave, 
  initialSignature, 
  width = 400, 
  height = 200 
}: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(!initialSignature);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  
  // Initialiser le contexte de canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const context = canvas.getContext('2d');
    if (!context) return;
    
    // Configuration du style de trait
    context.lineWidth = 2;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = '#000000';
    
    setCtx(context);
    
    // Charger la signature initiale si disponible
    if (initialSignature) {
      const img = new Image();
      img.onload = () => {
        context.drawImage(img, 0, 0);
        setIsEmpty(false);
      };
      img.src = initialSignature;
    }
  }, [initialSignature]);
  
  // Vérifier si le canvas est vide
  const checkIfEmpty = () => {
    if (!ctx || !canvasRef.current) return true;
    
    const pixelData = ctx.getImageData(
      0, 0, canvasRef.current.width, canvasRef.current.height
    ).data;
    
    // Vérifier si tous les pixels sont transparents
    for (let i = 0; i < pixelData.length; i += 4) {
      if (pixelData[i + 3] > 0) {
        return false;
      }
    }
    
    return true;
  };
  
  // Fonctions de dessin
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!ctx) return;
    
    ctx.beginPath();
    
    // Position initiale
    const { offsetX, offsetY } = getCoordinates(e);
    ctx.moveTo(offsetX, offsetY);
    
    setIsDrawing(true);
  };
  
  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !ctx) return;
    
    const { offsetX, offsetY } = getCoordinates(e);
    ctx.lineTo(offsetX, offsetY);
    ctx.stroke();
    
    setIsEmpty(false);
  };
  
  const stopDrawing = () => {
    if (!ctx) return;
    
    ctx.closePath();
    setIsDrawing(false);
    
    // Vérifier si le canvas est vide après le dessin
    setIsEmpty(checkIfEmpty());
  };
  
  // Obtenir les coordonnées pour les événements de souris et tactiles
  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { offsetX: 0, offsetY: 0 };
    
    let offsetX, offsetY;
    
    if ('touches' in e) {
      // Événement tactile
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      offsetX = touch.clientX - rect.left;
      offsetY = touch.clientY - rect.top;
    } else {
      // Événement de souris
      offsetX = e.nativeEvent.offsetX;
      offsetY = e.nativeEvent.offsetY;
    }
    
    return { offsetX, offsetY };
  };
  
  // Effacer la signature
  const clearSignature = () => {
    if (!ctx || !canvasRef.current) return;
    
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setIsEmpty(true);
  };
  
  // Télécharger la signature
  const downloadSignature = () => {
    if (!canvasRef.current) return;
    
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'signature.png';
    link.href = dataUrl;
    link.click();
  };
  
  // Sauvegarder la signature
  const saveSignature = () => {
    if (!canvasRef.current || isEmpty) return;
    
    const dataUrl = canvasRef.current.toDataURL('image/png');
    onSave(dataUrl);
  };
  
  return (
    <div className="flex flex-col items-center">
      <div className="border rounded-md p-2 bg-white mb-2">
        <canvas 
          ref={canvasRef}
          width={width}
          height={height}
          className="border border-dashed border-gray-300 cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        ></canvas>
      </div>
      
      <div className="flex gap-2 mt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={clearSignature}
          disabled={isEmpty}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Effacer
        </Button>
        
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={downloadSignature}
          disabled={isEmpty}
        >
          <Download className="h-4 w-4 mr-1" />
          Télécharger
        </Button>
        
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={saveSignature}
          disabled={isEmpty}
        >
          <Check className="h-4 w-4 mr-1" />
          Enregistrer
        </Button>
      </div>
      
      <p className="text-xs text-gray-500 mt-2">
        {isEmpty ? "Signez dans la zone ci-dessus" : ""}
      </p>
    </div>
  );
}