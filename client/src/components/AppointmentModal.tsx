import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Patient, Therapist, appointmentFormSchema } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { format } from "date-fns";

interface AppointmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate?: Date;
  initialTime?: string;
  initialTherapistId?: number;
}

export default function AppointmentModal({ 
  open, 
  onOpenChange, 
  initialDate, 
  initialTime,
  initialTherapistId 
}: AppointmentModalProps) {
  const { toast } = useToast();
  
  // Debug logs
  console.log("AppointmentModal - Props:", { open, initialDate, initialTime, initialTherapistId });
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Récupération des données nécessaires
  const { data: patients } = useQuery<Patient[]>({
    queryKey: ['/api/patients'],
  });

  const { data: therapists } = useQuery<Therapist[]>({
    queryKey: ['/api/therapists'],
  });

  // Filtrer les patients selon la recherche
  const filteredPatients = patients?.filter(
    (patient) => 
      patient.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.firstName.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Form avec React Hook Form + Zod
  const form = useForm({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      patientId: 0,
      therapistId: initialTherapistId || 0,
      date: initialDate ? format(initialDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      time: initialTime || "09:00",
      duration: 60,
      type: "Consultation standard",
      notes: "",
      status: "pending"
    }
  });

  // Mettre à jour le formulaire quand les props changent
  useEffect(() => {
    if (initialDate) {
      form.setValue('date', format(initialDate, 'yyyy-MM-dd'));
    }
    if (initialTime) {
      form.setValue('time', initialTime);
    }
    if (initialTherapistId) {
      form.setValue('therapistId', initialTherapistId);
    }
  }, [initialDate, initialTime, initialTherapistId, form]);

  // Mise à jour du patient sélectionné
  useEffect(() => {
    if (selectedPatient) {
      form.setValue('patientId', selectedPatient.id);
    }
  }, [selectedPatient, form]);

  // Mutation pour créer le rendez-vous
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('/api/appointments', 'POST', data);
    },
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Le rendez-vous a été créé avec succès.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      onOpenChange(false);
      form.reset();
      setSelectedPatient(null);
      setSearchQuery("");
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: `Erreur lors de la création du rendez-vous: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Soumission du formulaire
  const onSubmit = form.handleSubmit((data) => {
    createMutation.mutate(data);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Ajouter un rendez-vous</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="patient-search">Rechercher un patient</Label>
            <Input
              id="patient-search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nom ou prénom du patient"
            />
            
            {searchQuery && filteredPatients.length > 0 && (
              <div className="mt-1 max-h-48 overflow-auto rounded border border-gray-200 bg-white">
                {filteredPatients.map((patient) => (
                  <div 
                    key={patient.id}
                    className="p-2 cursor-pointer hover:bg-gray-100"
                    onClick={() => {
                      setSelectedPatient(patient);
                      setSearchQuery(`${patient.lastName} ${patient.firstName}`);
                    }}
                  >
                    {patient.lastName} {patient.firstName}
                  </div>
                ))}
              </div>
            )}
            
            {selectedPatient && (
              <div className="p-2 mt-2 rounded bg-gray-50 border border-gray-200">
                <p><strong>Patient sélectionné:</strong> {selectedPatient.lastName} {selectedPatient.firstName}</p>
                <p><small>{selectedPatient.email} - {selectedPatient.phone}</small></p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="therapist">Thérapeute</Label>
              <Select 
                value={form.watch('therapistId')?.toString()} 
                onValueChange={(value) => form.setValue('therapistId', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un thérapeute" />
                </SelectTrigger>
                <SelectContent>
                  {therapists?.map((therapist) => (
                    <SelectItem key={therapist.id} value={therapist.id.toString()}>
                      {therapist.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.therapistId && (
                <p className="text-sm text-red-500">Thérapeute requis</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type de consultation</Label>
              <Select 
                value={form.watch('type')} 
                onValueChange={(value) => form.setValue('type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Type de consultation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Consultation standard">Consultation standard</SelectItem>
                  <SelectItem value="Suivi">Suivi</SelectItem>
                  <SelectItem value="Urgence">Urgence</SelectItem>
                  <SelectItem value="Première consultation">Première consultation</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                {...form.register('date')}
              />
              {form.formState.errors.date && (
                <p className="text-sm text-red-500">Date requise</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Heure</Label>
              <Input
                id="time"
                type="time"
                {...form.register('time')}
              />
              {form.formState.errors.time && (
                <p className="text-sm text-red-500">Heure requise</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Durée (minutes)</Label>
              <Input
                id="duration"
                type="number"
                min="15"
                step="15"
                {...form.register('duration', { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Notes supplémentaires..."
              {...form.register('notes')}
            />
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={!selectedPatient || createMutation.isPending}
            >
              {createMutation.isPending ? "Création..." : "Créer le rendez-vous"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}