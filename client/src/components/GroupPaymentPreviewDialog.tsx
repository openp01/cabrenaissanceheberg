import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Eye, Download, FileText, FilePlus2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TherapistPaymentWithDetails } from '@shared/schema';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface GroupPaymentPreviewDialogProps {
  payments: TherapistPaymentWithDetails[];
  children?: React.ReactNode;
}

export default function GroupPaymentPreviewDialog({ 
  payments,
  children 
}: GroupPaymentPreviewDialogProps) {
  const [pdfUrls, setPdfUrls] = useState<Map<number, string>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [currentPaymentId, setCurrentPaymentId] = useState<number | null>(null);
  const { toast } = useToast();

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    
    if (!open) {
      // Nettoyage des URLs des PDFs quand on ferme le dialogue
      pdfUrls.forEach((url) => {
        URL.revokeObjectURL(url);
      });
      setPdfUrls(new Map());
      setCurrentPaymentId(null);
    } else if (payments.length > 0) {
      // Initialiser avec le premier paiement
      setCurrentPaymentId(payments[0].id);
      // Charger le PDF du premier paiement
      loadPdfPreview(payments[0].id, payments[0].invoiceId);
    }
  };

  const loadPdfPreview = async (paymentId: number, invoiceId: number) => {
    // Si on a déjà chargé ce PDF, pas besoin de le refaire
    if (pdfUrls.has(paymentId)) {
      setCurrentPaymentId(paymentId);
      return;
    }

    setIsLoading(true);
    try {
      // URL de l'API avec 'preview=true' pour indiquer que c'est une prévisualisation
      const response = await fetch(`/api/invoices/${invoiceId}/pdf?preview=true`);
      
      if (!response.ok) {
        throw new Error(`Erreur lors du chargement de la facture: ${response.statusText}`);
      }
      
      // Récupérer le PDF comme Blob
      const pdfBlob = await response.blob();
      
      // Créer une URL pour le blob
      const pdfObjectUrl = URL.createObjectURL(pdfBlob);
      
      // Mettre à jour la map des URLs
      setPdfUrls(prev => new Map(prev).set(paymentId, pdfObjectUrl));
      setCurrentPaymentId(paymentId);
    } catch (error) {
      console.error('Erreur lors du chargement de la prévisualisation:', error);
      toast({
        title: "Erreur de chargement",
        description: "Impossible de charger la prévisualisation de la facture.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentChange = (paymentId: string) => {
    const id = parseInt(paymentId);
    const payment = payments.find(p => p.id === id);
    if (payment) {
      loadPdfPreview(payment.id, payment.invoiceId);
    }
  };

  const handleDownload = () => {
    // Trouver le paiement actuel
    const payment = payments.find(p => p.id === currentPaymentId);
    if (payment) {
      // Ouvrir l'URL dans un nouvel onglet pour télécharger le PDF
      window.open(`/api/invoices/${payment.invoiceId}/pdf`, '_blank');
    }
  };

  // Trouver le paiement actuel pour afficher ses informations
  const currentPayment = payments.find(p => p.id === currentPaymentId);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
            title="Prévisualiser les factures des paiements"
          >
            <FilePlus2 className="h-4 w-4" />
            <span>Prévisualiser les factures</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[900px] h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Factures des paiements</DialogTitle>
          <DialogDescription>
            Prévisualisation des factures liées aux paiements
          </DialogDescription>
        </DialogHeader>
        
        {/* Sélecteur de paiement */}
        <div className="mb-4">
          <div className="flex items-center gap-4">
            <span className="font-medium">Paiement:</span>
            <Select 
              value={currentPaymentId?.toString()} 
              onValueChange={handlePaymentChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sélectionner un paiement" />
              </SelectTrigger>
              <SelectContent>
                {payments.map((payment) => (
                  <SelectItem key={payment.id} value={payment.id.toString()}>
                    {payment.therapistName} - {payment.patientName} - Facture {payment.invoiceNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {currentPayment && (
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="outline">Facture: {currentPayment.invoiceNumber}</Badge>
              <Badge variant="secondary">Thérapeute: {currentPayment.therapistName}</Badge>
              <Badge variant="secondary">Patient: {currentPayment.patientName}</Badge>
              <Badge variant="default">Montant: {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(currentPayment.amount))}</Badge>
            </div>
          )}
        </div>
        
        <div className="flex-1 overflow-hidden bg-muted/20 rounded-md relative min-h-[500px]">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Chargement de la facture...</span>
            </div>
          ) : currentPaymentId && pdfUrls.has(currentPaymentId) ? (
            <iframe 
              src={pdfUrls.get(currentPaymentId)} 
              className="w-full h-full border-0" 
              title={`Prévisualisation de la facture ${currentPayment?.invoiceNumber}`}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
              <FileText className="h-16 w-16 mb-4" />
              <p>Sélectionnez un paiement pour voir la facture correspondante</p>
            </div>
          )}
        </div>
        
        <DialogFooter className="flex items-center justify-between mt-4">
          <DialogClose asChild>
            <Button variant="outline">Fermer</Button>
          </DialogClose>
          
          {currentPaymentId && (
            <Button 
              onClick={handleDownload} 
              variant="default"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Télécharger la facture
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}