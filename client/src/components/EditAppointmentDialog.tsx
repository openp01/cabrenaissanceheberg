import { useState, useEffect } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AppointmentWithDetails, Therapist, Patient } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Calendar, Clock } from "lucide-react";

interface EditAppointmentDialogProps {
  appointmentId: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function EditAppointmentDialog({
  appointmentId,
  isOpen,
  onClose,
}: EditAppointmentDialogProps) {
  const { toast } = useToast();
  const [date, setDate] = useState<string>("");
  const [time, setTime] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [duration, setDuration] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [therapistId, setTherapistId] = useState<number | null>(null);

  // États pour vérifier si des modifications ont été apportées
  const [isDirty, setIsDirty] = useState(false);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [availabilityMessage, setAvailabilityMessage] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(true);

  // Time slots
  const timeSlots = [
    "9:00", "9:30", "10:00", "10:30", "11:00", "11:30", 
    "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00"
  ];

  // États du rendez-vous
  const appointmentStatuses = [
    { id: "scheduled", label: "Planifié" },
    { id: "confirmed", label: "Confirmé" },
    { id: "completed", label: "Terminé" },
    { id: "cancelled", label: "Annulé" },
    { id: "no_show", label: "Absence" },
  ];

  // Types de rendez-vous
  const appointmentTypes = [
    { id: "initial", label: "Consultation initiale" },
    { id: "follow_up", label: "Suivi" },
    { id: "evaluation", label: "Évaluation" },
    { id: "therapy", label: "Séance de thérapie" },
    { id: "other", label: "Autre" },
  ];

  // Durées de rendez-vous
  const durations = [
    { value: "30", label: "30 minutes" },
    { value: "45", label: "45 minutes" },
    { value: "60", label: "1 heure" },
    { value: "90", label: "1 heure 30" },
    { value: "120", label: "2 heures" },
  ];

  // Requête pour obtenir les détails du rendez-vous
  const { data: appointment, isLoading: isLoadingAppointment } = useQuery({
    queryKey: ['/api/appointments', appointmentId],
    queryFn: () => apiRequest<AppointmentWithDetails>(`/api/appointments/${appointmentId}`),
    enabled: isOpen && appointmentId > 0,
  });

  // Requête pour obtenir la liste des thérapeutes
  const { data: therapists, isLoading: isLoadingTherapists } = useQuery({
    queryKey: ['/api/therapists'],
    queryFn: () => apiRequest<Therapist[]>('/api/therapists'),
    enabled: isOpen,
  });

  // Mutation pour mettre à jour le rendez-vous
  const updateAppointmentMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/appointments/${appointmentId}`, 'PATCH', data);
    },
    onSuccess: () => {
      toast({
        title: "Rendez-vous mis à jour",
        description: "Le rendez-vous a été modifié avec succès.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la mise à jour du rendez-vous",
        variant: "destructive",
      });
    },
  });

  // Effet pour initialiser les valeurs du formulaire lorsque le rendez-vous est chargé
  useEffect(() => {
    if (appointment) {
      setDate(appointment.date || "");
      setTime(appointment.time || "");
      setStatus(appointment.status || "");
      setNotes(appointment.notes || "");
      setDuration(appointment.duration?.toString() || "");
      setType(appointment.type || "");
      setTherapistId(appointment.therapistId || null);
      setIsDirty(false);
      setAvailabilityMessage(null);
      setIsAvailable(true);
    }
  }, [appointment]);

  // Vérifier la disponibilité du nouveau créneau horaire
  const checkAvailability = async () => {
    if (!therapistId || !date || !time || (appointment && appointment.date === date && appointment.time === time && appointment.therapistId === therapistId)) {
      setIsAvailable(true);
      setAvailabilityMessage(null);
      return true;
    }

    setIsCheckingAvailability(true);
    try {
      const response = await apiRequest(`/api/availability?therapistId=${therapistId}&date=${date}&time=${time}&excludeAppointmentId=${appointmentId}`);
      setIsAvailable(response.available);
      
      if (!response.available) {
        if (response.conflictInfo) {
          setAvailabilityMessage(`Ce créneau est déjà réservé pour le patient ${response.conflictInfo.patientName}`);
        } else {
          setAvailabilityMessage("Ce créneau n'est pas disponible");
        }
      } else {
        setAvailabilityMessage("Créneau disponible");
      }
      
      setIsCheckingAvailability(false);
      return response.available;
    } catch (error) {
      console.error("Erreur lors de la vérification de disponibilité:", error);
      setIsAvailable(false);
      setAvailabilityMessage("Erreur lors de la vérification de disponibilité");
      setIsCheckingAvailability(false);
      return false;
    }
  };

  // Gestionnaire de soumission du formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Vérifier la disponibilité avant de soumettre
    const available = await checkAvailability();
    if (!available) {
      toast({
        title: "Créneau non disponible",
        description: availabilityMessage || "Ce créneau horaire n'est pas disponible",
        variant: "destructive",
      });
      return;
    }
    
    // Préparer les données à envoyer
    const updatedData = {
      date,
      time,
      status,
      notes,
      duration: duration ? parseInt(duration) : null,
      type,
      therapistId,
    };
    
    // Envoyer la demande de mise à jour
    updateAppointmentMutation.mutate(updatedData);
  };

  const handleInputChange = () => {
    setIsDirty(true);
    // Réinitialiser le message de disponibilité si on modifie la date ou l'heure
    setAvailabilityMessage(null);
  };

  // Formater le statut pour affichage
  const getStatusLabel = (statusValue: string) => {
    const status = appointmentStatuses.find(s => s.id === statusValue);
    return status ? status.label : statusValue;
  };

  // Formater le type pour affichage
  const getTypeLabel = (typeValue: string) => {
    const type = appointmentTypes.find(t => t.id === typeValue);
    return type ? type.label : typeValue;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Modifier le rendez-vous</DialogTitle>
          <DialogDescription>
            Modifiez les détails du rendez-vous ci-dessous.
          </DialogDescription>
        </DialogHeader>

        {isLoadingAppointment ? (
          <div className="space-y-6">
            <Skeleton className="h-[20px] w-full" />
            <Skeleton className="h-[20px] w-full" />
            <Skeleton className="h-[20px] w-full" />
          </div>
        ) : (
          <>
            {appointment && (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="mb-4">
                      <Label htmlFor="therapist">Thérapeute</Label>
                      {isLoadingTherapists ? (
                        <Skeleton className="h-[40px] w-full" />
                      ) : (
                        <Select
                          value={therapistId?.toString() || ""}
                          onValueChange={(value) => {
                            setTherapistId(parseInt(value));
                            handleInputChange();
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un thérapeute" />
                          </SelectTrigger>
                          <SelectContent>
                            {therapists?.map((therapist) => (
                              <SelectItem
                                key={therapist.id}
                                value={therapist.id.toString()}
                              >
                                {therapist.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    <div className="mb-4">
                      <Label htmlFor="date">Date</Label>
                      <div className="flex">
                        <Input
                          id="date"
                          type="text"
                          value={date}
                          onChange={(e) => {
                            setDate(e.target.value);
                            handleInputChange();
                          }}
                          placeholder="JJ/MM/AAAA"
                          className="flex-1"
                        />
                        <div className="ml-2 flex items-center text-gray-500">
                          <Calendar size={18} />
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Format: JJ/MM/AAAA (ex: 01/01/2025)
                      </p>
                    </div>

                    <div className="mb-4">
                      <Label htmlFor="time">Heure</Label>
                      <div className="relative">
                        <Select
                          value={time}
                          onValueChange={(value) => {
                            setTime(value);
                            handleInputChange();
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Sélectionner l'heure" />
                          </SelectTrigger>
                          <SelectContent>
                            {timeSlots.map((slot) => (
                              <SelectItem key={slot} value={slot}>
                                {slot}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="absolute right-10 top-1/2 transform -translate-y-1/2 text-gray-500">
                          <Clock size={18} />
                        </div>
                      </div>
                    </div>

                    {/* Message de disponibilité */}
                    {availabilityMessage && (
                      <div className={`p-2 rounded-md text-sm mb-4 ${isAvailable ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        <div className="flex items-center">
                          {!isAvailable && <AlertCircle className="h-4 w-4 mr-2" />}
                          {availabilityMessage}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="mb-4">
                      <Label htmlFor="status">Statut</Label>
                      <Select 
                        value={status} 
                        onValueChange={(value) => {
                          setStatus(value);
                          handleInputChange();
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner le statut" />
                        </SelectTrigger>
                        <SelectContent>
                          {appointmentStatuses.map((status) => (
                            <SelectItem key={status.id} value={status.id}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="mb-4">
                      <Label htmlFor="type">Type</Label>
                      <Select 
                        value={type || ""} 
                        onValueChange={(value) => {
                          setType(value);
                          handleInputChange();
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner le type" />
                        </SelectTrigger>
                        <SelectContent>
                          {appointmentTypes.map((type) => (
                            <SelectItem key={type.id} value={type.id}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="mb-4">
                      <Label htmlFor="duration">Durée</Label>
                      <Select 
                        value={duration || ""} 
                        onValueChange={(value) => {
                          setDuration(value);
                          handleInputChange();
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner la durée" />
                        </SelectTrigger>
                        <SelectContent>
                          {durations.map((duration) => (
                            <SelectItem key={duration.value} value={duration.value}>
                              {duration.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={notes || ""}
                    onChange={(e) => {
                      setNotes(e.target.value);
                      handleInputChange();
                    }}
                    placeholder="Ajouter des notes au rendez-vous"
                    className="h-32"
                  />
                </div>

                <DialogFooter className="flex justify-between items-center">
                  <div className="flex items-center text-sm text-gray-500">
                    {appointment.isRecurring && (
                      <div className="bg-amber-50 border border-amber-200 rounded-md p-2">
                        <span className="font-medium text-amber-700">
                          Rendez-vous récurrent
                        </span>
                        {appointment.parentAppointmentId ? (
                          <span className="ml-1 text-amber-600">
                            (lié au rendez-vous #{appointment.parentAppointmentId})
                          </span>
                        ) : (
                          <span className="ml-1 text-amber-600">
                            (rendez-vous parent)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={onClose}>
                      Annuler
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={!isDirty || updateAppointmentMutation.isPending || isCheckingAvailability}
                    >
                      {updateAppointmentMutation.isPending ? "Mise à jour..." : "Enregistrer"}
                    </Button>
                  </div>
                </DialogFooter>
              </form>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}