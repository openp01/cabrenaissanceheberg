import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Save, Lock, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { UserRole, Therapist } from "@shared/schema";
import { Badge } from "@/components/ui/badge";

// Couleurs prédéfinies pour les thérapeutes
const PREDEFINED_COLORS = [
  { name: "Vert", value: "#3fb549" }, // Couleur principale CPR
  { name: "Vert foncé", value: "#266d2c" }, // Couleur secondaire CPR
  { name: "Bleu", value: "#3b82f6" },
  { name: "Rouge", value: "#ef4444" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Orange", value: "#f97316" },
  { name: "Rose", value: "#ec4899" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Jaune", value: "#eab308" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Émeraude", value: "#10b981" },
  { name: "Bleu foncé", value: "#1d4ed8" },
  { name: "Rouge foncé", value: "#991b1b" }
];

// Schéma de validation pour le formulaire de changement de mot de passe
const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Le mot de passe actuel est requis"),
  newPassword: z.string().min(8, "Le nouveau mot de passe doit contenir au moins 8 caractères"),
  confirmPassword: z.string().min(1, "La confirmation du mot de passe est requise"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

type PasswordChangeData = z.infer<typeof passwordChangeSchema>;

// Composant pour sélectionner la couleur d'un thérapeute
const TherapistColorSelector = ({ therapistId }: { therapistId?: number }) => {
  const { toast } = useToast();
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  // Requête pour récupérer les données du thérapeute
  const { data: therapist, isLoading: isLoadingTherapist } = useQuery({
    queryKey: [`/api/therapists/${therapistId}`],
    select: (data) => data as Therapist,
    enabled: !!therapistId // Active la requête seulement si therapistId est défini
  });

  // Effet pour initialiser la couleur sélectionnée
  useEffect(() => {
    if (therapist?.color) {
      setSelectedColor(therapist.color);
    }
  }, [therapist]);

  // Mutation pour mettre à jour la couleur du thérapeute
  const updateColorMutation = useMutation({
    mutationFn: async (color: string) => {
      return apiRequest(`/api/therapists/${therapistId}`, "PATCH", { color });
    },
    onSuccess: () => {
      toast({
        title: "Couleur modifiée",
        description: "Votre couleur a été mise à jour avec succès.",
        variant: "default",
      });
      
      // Invalider les requêtes pour recharger les données
      queryClient.invalidateQueries({ queryKey: [`/api/therapists/${therapistId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/therapists'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de la modification de la couleur.",
        variant: "destructive",
      });
    }
  });

  // Fonction pour gérer la sélection d'une couleur
  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    updateColorMutation.mutate(color);
  };

  if (isLoadingTherapist) {
    return <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Personnalisation de la couleur</h3>
      <p className="text-sm text-gray-600">
        Choisissez une couleur pour vous représenter dans le planning commun des thérapeutes.
      </p>

      <div className="flex flex-col space-y-4">
        <div className="flex flex-wrap gap-3 mt-2">
          {PREDEFINED_COLORS.map((color) => (
            <div
              key={color.value}
              className={`
                w-10 h-10 rounded-full cursor-pointer flex items-center justify-center border-2
                ${selectedColor === color.value ? 'border-gray-800' : 'border-transparent'}
                transition-all hover:scale-110 hover:shadow-md
              `}
              style={{ backgroundColor: color.value }}
              onClick={() => handleColorSelect(color.value)}
              title={color.name}
            >
              {selectedColor === color.value && (
                <div className="text-white">✓</div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4">
          <h4 className="font-medium mb-2">Aperçu</h4>
          <div className="flex space-x-4 items-center">
            <Badge 
              style={{ 
                backgroundColor: selectedColor || '#ccc',
                color: 'white',
                padding: '0.5rem 1rem',
              }}
              className="text-sm"
            >
              {therapist?.name || 'Votre nom'}
            </Badge>
            <p className="text-sm text-gray-500">(Ainsi apparaîtra votre nom dans le planning)</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("password");

  const form = useForm<PasswordChangeData>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Mutation pour changer le mot de passe
  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordChangeData) => {
      return apiRequest<{success: boolean; message: string}>("/api/auth/change-password", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Mot de passe modifié",
        description: "Votre mot de passe a été modifié avec succès.",
        variant: "default",
      });
      
      // Réinitialiser le formulaire
      form.reset({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de la modification du mot de passe.",
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: PasswordChangeData) {
    changePasswordMutation.mutate(data);
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Alert className="max-w-md">
          <AlertTitle>Non connecté</AlertTitle>
          <AlertDescription>
            Vous devez être connecté pour accéder à cette page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-8">Mon profil</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Nom d'utilisateur</h3>
                  <p className="mt-1">{user.username}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Email</h3>
                  <p className="mt-1">{user.email}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Rôle</h3>
                  <p className="mt-1">{
                    user.role === UserRole.ADMIN 
                      ? "Administrateur" 
                      : user.role === UserRole.SECRETARIAT 
                        ? "Secrétariat" 
                        : "Thérapeute"
                  }</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres du compte</CardTitle>
              <CardDescription>
                Gérez les paramètres de votre compte
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="password">Mot de passe</TabsTrigger>
                  {user.role === UserRole.THERAPIST && (
                    <TabsTrigger value="appearance">Apparence</TabsTrigger>
                  )}
                </TabsList>
                
                <TabsContent value="password">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <FormField
                        control={form.control}
                        name="currentPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mot de passe actuel</FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                placeholder="Entrez votre mot de passe actuel" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="newPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nouveau mot de passe</FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                placeholder="Entrez votre nouveau mot de passe" 
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              Au moins 8 caractères
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirmer le nouveau mot de passe</FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                placeholder="Confirmez votre nouveau mot de passe" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={changePasswordMutation.isPending}
                      >
                        {changePasswordMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Modification en cours...
                          </>
                        ) : (
                          <>
                            <Lock className="mr-2 h-4 w-4" />
                            Changer le mot de passe
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
                
                {user.role === UserRole.THERAPIST && (
                  <TabsContent value="appearance">
                    <TherapistColorSelector therapistId={user.therapistId} />
                  </TabsContent>
                )}
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}