import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HomeButton } from "@/components/ui/home-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TherapistPaymentWithDetails, Therapist } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { apiRequest } from "@/lib/queryClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function TherapistPayments() {
  const [selectedTab, setSelectedTab] = useState("all");
  const [selectedTherapist, setSelectedTherapist] = useState<string>("all");

  // Récupérer tous les paiements
  const { data: payments, isLoading: isLoadingPayments } = useQuery({
    queryKey: ['/api/therapist-payments'],
    queryFn: () => apiRequest<TherapistPaymentWithDetails[]>('/api/therapist-payments')
  });

  // Récupérer tous les thérapeutes pour le filtre
  const { data: therapists, isLoading: isLoadingTherapists } = useQuery({
    queryKey: ['/api/therapists'],
    queryFn: () => apiRequest<Therapist[]>('/api/therapists')
  });

  // Filtrer les paiements selon l'onglet et le thérapeute sélectionné
  const filteredPayments = payments?.filter(payment => {
    // Filtre par statut
    const statusFilter = selectedTab === "all" || payment.status === selectedTab;
    
    // Filtre par thérapeute
    const therapistFilter = selectedTherapist === "all" || payment.therapistId.toString() === selectedTherapist;
    
    return statusFilter && therapistFilter;
  }) || [];

  // Fonctions d'aide pour le formatage
  const formatCurrency = (amount: string) => {
    return parseFloat(amount).toLocaleString('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "À traiter":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">À traiter</Badge>;
      case "Traité":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">Traité</Badge>;
      case "Annulé":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">Annulé</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      // Supposant que la date est au format 'dd/MM/yyyy'
      const [day, month, year] = dateString.split('/').map(Number);
      const date = new Date(year, month - 1, day);
      return format(date, 'PPP', { locale: fr });
    } catch (error) {
      return dateString;
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Paiements aux thérapeutes</h1>
          <p className="text-muted-foreground">
            Suivi des paiements générés pour les thérapeutes à partir des factures payées.
          </p>
        </div>
        <HomeButton />
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
          <CardDescription>Filtrer les paiements par statut et thérapeute</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Statut</label>
              <Tabs defaultValue="all" value={selectedTab} onValueChange={setSelectedTab} className="w-full">
                <TabsList className="grid grid-cols-3">
                  <TabsTrigger value="all">Tous</TabsTrigger>
                  <TabsTrigger value="À traiter">À traiter</TabsTrigger>
                  <TabsTrigger value="Traité">Traités</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Thérapeute</label>
              <Select value={selectedTherapist} onValueChange={setSelectedTherapist}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un thérapeute" />
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Liste des paiements ({filteredPayments.length})</CardTitle>
          <CardDescription>
            Paiements générés automatiquement depuis les factures marquées comme payées.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingPayments || isLoadingTherapists ? (
            <div className="py-8 text-center">Chargement des paiements...</div>
          ) : filteredPayments.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">Aucun paiement correspondant aux critères sélectionnés.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Thérapeute</TableHead>
                  <TableHead>Facture</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Méthode</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{formatDate(payment.date)}</TableCell>
                    <TableCell className="font-medium">{payment.therapistName}</TableCell>
                    <TableCell>{payment.invoiceNumber}</TableCell>
                    <TableCell>{payment.patientName}</TableCell>
                    <TableCell>{formatCurrency(payment.amount)}</TableCell>
                    <TableCell>{payment.paymentMethod}</TableCell>
                    <TableCell>{getStatusBadge(payment.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="ml-2"
                        onClick={() => {
                          // TODO: Ouvrir un modal pour modifier le statut
                          alert(`Modification du paiement ${payment.id}`);
                        }}
                      >
                        Modifier
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}