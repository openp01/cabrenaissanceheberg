import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HomeButton } from "@/components/ui/home-button";
import { Loader2, Save, RefreshCw } from "lucide-react";
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
  const [selectedTherapistId, setSelectedTherapistId] = useState<number | null>(null);
  const [selectedTherapistName, setSelectedTherapistName] = useState<string>('');
  
  // Récupération des thérapeutes
  const { data: therapists, isLoading: isLoadingTherapists } = useQuery({
    queryKey: ['/api/therapists'],
    queryFn: async () => {
      const response = await fetch('/api/therapists');
      if (!response.ok) throw new Error("Erreur lors du chargement des thérapeutes");
      return response.json();
    }
  });
  
  // Récupération des signatures existantes
  const { 
    data: signatures, 
    isLoading: isLoadingSignatures, 
    refetch: refetchSignatures 
  } = useQuery({
    queryKey: ['/api/signatures'],
    queryFn: async () => {
      const response = await fetch('/api/signatures');
      if (!response.ok) throw new Error("Erreur lors du chargement des signatures");
      return response.json() as Promise<Signature[]>;
    }
  });
  
  // Mutation pour sauvegarder une signature
  const saveSignatureMutation = useMutation({
    mutationFn: async (data: { therapistId: number, signatureData: string }) => {
      return apiRequest(
        'POST',
        '/api/signatures',
        data
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/signatures'] });
      refetchSignatures();
      setIsSignatureDialogOpen(false);
      setSignatureData(null);
      toast({
        title: "Signature enregistrée",
        description: "La signature électronique a été enregistrée avec succès.",
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
  
  // Mutation pour mettre à jour une signature
  const updateSignatureMutation = useMutation({
    mutationFn: async ({ 
      signatureId, 
      therapistId, 
      signatureData 
    }: { 
      signatureId: number, 
      therapistId: number, 
      signatureData: string 
    }) => {
      return apiRequest(
        'PUT',
        `/api/signatures/${signatureId}`,
        { therapistId, signatureData }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/signatures'] });
      refetchSignatures();
      setIsSignatureDialogOpen(false);
      setSignatureData(null);
      toast({
        title: "Signature mise à jour",
        description: "La signature électronique a été mise à jour avec succès.",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour la signature.",
        variant: "destructive",
      });
    },
  });
  
  // Mutation pour supprimer une signature
  const deleteSignatureMutation = useMutation({
    mutationFn: async (signatureId: number) => {
      return apiRequest(
        'DELETE',
        `/api/signatures/${signatureId}`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/signatures'] });
      refetchSignatures();
      toast({
        title: "Signature supprimée",
        description: "La signature électronique a été supprimée avec succès.",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer la signature.",
        variant: "destructive",
      });
    },
  });
  
  // Vérifier si un thérapeute a déjà une signature
  const getTherapistSignature = (therapistId: number) => {
    if (!signatures) return null;
    return signatures.find(signature => signature.therapistId === therapistId);
  };
  
  // Ouvrir le dialogue de signature pour un thérapeute
  const openSignatureDialog = (therapistId: number, therapistName: string) => {
    const existingSignature = getTherapistSignature(therapistId);
    setSelectedTherapistId(therapistId);
    setSelectedTherapistName(therapistName);
    setSignatureData(existingSignature?.signatureData || null);
    setIsSignatureDialogOpen(true);
  };
  
  // Sauvegarder la signature
  const handleSaveSignature = () => {
    if (!selectedTherapistId || !signatureData) return;
    
    const existingSignature = getTherapistSignature(selectedTherapistId);
    
    if (existingSignature) {
      // Mettre à jour une signature existante
      updateSignatureMutation.mutate({
        signatureId: existingSignature.id,
        therapistId: selectedTherapistId,
        signatureData
      });
    } else {
      // Créer une nouvelle signature
      saveSignatureMutation.mutate({
        therapistId: selectedTherapistId,
        signatureData
      });
    }
  };
  
  if (isLoadingTherapists || isLoadingSignatures) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>Signatures Électroniques</CardTitle>
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
            <CardTitle className="text-2xl font-bold">Signatures Électroniques</CardTitle>
            <CardDescription>
              Gérez les signatures électroniques des thérapeutes pour les documents officiels
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => refetchSignatures()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
            <HomeButton variant="default" />
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {therapists && therapists.map((therapist: any) => {
              const signature = getTherapistSignature(therapist.id);
              return (
                <Card key={therapist.id} className="overflow-hidden">
                  <CardHeader className="p-4">
                    <CardTitle className="text-lg">{therapist.name}</CardTitle>
                    <CardDescription>{therapist.specialty || 'Thérapeute'}</CardDescription>
                  </CardHeader>
                  
                  <CardContent className="p-4 pt-0">
                    {signature ? (
                      <div className="border rounded-md p-2 bg-gray-50 h-[120px] flex items-center justify-center">
                        <img 
                          src={signature.signatureData} 
                          alt={`Signature de ${therapist.name}`}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="border border-dashed rounded-md p-2 bg-gray-50 h-[120px] flex items-center justify-center text-gray-400">
                        Aucune signature
                      </div>
                    )}
                  </CardContent>
                  
                  <CardFooter className="p-4 pt-0 flex justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openSignatureDialog(therapist.id, therapist.name)}
                    >
                      {signature ? 'Modifier' : 'Ajouter'}
                    </Button>
                    
                    {signature && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteSignatureMutation.mutate(signature.id)}
                        disabled={deleteSignatureMutation.isPending}
                      >
                        Supprimer
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
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
              {`Dessinez la signature électronique pour ${selectedTherapistName}`}
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
              disabled={!signatureData || saveSignatureMutation.isPending || updateSignatureMutation.isPending}
            >
              {(saveSignatureMutation.isPending || updateSignatureMutation.isPending) && (
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