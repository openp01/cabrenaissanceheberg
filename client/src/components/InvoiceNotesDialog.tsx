import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Pencil } from "lucide-react";

interface InvoiceNotesDialogProps {
  invoiceId: number;
  invoiceNumber: string;
  currentNotes?: string;
}

export default function InvoiceNotesDialog({
  invoiceId,
  invoiceNumber,
  currentNotes = "",
}: InvoiceNotesDialogProps) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(currentNotes);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mutation pour mettre à jour les notes
  const updateInvoiceNotes = useMutation({
    mutationFn: async (notes: string) => {
      return apiRequest<any>(
        `/api/invoices/${invoiceId}`,
        "PUT",
        { notes }
      );
    },
    onSuccess: () => {
      // Invalider le cache et forcer un rechargement des factures
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      
      toast({
        title: "Notes mises à jour",
        description: "Les notes pour l'assurance ont été mises à jour avec succès.",
        variant: "default",
      });
      
      // Fermer le dialogue
      setOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la mise à jour des notes.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateInvoiceNotes.mutate(notes);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800"
        >
          <Pencil className="mr-1 h-3 w-3" />
          Notes
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Notes pour l'assurance</DialogTitle>
          <DialogDescription>
            Ajouter ou modifier les notes pour la facture {invoiceNumber}.
            Ces notes apparaîtront sur la facture, sous le motif de consultation.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes pour l'assurance</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Informations particulières pour l'assurance"
                className="h-32"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
            >
              Annuler
            </Button>
            <Button 
              type="submit"
              disabled={updateInvoiceNotes.isPending}
            >
              {updateInvoiceNotes.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}