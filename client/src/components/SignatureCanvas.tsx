import React, { useRef, useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Eraser, Save, Undo2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

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
  const [hasSignature, setHasSignature] = useState(false);
  const { toast } = useToast();
  
  // Configuration du canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Mise à l'échelle pour les écrans haute résolution
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    ctx.scale(dpr, dpr);
    
    // Style de dessin
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#000';
    
    // Charger la signature initiale si disponible
    if (initialSignature) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        setHasSignature(true);
      };
      img.src = initialSignature;
    }
    
  }, [initialSignature]);

  // Fonction pour commencer à dessiner
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    setIsDrawing(true);
    
    // Obtenir les coordonnées
    let x, y;
    if ('touches' in e) {
      // Événement tactile
      const rect = canvas.getBoundingClientRect();
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      // Événement souris
      x = e.nativeEvent.offsetX;
      y = e.nativeEvent.offsetY;
    }
    
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  // Fonction pour dessiner
  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Obtenir les coordonnées
    let x, y;
    if ('touches' in e) {
      // Événement tactile
      e.preventDefault(); // Empêcher le défilement sur mobile
      const rect = canvas.getBoundingClientRect();
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      // Événement souris
      x = e.nativeEvent.offsetX;
      y = e.nativeEvent.offsetY;
    }
    
    ctx.lineTo(x, y);
    ctx.stroke();
    
    setHasSignature(true);
  };

  // Fonction pour arrêter de dessiner
  const stopDrawing = () => {
    setIsDrawing(false);
  };

  // Fonction pour effacer la signature
  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  // Fonction pour sauvegarder la signature
  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    if (!hasSignature) {
      toast({
        title: "Signature vide",
        description: "Veuillez dessiner votre signature avant de sauvegarder.",
        variant: "destructive",
      });
      return;
    }
    
    // Convertir le canvas en image data URL
    const signatureData = canvas.toDataURL('image/png');
    onSave(signatureData);
    
    toast({
      title: "Signature enregistrée",
      description: "Votre signature a été enregistrée avec succès.",
      variant: "default",
    });
  };

  return (
    <div className="flex flex-col items-center">
      <Card className="w-full max-w-md">
        <CardContent className="p-4">
          <div 
            className="border border-gray-300 rounded-md relative"
            style={{ width: width, height: height, margin: '0 auto' }}
          >
            <canvas
              ref={canvasRef}
              width={width}
              height={height}
              className="cursor-crosshair bg-white"
              style={{ width: '100%', height: '100%', touchAction: 'none' }}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            
            {!hasSignature && (
              <div 
                className="absolute inset-0 flex items-center justify-center text-gray-400 pointer-events-none"
                style={{ zIndex: 1 }}
              >
                Signez ici
              </div>
            )}
          </div>
          
          <div className="mt-4 flex justify-between">
            <Button 
              variant="outline" 
              type="button" 
              onClick={clearSignature}
              className="flex items-center"
            >
              <Eraser className="h-4 w-4 mr-2" />
              Effacer
            </Button>
            
            <Button 
              variant="default" 
              type="button" 
              onClick={saveSignature}
              className="flex items-center"
              disabled={!hasSignature}
            >
              <Save className="h-4 w-4 mr-2" />
              Enregistrer
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}