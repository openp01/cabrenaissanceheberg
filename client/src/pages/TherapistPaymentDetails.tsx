import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Download, 
  Printer, 
  Mail, 
  FileText, 
  Calendar, 
  User, 
  DollarSign,
  CreditCard,
  Hash,
  FileEdit 
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { HomeButton } from "@/components/ui/home-button";
import { useState } from "react";

export default function TherapistPaymentDetails() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const id = parseInt(params.id);
  const { toast } = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Récupérer les détails du paiement
  const { 
    data: payment, 
    isLoading, 
    isError 
  } = useQuery({
    queryKey: [`/api/therapist-payments/${id}`],
    enabled: !isNaN(id),
  });

  // Mutation pour supprimer un paiement
  const deletePaymentMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/therapist-payments/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/therapist-payments"] });
      toast({
        title: "Paiement supprimé",
        description: "Le paiement a été supprimé avec succès",
      });
      navigate("/therapist-payments");
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la suppression du paiement",
        variant: "destructive",
      });
      console.error("Erreur lors de la suppression du paiement:", error);
    },
  });

  // Formatter les montants
  const formatAmount = (amount: number | string) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(typeof amount === "string" ? parseFloat(amount) : amount);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 flex justify-center">
        <div className="text-center">
          <p>Chargement des détails du paiement...</p>
        </div>
      </div>
    );
  }

  if (isError || !payment) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Erreur</h2>
          <p className="mb-4">Impossible de charger les détails du paiement.</p>
          <HomeButton />
        </div>
      </div>
    );
  }

  const handleDelete = () => {
    deletePaymentMutation.mutate();
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button variant="outline" size="sm" onClick={() => navigate("/therapist-payments")} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <h1 className="text-3xl font-bold">Détails du paiement</h1>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" />
            Imprimer
          </Button>
          <Button variant="outline" size="sm">
            <Mail className="h-4 w-4 mr-2" />
            Envoyer
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsDeleteDialogOpen(true)}>
            <FileEdit className="h-4 w-4 mr-2" />
            Modifier
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Informations du paiement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Numéro de référence</div>
                  <div className="flex items-center mt-1">
                    <Hash className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="font-medium">{payment.paymentReference || "Aucune référence"}</span>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Date de paiement</div>
                  <div className="flex items-center mt-1">
                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="font-medium">
                      {format(new Date(payment.paymentDate), "dd MMMM yyyy", { locale: fr })}
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Thérapeute</div>
                  <div className="flex items-center mt-1">
                    <User className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="font-medium">{payment.therapistName}</span>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Facture associée</div>
                  <div className="flex items-center mt-1">
                    <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                    <Link href={`/invoices/${payment.invoiceId}`} className="font-medium text-blue-600 hover:underline">
                      {payment.invoiceNumber}
                    </Link>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Montant</div>
                  <div className="flex items-center mt-1">
                    <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="font-bold text-lg">{formatAmount(payment.amount)}</span>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Méthode de paiement</div>
                  <div className="flex items-center mt-1">
                    <CreditCard className="h-4 w-4 mr-2 text-muted-foreground" />
                    <Badge variant="outline">{payment.paymentMethod}</Badge>
                  </div>
                </div>
              </div>

              {payment.notes && (
                <>
                  <Separator />
                  <div>
                    <div className="text-sm text-muted-foreground">Notes</div>
                    <p className="mt-1">{payment.notes}</p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Résumé</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Patient</span>
                <span className="font-medium">{payment.patientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Facture</span>
                <span className="font-medium">{payment.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date de paiement</span>
                <span className="font-medium">
                  {format(new Date(payment.paymentDate), "dd/MM/yyyy")}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>{formatAmount(payment.amount)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog de confirmation de suppression */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer ce paiement ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex space-x-2 justify-end">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={deletePaymentMutation.isPending}
            >
              {deletePaymentMutation.isPending ? "Suppression..." : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}