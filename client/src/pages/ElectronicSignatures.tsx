import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HomeButton } from "@/components/ui/home-button";
import { Loader2, Save, RefreshCw, PenTool } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Signature } from "@shared/schema";
import SignatureCanvas from "@/components/SignatureCanvas";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";

export default function ElectronicSignatures() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [isSignatureDialogOpen, setIsSignatureDialogOpen] = useState(false);
  
  // Récupération de la signature administrative
  const { 
    data: adminSignature, 
    isLoading: isLoadingSignature, 
    refetch: refetchSignature,
    isError
  } = useQuery({
    queryKey: ['/api/admin-signature'],
    queryFn: async () => {
      try {
        return await apiRequest("GET", '/api/admin-signature');
      } catch (error: any) {
        if (error.status === 404) {
          // Aucune signature trouvée, c'est normal
          return null;
        }
        throw error;
      }
    }
  });
  
  // Mutation pour sauvegarder une signature
  const saveSignatureMutation = useMutation({
    mutationFn: async (data: { signatureData: string }) => {
      return apiRequest(
        'POST',
        '/api/admin-signature',
        data
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin-signature'] });
      refetchSignature();
      setIsSignatureDialogOpen(false);
      setSignatureData(null);
      toast({
        title: "Signature enregistrée",
        description: "La signature administrative a été enregistrée avec succès.",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'enregistrer la signature.",
        variant: "destructive",
      });
    },
  });
  
  // Ouvrir le dialogue de signature
  const openSignatureDialog = () => {
    setSignatureData(adminSignature?.signatureData || null);
    setIsSignatureDialogOpen(true);
  };
  
  // Sauvegarder la signature
  const handleSaveSignature = () => {
    if (!signatureData) return;
    
    // Créer ou mettre à jour la signature
    saveSignatureMutation.mutate({
      signatureData
    });
  };
  
  if (isLoadingSignature) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>Signature Électronique</CardTitle>
            <CardDescription>Chargement en cours...</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-10">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold">Signature Électronique</CardTitle>
            <CardDescription>
              Gérez la signature électronique administrative pour les documents officiels
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => refetchSignature()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
            <HomeButton variant="default" />
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 max-w-lg mx-auto">
            <Card className="overflow-hidden">
              <CardHeader className="p-4">
                <CardTitle className="text-lg">Christian</CardTitle>
                <CardDescription>Signature administrative</CardDescription>
              </CardHeader>
              
              <CardContent className="p-4 pt-0">
                {adminSignature ? (
                  <div className="border rounded-md p-2 bg-gray-50 h-[150px] flex items-center justify-center">
                    <img 
                      src={adminSignature.signatureData} 
                      alt="Signature administrative"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="border border-dashed rounded-md p-2 bg-gray-50 h-[150px] flex flex-col items-center justify-center text-gray-400">
                    <PenTool className="h-8 w-8 mb-2" />
                    Aucune signature enregistrée
                  </div>
                )}
              </CardContent>
              
              <CardFooter className="p-4 pt-0 flex justify-center">
                <Button
                  variant="default"
                  onClick={() => openSignatureDialog()}
                >
                  {adminSignature ? 'Modifier la signature' : 'Ajouter une signature'}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </CardContent>
      </Card>
      
      {/* Dialogue de création/modification de signature */}
      <Dialog open={isSignatureDialogOpen} onOpenChange={setIsSignatureDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {signatureData ? "Modifier la signature" : "Ajouter une signature"}
            </DialogTitle>
            <DialogDescription>
              Dessinez la signature électronique administrative (Christian)
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <SignatureCanvas
              onSave={setSignatureData}
              initialSignature={signatureData || undefined}
              width={350}
              height={200}
            />
          </div>
          
          <DialogFooter className="sm:justify-end">
            <DialogClose asChild>
              <Button variant="outline">Annuler</Button>
            </DialogClose>
            <Button 
              onClick={handleSaveSignature}
              disabled={!signatureData || saveSignatureMutation.isPending}
            >
              {saveSignatureMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              <Save className="mr-2 h-4 w-4" />
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}