import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CreditCard } from "lucide-react";

interface GeneratePaymentButtonProps {
  invoiceId: number;
  invoiceNumber: string;
  isPaid: boolean;
  paymentExists: boolean;
  className?: string;
}

export default function GeneratePaymentButton({
  invoiceId,
  invoiceNumber,
  isPaid,
  paymentExists,
  className,
}: GeneratePaymentButtonProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const createPaymentMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/create-payment-from-invoice/" + invoiceId, {
        method: "POST",
        body: JSON.stringify({})
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/therapist-payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Paiement créé",
        description: "Le paiement au thérapeute a été généré avec succès",
      });
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description:
          "Une erreur est survenue lors de la création du paiement au thérapeute",
        variant: "destructive",
      });
      console.error("Erreur lors de la génération du paiement:", error);
      setIsDialogOpen(false);
    },
  });

  // Désactivé si la facture n'est pas payée ou si un paiement existe déjà
  const isDisabled = !isPaid || paymentExists;

  // Texte du bouton selon l'état
  const getButtonText = () => {
    if (paymentExists) return "Paiement déjà généré";
    if (!isPaid) return "Facture non payée";
    return "Générer paiement thérapeute";
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className={className}
        disabled={isDisabled}
        onClick={() => setIsDialogOpen(true)}
      >
        <CreditCard className="h-4 w-4 mr-2" />
        {getButtonText()}
      </Button>

      {/* Dialog de confirmation */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Générer un paiement au thérapeute</DialogTitle>
            <DialogDescription>
              Vous êtes sur le point de générer un paiement au thérapeute pour la facture{" "}
              <strong>{invoiceNumber}</strong>. Cette action créera automatiquement une
              entrée de paiement basée sur le montant dû au thérapeute selon
              son pourcentage de rémunération.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex space-x-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button
              onClick={() => createPaymentMutation.mutate()}
              disabled={createPaymentMutation.isPending}
            >
              {createPaymentMutation.isPending
                ? "Génération en cours..."
                : "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}