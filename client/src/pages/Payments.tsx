import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { HomeButton } from "@/components/ui/home-button";
import { TherapistPaymentWithDetails, Therapist } from "@shared/schema";
import { Badge } from "@/components/ui/badge";

export default function Payments() {
  // Récupération de tous les paiements
  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ["/api/therapist-payments"],
    queryFn: () => apiRequest<TherapistPaymentWithDetails[]>("/api/therapist-payments")
  });

  // Récupération de tous les thérapeutes pour le filtre
  const { data: therapists } = useQuery({
    queryKey: ["/api/therapists"],
    queryFn: () => apiRequest<Therapist[]>("/api/therapists")
  });

  // État pour filtrer par thérapeute
  const [selectedTherapistId, setSelectedTherapistId] = useState<string | null>(null);

  // Filtrer les paiements par thérapeute si un thérapeute est sélectionné
  const filteredPayments = useMemo(() => {
    if (!payments) return [];
    if (!selectedTherapistId || selectedTherapistId === 'all') return payments;
    return payments.filter(payment => payment.therapistId.toString() === selectedTherapistId);
  }, [payments, selectedTherapistId]);

  // Calcul du montant total des paiements
  const totalAmount = useMemo(() => {
    if (!filteredPayments.length) return 0;
    return filteredPayments.reduce((total, payment) => total + Number(payment.amount), 0);
  }, [filteredPayments]);

  // Formater un montant en euros
  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(numAmount);
  };

  // Formater une date
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd MMMM yyyy', { locale: fr });
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Paiements aux Thérapeutes</h1>
          <p className="text-muted-foreground">
            Suivi des paiements effectués aux thérapeutes
          </p>
        </div>
        <HomeButton />
      </div>

      <div className="grid gap-6 mb-8">
        {/* Carte du total des paiements */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Total des paiements</CardTitle>
            <CardDescription>
              Montant total des paiements {selectedTherapistId ? "pour ce thérapeute" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(totalAmount)}</div>
          </CardContent>
        </Card>

        {/* Filtre par thérapeute */}
        <div className="flex gap-4 items-center">
          <span className="font-medium">Filtrer par thérapeute:</span>
          <Select 
            onValueChange={(value) => setSelectedTherapistId(value)}
            value={selectedTherapistId || "all"}
          >
            <SelectTrigger className="w-[250px]">
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

        {/* Tableau des paiements */}
        <Card>
          <CardContent className="pt-6">
            {paymentsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucun paiement trouvé
              </div>
            ) : (
              <Table>
                <TableCaption>Liste des paiements aux thérapeutes</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Numéro de facture</TableHead>
                    <TableHead>Thérapeute</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Date de paiement</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Méthode</TableHead>
                    <TableHead>Référence</TableHead>
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
                      <TableCell>{payment.paymentReference || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Ajouter les imports manquants
import { useState, useMemo } from "react";