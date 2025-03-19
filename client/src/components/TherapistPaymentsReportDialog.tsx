import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { TherapistPaymentWithDetails, Therapist } from "@shared/schema";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, FileDown, FileText } from "lucide-react";

interface TherapistPaymentsReportDialogProps {
  children?: React.ReactNode;
}

export default function TherapistPaymentsReportDialog({ 
  children 
}: TherapistPaymentsReportDialogProps) {
  const [open, setOpen] = useState(false);
  
  // États pour les filtres
  const [selectedTherapistId, setSelectedTherapistId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [customTitle, setCustomTitle] = useState("APERÇU DES PAIEMENTS AUX THÉRAPEUTES");
  
  // Récupérer les paiements
  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ["/api/therapist-payments"],
    queryFn: () => apiRequest<TherapistPaymentWithDetails[]>("/api/therapist-payments"),
    enabled: open,
  });

  // Récupérer les thérapeutes
  const { data: therapists } = useQuery({
    queryKey: ["/api/therapists"],
    queryFn: () => apiRequest<Therapist[]>("/api/therapists"),
    enabled: open,
  });

  // Filtrer les paiements selon les critères
  const filteredPayments = payments?.filter(payment => {
    // Filtre par thérapeute
    if (selectedTherapistId && payment.therapistId.toString() !== selectedTherapistId) {
      return false;
    }
    
    // Filtre par date de début
    if (startDate && new Date(payment.paymentDate) < new Date(startDate)) {
      return false;
    }
    
    // Filtre par date de fin
    if (endDate) {
      const endDateObj = new Date(endDate);
      endDateObj.setHours(23, 59, 59, 999); // Fin de la journée
      if (new Date(payment.paymentDate) > endDateObj) {
        return false;
      }
    }
    
    return true;
  }) || [];

  // Calcul du montant total des paiements filtrés
  const totalAmount = filteredPayments.reduce(
    (sum, payment) => sum + Number(payment.amount),
    0
  );

  // Formater un montant en euros
  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(numAmount);
  };

  // Formater une date
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd MMMM yyyy', { locale: fr });
  };
  
  // Fonction pour obtenir l'URL du PDF du rapport
  const getReportPdfUrl = () => {
    let url = "/api/therapist-payments/export/pdf";
    const params = new URLSearchParams();
    
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    
    if (selectedTherapistId) {
      params.append("therapistId", selectedTherapistId);
      const therapist = therapists?.find(t => t.id.toString() === selectedTherapistId);
      if (therapist) {
        params.append("title", `RELEVÉ DES PAIEMENTS - ${therapist.name}`);
      }
    } else if (customTitle !== "APERÇU DES PAIEMENTS AUX THÉRAPEUTES") {
      params.append("title", customTitle);
    }
    
    return params.toString() ? `${url}?${params.toString()}` : url;
  };

  // Télécharger le PDF du rapport
  const downloadReportPdf = () => {
    window.open(getReportPdfUrl(), "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Aperçu groupé
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Aperçu des paiements</DialogTitle>
          <DialogDescription>
            Visualisez et filtrez les paiements aux thérapeutes
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label className="text-right">Titre:</label>
            <Input 
              className="col-span-3" 
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <label className="text-right">Thérapeute:</label>
            <div className="col-span-3">
              <Select 
                onValueChange={(value) => setSelectedTherapistId(value === "all" ? null : value)}
                value={selectedTherapistId || "all"}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Tous les thérapeutes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les thérapeutes</SelectItem>
                  {therapists?.map((therapist) => (
                    <SelectItem key={therapist.id} value={therapist.id.toString()}>
                      {therapist.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <label className="text-right">Date début:</label>
            <Input 
              className="col-span-3" 
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <label className="text-right">Date fin:</label>
            <Input 
              className="col-span-3" 
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        {paymentsLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            <Card className="bg-muted/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Total des paiements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {formatCurrency(totalAmount)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {filteredPayments.length} paiement{filteredPayments.length !== 1 ? 's' : ''}
                </div>
              </CardContent>
            </Card>
            
            {filteredPayments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucun paiement ne correspond aux critères
              </div>
            ) : (
              <Table>
                <TableCaption>Liste des paiements filtrés</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Facture</TableHead>
                    <TableHead>Thérapeute</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Méthode</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <Badge variant="outline">{payment.invoiceNumber}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{payment.therapistName}</TableCell>
                      <TableCell>{payment.patientName}</TableCell>
                      <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell>{payment.paymentMethod}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}
        
        <DialogFooter className="pt-4 flex gap-3">
          <Button
            variant="outline"
            onClick={downloadReportPdf}
            className="gap-2"
            disabled={filteredPayments.length === 0}
          >
            <FileDown className="h-4 w-4" />
            Télécharger PDF
          </Button>
          <Button 
            onClick={() => setOpen(false)}
          >
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}