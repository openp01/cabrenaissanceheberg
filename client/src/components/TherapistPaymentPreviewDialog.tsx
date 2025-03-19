import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { TherapistPaymentWithDetails } from "@shared/schema";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Eye, FileDown } from "lucide-react";

interface TherapistPaymentPreviewDialogProps {
  paymentId: number;
  invoiceNumber: string;
  children?: React.ReactNode;
}

export default function TherapistPaymentPreviewDialog({ 
  paymentId, 
  invoiceNumber,
  children 
}: TherapistPaymentPreviewDialogProps) {
  const [open, setOpen] = useState(false);
  
  // Récupérer les détails du paiement
  const { data: payment, isLoading } = useQuery({
    queryKey: [`/api/therapist-payments/${paymentId}`],
    queryFn: () => apiRequest<TherapistPaymentWithDetails>(`/api/therapist-payments/${paymentId}`),
    enabled: open, // Ne charger que lorsque la boîte de dialogue est ouverte
  });

  // Formater un montant en euros
  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(numAmount);
  };

  // Formater une date
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd MMMM yyyy', { locale: fr });
  };
  
  // Fonction pour obtenir l'URL du PDF du paiement
  const getPaymentPdfUrl = () => {
    return `/api/therapist-payments/export/pdf?paymentId=${paymentId}`;
  };

  // Télécharger le PDF du paiement
  const downloadPaymentPdf = () => {
    window.open(getPaymentPdfUrl(), "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm" className="h-8 gap-1">
            <Eye className="h-3.5 w-3.5" />
            Aperçu
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Aperçu du paiement</DialogTitle>
          <DialogDescription>
            Détails du paiement {invoiceNumber}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : payment ? (
          <div className="space-y-4">
            <div className="flex justify-between">
              <Card className="w-1/2 mr-4">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-sm mb-2">Thérapeute</h3>
                  <p className="text-lg">{payment.therapistName}</p>
                </CardContent>
              </Card>
              <Card className="w-1/2">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-sm mb-2">Patient</h3>
                  <p className="text-lg">{payment.patientName}</p>
                </CardContent>
              </Card>
            </div>
            
            <div className="flex justify-between">
              <Card className="w-1/2 mr-4">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-sm mb-2">Facture</h3>
                  <Badge variant="outline" className="text-base font-normal">
                    {payment.invoiceNumber}
                  </Badge>
                </CardContent>
              </Card>
              <Card className="w-1/2">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-sm mb-2">Date de paiement</h3>
                  <p className="text-lg">{formatDate(payment.paymentDate)}</p>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-sm mb-2">Montant</h3>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(payment.amount)}
                </p>
              </CardContent>
            </Card>
            
            <div className="flex justify-between">
              <Card className="w-1/2 mr-4">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-sm mb-2">Méthode de paiement</h3>
                  <p className="text-lg">{payment.paymentMethod}</p>
                </CardContent>
              </Card>
              <Card className="w-1/2">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-sm mb-2">Référence</h3>
                  <p className="text-lg">{payment.paymentReference || "-"}</p>
                </CardContent>
              </Card>
            </div>
            
            {payment.notes && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-sm mb-2">Notes</h3>
                  <p className="text-sm">{payment.notes}</p>
                </CardContent>
              </Card>
            )}
            
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={downloadPaymentPdf}
                className="gap-2"
              >
                <FileDown className="h-4 w-4" />
                Télécharger PDF
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            Impossible de charger les détails du paiement
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}