import React from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button, Input, Textarea, Switch, Label, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
import { Loader2 } from 'lucide-react';
import { InvoiceTemplate, invoiceTemplateFormSchema } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import InvoiceTemplatePreview from "@/components/InvoiceTemplatePreview";

interface InvoiceTemplateFormProps {
  template?: InvoiceTemplate;
  onSuccess?: () => void;
}

export default function InvoiceTemplateForm({ template, onSuccess }: InvoiceTemplateFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm({
    resolver: zodResolver(invoiceTemplateFormSchema),
    defaultValues: template ? {
      ...template,
    } : {
      name: '',
      description: '',
      headerContent: `<div style="text-align: center; margin-bottom: 20px;">
  <h1>Cabinet d'Orthophonie</h1>
  <p>123 Rue de la Santé, 75000 Paris</p>
  <p>Tél: 01 23 45 67 89 - Email: contact@ortho-cabinet.fr</p>
</div>`,
      footerContent: `<div style="text-align: center; font-size: 12px; margin-top: 30px; color: #666;">
  <p>SIRET: 123 456 789 00010 - N° ADELI: 759912345</p>
  <p>Paiement à réception - TVA non applicable, article 293B du CGI</p>
</div>`,
      showTherapistSignature: true,
      logoUrl: '',
      primaryColor: '#4f46e5',
      secondaryColor: '#6366f1',
      fontFamily: 'Arial, sans-serif',
      isDefault: false,
    },
  });
  
  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (template) {
        return apiRequest(`/api/invoice-templates/${template.id}`, "PUT", data);
      } else {
        return apiRequest('/api/invoice-templates', "POST", data);
      }
    },
    onSuccess: () => {
      toast({
        title: template ? "Template mis à jour" : "Template créé",
        description: template ? "Le template a été mis à jour avec succès." : "Le nouveau template a été créé avec succès.",
        variant: "default",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/invoice-templates"] });
      
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: `Erreur lors de ${template ? 'la mise à jour' : 'la création'} du template.`,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (data: any) => {
    mutation.mutate(data);
  };
  
  return (
    <Tabs defaultValue="edition">
      <TabsList className="mb-4">
        <TabsTrigger value="edition">Édition</TabsTrigger>
        <TabsTrigger value="preview">Aperçu</TabsTrigger>
      </TabsList>
      
      <TabsContent value="edition">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom du template</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Template Standard" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Décrivez brièvement ce template..." 
                          className="resize-none h-20"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="logoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL du logo (optionnel)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="primaryColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Couleur primaire</FormLabel>
                        <div className="flex items-center gap-2">
                          <Input type="color" {...field} className="w-12 h-8 p-1" />
                          <Input {...field} className="flex-1" />
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="secondaryColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Couleur secondaire</FormLabel>
                        <div className="flex items-center gap-2">
                          <Input type="color" {...field} className="w-12 h-8 p-1" />
                          <Input {...field} className="flex-1" />
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="fontFamily"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Police de caractères</FormLabel>
                      <FormControl>
                        <Input placeholder="Arial, sans-serif" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="showTherapistSignature"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Signature du thérapeute</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Afficher un espace pour la signature électronique du thérapeute
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                {!template && (
                  <FormField
                    control={form.control}
                    name="isDefault"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>Template par défaut</FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Utiliser ce template pour toutes les nouvelles factures
                          </p>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}
              </div>
              
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="headerContent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contenu de l'en-tête (HTML)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="<div>Contenu de l'en-tête...</div>" 
                          className="font-mono text-sm h-32 resize-none"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="footerContent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contenu du pied de page (HTML)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="<div>Contenu du pied de page...</div>" 
                          className="font-mono text-sm h-32 resize-none"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="border rounded-md p-3 bg-muted/20">
                  <h3 className="font-medium mb-2">Aide HTML</h3>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p><code className="bg-muted p-1 rounded">&lt;div&gt;</code> - Conteneur</p>
                    <p><code className="bg-muted p-1 rounded">&lt;h1&gt;</code> - Titre principal</p>
                    <p><code className="bg-muted p-1 rounded">&lt;p&gt;</code> - Paragraphe</p>
                    <p><code className="bg-muted p-1 rounded">&lt;strong&gt;</code> - Texte en gras</p>
                    <p><code className="bg-muted p-1 rounded">&lt;em&gt;</code> - Texte en italique</p>
                    <p><code className="bg-muted p-1 rounded">style="..."</code> - Styles CSS</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              {template && (
                <Button type="button" variant="outline" onClick={onSuccess}>
                  Annuler
                </Button>
              )}
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {template ? "Mise à jour..." : "Création..."}
                  </>
                ) : (
                  template ? "Mettre à jour" : "Créer le template"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </TabsContent>
      
      <TabsContent value="preview">
        <Card>
          <CardContent className="p-6">
            <h3 className="font-medium mb-3">Aperçu du template</h3>
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-100 p-4 aspect-[8.5/11]">
                <InvoiceTemplatePreview 
                  template={{
                    ...form.getValues(),
                    id: template?.id || 0,
                    createdAt: template?.createdAt || new Date(),
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}