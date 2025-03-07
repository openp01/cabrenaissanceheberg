import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "wouter";
import { Therapist, TherapistPaymentFormData } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CalendarIcon, PlusCircle, FileText, Search, Filter, Download, ArrowUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

export default function TherapistPayments() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("tous");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTherapist, setSelectedTherapist] = useState<string>("");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  }>({ key: "paymentDate", direction: "desc" });
  const [isPaymentFormOpen, setIsPaymentFormOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Requête pour récupérer tous les paiements
  const { data: payments = [], isLoading: isLoadingPayments } = useQuery({
    queryKey: ["/api/therapist-payments"],
    select: (data) => data || [],
  });

  // Requête pour récupérer tous les thérapeutes (pour le filtre et le formulaire)
  const { data: therapists = [], isLoading: isLoadingTherapists } = useQuery({
    queryKey: ["/api/therapists"],
    select: (data) => data || [],
  });

  // Requête pour récupérer toutes les factures (pour le formulaire de création)
  const { data: invoices = [], isLoading: isLoadingInvoices } = useQuery({
    queryKey: ["/api/invoices"],
    select: (data) => data || [],
  });

  // Mutation pour créer un paiement
  const createPaymentMutation = useMutation({
    mutationFn: async (data: TherapistPaymentFormData) => {
      // Convertir le montant en nombre
      const adaptedData = {
        ...data,
        amount: Number(data.amount)
      };
      return apiRequest("/api/therapist-payments", {
        method: "POST",
        body: JSON.stringify(adaptedData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/therapist-payments"] });
      toast({
        title: "Paiement créé",
        description: "Le paiement a été créé avec succès",
      });
      setIsPaymentFormOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la création du paiement",
        variant: "destructive",
      });
      console.error("Erreur lors de la création du paiement:", error);
    },
  });

  // Mutation pour créer un paiement à partir d'une facture
  const createPaymentFromInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: number) => {
      return apiRequest(`/api/create-payment-from-invoice/${invoiceId}`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/therapist-payments"] });
      toast({
        title: "Paiement créé",
        description: "Le paiement a été créé avec succès à partir de la facture",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la création du paiement à partir de la facture",
        variant: "destructive",
      });
      console.error("Erreur lors de la création du paiement depuis la facture:", error);
    },
  });

  // Filtre des paiements selon les critères
  const filteredPayments = payments.filter((payment: any) => {
    const matchesSearch = 
      payment.therapistName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.patientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.paymentMethod?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.paymentReference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (payment.notes && payment.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesTherapist = selectedTherapist ? payment.therapistId === parseInt(selectedTherapist) : true;
    
    const matchesDateRange = () => {
      if (!startDate && !endDate) return true;
      
      const paymentDate = new Date(payment.paymentDate);
      
      if (startDate && endDate) {
        return paymentDate >= startDate && paymentDate <= endDate;
      }
      
      if (startDate && !endDate) {
        return paymentDate >= startDate;
      }
      
      if (!startDate && endDate) {
        return paymentDate <= endDate;
      }
      
      return true;
    };
    
    return matchesSearch && matchesTherapist && matchesDateRange();
  });

  // Tri des paiements
  const sortedPayments = [...filteredPayments].sort((a: any, b: any) => {
    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];
    
    // Gestion spécifique pour certains champs
    if (sortConfig.key === "amount") {
      aValue = parseFloat(aValue);
      bValue = parseFloat(bValue);
    } else if (sortConfig.key === "paymentDate") {
      aValue = new Date(aValue);
      bValue = new Date(bValue);
    }
    
    if (aValue < bValue) {
      return sortConfig.direction === "asc" ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === "asc" ? 1 : -1;
    }
    return 0;
  });

  // Changer le tri
  const requestSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // Initialiser le formulaire de création de paiement
  const form = useForm<TherapistPaymentFormData>({
    defaultValues: {
      therapistId: undefined,
      invoiceId: undefined,
      amount: undefined,
      paymentDate: format(new Date(), "yyyy-MM-dd"),
      paymentMethod: "Virement",
      paymentReference: "",
      notes: "",
    },
  });

  // Réinitialiser le formulaire à l'ouverture
  const handleOpenPaymentForm = () => {
    form.reset({
      therapistId: undefined,
      invoiceId: undefined,
      amount: undefined,
      paymentDate: format(new Date(), "yyyy-MM-dd"),
      paymentMethod: "Virement",
      paymentReference: "",
      notes: "",
    });
    setIsPaymentFormOpen(true);
  };

  // Soumettre le formulaire
  const onSubmit = (data: TherapistPaymentFormData) => {
    createPaymentMutation.mutate(data);
  };

  // Formatter les nombres pour l'affichage
  const formatAmount = (amount: number | string) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(typeof amount === "string" ? parseFloat(amount) : amount);
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Paiements des Thérapeutes</h1>
        <Button onClick={handleOpenPaymentForm}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nouveau Paiement
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="tous">Tous les paiements</TabsTrigger>
          <TabsTrigger value="mois-courant">Mois courant</TabsTrigger>
          <TabsTrigger value="en-attente">En attente</TabsTrigger>
        </TabsList>
        
        <TabsContent value="tous" className="space-y-4">
          <Card>
            <CardHeader className="p-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="relative w-full md:w-1/3">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="gap-2">
                        <Filter className="h-4 w-4" />
                        Filtres
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                      <div className="space-y-4">
                        <h4 className="font-medium">Filtrer les paiements</h4>
                        <div className="space-y-2">
                          <Label htmlFor="therapist">Thérapeute</Label>
                          <Select
                            value={selectedTherapist}
                            onValueChange={setSelectedTherapist}
                          >
                            <SelectTrigger id="therapist">
                              <SelectValue placeholder="Tous les thérapeutes" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">Tous les thérapeutes</SelectItem>
                              {therapists.map((therapist: Therapist) => (
                                <SelectItem key={therapist.id} value={therapist.id.toString()}>
                                  {therapist.firstName} {therapist.lastName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="start-date">Date de début</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-start text-left font-normal"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {startDate ? (
                                  format(startDate, "dd MMMM yyyy", { locale: fr })
                                ) : (
                                  <span>Choisir une date</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={startDate}
                                onSelect={setStartDate}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="end-date">Date de fin</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-start text-left font-normal"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {endDate ? (
                                  format(endDate, "dd MMMM yyyy", { locale: fr })
                                ) : (
                                  <span>Choisir une date</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={endDate}
                                onSelect={setEndDate}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        
                        <div className="flex justify-between">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSelectedTherapist("");
                              setStartDate(undefined);
                              setEndDate(undefined);
                              setIsFilterOpen(false);
                            }}
                          >
                            Réinitialiser
                          </Button>
                          <Button onClick={() => setIsFilterOpen(false)}>
                            Appliquer
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Exporter
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              {isLoadingPayments ? (
                <div className="text-center py-4">Chargement des paiements...</div>
              ) : sortedPayments.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Aucun paiement trouvé</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-36">
                          <div 
                            className="flex items-center cursor-pointer" 
                            onClick={() => requestSort("paymentDate")}
                          >
                            Date
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead>
                          <div 
                            className="flex items-center cursor-pointer" 
                            onClick={() => requestSort("therapistName")}
                          >
                            Thérapeute
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead>
                          <div 
                            className="flex items-center cursor-pointer" 
                            onClick={() => requestSort("invoiceNumber")}
                          >
                            Facture
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead>
                          <div 
                            className="flex items-center cursor-pointer" 
                            onClick={() => requestSort("patientName")}
                          >
                            Patient
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead>
                          <div 
                            className="flex items-center cursor-pointer" 
                            onClick={() => requestSort("amount")}
                          >
                            Montant
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead>
                          <div 
                            className="flex items-center cursor-pointer" 
                            onClick={() => requestSort("paymentMethod")}
                          >
                            Méthode
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead>Référence</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedPayments.map((payment: any) => (
                        <TableRow key={payment.id}>
                          <TableCell>
                            {format(new Date(payment.paymentDate), "dd/MM/yyyy")}
                          </TableCell>
                          <TableCell>
                            {payment.therapistName}
                          </TableCell>
                          <TableCell>
                            <Link href={`/invoices/${payment.invoiceId}`} className="text-blue-600 hover:underline">
                              {payment.invoiceNumber}
                            </Link>
                          </TableCell>
                          <TableCell>{payment.patientName}</TableCell>
                          <TableCell className="font-medium">
                            {formatAmount(payment.amount)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{payment.paymentMethod}</Badge>
                          </TableCell>
                          <TableCell>{payment.paymentReference || "-"}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm">
                                <FileText className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="mois-courant">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-medium mb-4">Paiements du mois en cours</h3>
              {/* Contenu spécifique aux paiements du mois courant */}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="en-attente">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-medium mb-4">Paiements en attente</h3>
              {/* Contenu spécifique aux paiements en attente */}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Formulaire de création de paiement */}
      <Dialog open={isPaymentFormOpen} onOpenChange={setIsPaymentFormOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Nouveau Paiement</DialogTitle>
            <DialogDescription>
              Créez un nouveau paiement pour un thérapeute. Les champs marqués d'un astérisque sont obligatoires.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="therapistId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Thérapeute *</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un thérapeute" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {therapists.map((therapist: Therapist) => (
                          <SelectItem
                            key={therapist.id}
                            value={therapist.id.toString()}
                          >
                            {therapist.firstName} {therapist.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="invoiceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Facture *</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une facture" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {invoices
                          .filter((invoice: any) => invoice.status === "payé")
                          .map((invoice: any) => (
                            <SelectItem
                              key={invoice.id}
                              value={invoice.id.toString()}
                            >
                              {invoice.invoiceNumber} - {invoice.patientName} ({formatAmount(invoice.amount)})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Seules les factures marquées comme payées sont disponibles.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Montant *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date de paiement *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(new Date(field.value), "PPP", { locale: fr })
                            ) : (
                              <span>Sélectionner une date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) =>
                            field.onChange(date ? format(date, "yyyy-MM-dd") : "")
                          }
                          disabled={(date) => date > new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Méthode de paiement *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une méthode" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Virement">Virement bancaire</SelectItem>
                        <SelectItem value="Chèque">Chèque</SelectItem>
                        <SelectItem value="Espèces">Espèces</SelectItem>
                        <SelectItem value="Carte">Carte bancaire</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentReference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Référence de paiement</FormLabel>
                    <FormControl>
                      <Input placeholder="Numéro de chèque, référence de virement..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Input placeholder="Notes supplémentaires..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsPaymentFormOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={createPaymentMutation.isPending}>
                  {createPaymentMutation.isPending ? "Création en cours..." : "Créer le paiement"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}