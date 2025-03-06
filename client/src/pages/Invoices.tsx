import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { InvoiceWithDetails, Therapist } from "@shared/schema";
import { Link, useLocation } from "wouter";
import { useState } from "react";

export default function Invoices() {
  const [selectedTherapist, setSelectedTherapist] = useState<string>('all');
  const [, setLocation] = useLocation();
  
  // Récupérer toutes les factures
  const { data: invoices, isLoading, error } = useQuery({
    queryKey: ["/api/invoices"],
    queryFn: async () => {
      const response = await fetch("/api/invoices");
      if (!response.ok) throw new Error("Erreur lors du chargement des factures");
      return response.json() as Promise<InvoiceWithDetails[]>;
    }
  });
  
  // Récupérer tous les thérapeutes pour le filtre
  const { data: therapists } = useQuery({
    queryKey: ["/api/therapists"],
    queryFn: async () => {
      const response = await fetch("/api/therapists");
      if (!response.ok) throw new Error("Erreur lors du chargement des thérapeutes");
      return response.json() as Promise<Therapist[]>;
    }
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>Factures</CardTitle>
            <CardDescription>Chargement des factures...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>Erreur</CardTitle>
            <CardDescription>Une erreur est survenue lors du chargement des factures</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Filtrer les factures par thérapeute si nécessaire
  const filteredInvoices = selectedTherapist === 'all' 
    ? invoices
    : invoices?.filter(invoice => invoice.therapistId === parseInt(selectedTherapist));

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold">Factures</CardTitle>
            <CardDescription>Gestion des factures pour les séances d'orthophonie</CardDescription>
          </div>
          <Button onClick={() => setLocation("/")}>
            Retour à l'accueil
          </Button>
        </CardHeader>
        
        <CardContent>
          <div className="mb-6">
            <div className="flex items-center gap-4 mb-4">
              <Label htmlFor="therapist-filter">Filtrer par orthophoniste:</Label>
              <Select
                value={selectedTherapist}
                onValueChange={setSelectedTherapist}
              >
                <SelectTrigger id="therapist-filter" className="w-[250px]">
                  <SelectValue placeholder="Tous les orthophonistes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les orthophonistes</SelectItem>
                  {therapists?.map((therapist: Therapist) => (
                    <SelectItem key={therapist.id} value={therapist.id.toString()}>
                      {therapist.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Table>
            <TableCaption>Liste des factures émises</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">N° Facture</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Orthophoniste</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4">
                    Aucune facture trouvée
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices?.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                    <TableCell>{invoice.issueDate}</TableCell>
                    <TableCell>{invoice.patientName}</TableCell>
                    <TableCell>{invoice.therapistName}</TableCell>
                    <TableCell>{invoice.totalAmount}€</TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          invoice.status === "Payée" 
                            ? "success" as any
                            : invoice.status === "En attente" 
                              ? "outline" 
                              : "destructive"
                        }
                      >
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => alert(`Détails de la facture ${invoice.invoiceNumber} pour la séance du ${invoice.appointmentDate} à ${invoice.appointmentTime}`)}
                      >
                        Détails
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              Total: {filteredInvoices?.length || 0} facture(s)
            </p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}