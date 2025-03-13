import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { BookingFormData, TherapistSchedule } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface AppointmentConfirmationProps {
  formData: BookingFormData;
}

export default function AppointmentConfirmation({ formData }: AppointmentConfirmationProps) {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  
  const { 
    patient, 
    therapist, 
    selectedTherapists, 
    date, 
    time, 
    isRecurring, 
    recurringFrequency, 
    recurringCount, 
    recurringDates,
    allowMultiplePerWeek,
    therapistSchedules,
    isMultipleTherapists: formMultipleTherapists
  } = formData;
  
  // Déterminer si nous sommes en mode multiple ou simple
  const isMultipleTherapists = allowMultiplePerWeek && selectedTherapists && selectedTherapists.length > 1;
  
  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: async () => {
      if (!patient || !date || !time) {
        throw new Error("Informations manquantes pour créer le rendez-vous");
      }
      
      // En mode multiple, on crée un rendez-vous pour chaque thérapeute sélectionné
      if (isMultipleTherapists && selectedTherapists) {
        // Créer tous les rendez-vous avec leurs horaires spécifiques
        const promises = selectedTherapists.map(therapist => {
          // Trouver l'horaire spécifique pour ce thérapeute
          const schedule = therapistSchedules?.find((s: TherapistSchedule) => s.therapistId === therapist.id);
          
          // Utiliser l'horaire spécifique s'il existe, sinon utiliser l'horaire par défaut
          const appointmentDate = schedule?.date || date;
          const appointmentTime = schedule?.time || time;
          
          // Vérifier que l'horaire est bien défini
          if (!appointmentDate || !appointmentTime) {
            console.warn(`Horaire manquant pour le thérapeute ${therapist.name}`);
            return Promise.resolve(null); // Ignorer ce thérapeute
          }
          
          const appointmentData = {
            patientId: patient.id,
            therapistId: therapist.id,
            date: appointmentDate,
            time: appointmentTime,
            status: "confirmed",
            isRecurring: isRecurring || false,
            recurringFrequency: recurringFrequency,
            recurringCount: recurringCount,
          };
          
          return apiRequest("/api/appointments", "POST", appointmentData);
        });
        
        // Attendre que tous les rendez-vous soient créés
        return Promise.all(promises);
      } else {
        // Comportement standard - un seul thérapeute
        if (!therapist) {
          throw new Error("Thérapeute manquant pour créer le rendez-vous");
        }
        
        const appointmentData = {
          patientId: patient.id,
          therapistId: therapist.id,
          date,
          time,
          status: "confirmed",
          isRecurring: isRecurring || false,
          recurringFrequency: recurringFrequency,
          recurringCount: recurringCount,
        };
        
        return await apiRequest("/api/appointments", "POST", appointmentData);
      }
    },
    onSuccess: () => {
      const isMultipleAppointments = isMultipleTherapists && selectedTherapists && selectedTherapists.length > 1;
      
      toast({
        title: isMultipleAppointments ? "Rendez-vous confirmés" : "Rendez-vous confirmé",
        description: isMultipleAppointments 
          ? `${selectedTherapists?.length} rendez-vous ont été créés avec succès` 
          : "Votre rendez-vous a été créé avec succès",
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      
      // Redirect to appointments list
      setTimeout(() => {
        setLocation("/appointments");
      }, 1500);
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la création du rendez-vous",
        variant: "destructive",
      });
    },
  });
  
  // Vérification des informations requises en mode standard ou multiple
  const isMissingInfo = !patient || !date || !time || 
    (!isMultipleTherapists && !therapist) || 
    (isMultipleTherapists && (!selectedTherapists || selectedTherapists.length === 0));

  if (isMissingInfo) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="material-icons text-yellow-400">warning</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Informations manquantes. Veuillez remplir tous les champs requis.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="material-icons text-green-400">check_circle</span>
          </div>
          <div className="ml-3">
            <p className="text-sm text-green-700">
              {isMultipleTherapists && selectedTherapists ? 
                `Vous êtes sur le point de créer ${selectedTherapists.length} rendez-vous simultanés.` :
                "Vous êtes sur le point de confirmer votre rendez-vous."
              }
            </p>
          </div>
        </div>
      </div>
      
      <h3 className="text-lg font-medium text-gray-900 mb-4">Résumé de votre rendez-vous</h3>
      
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Détails du patient</h3>
        </div>
        <div className="border-t border-gray-200">
          <dl>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Nom complet</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{patient.firstName} {patient.lastName}</dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Email</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{patient.email || "-"}</dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Téléphone</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{patient.phone || "-"}</dd>
            </div>
          </dl>
        </div>
      </div>
      
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Détails du rendez-vous</h3>
        </div>
        <div className="border-t border-gray-200">
          <dl>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">
                {isMultipleTherapists ? "Thérapeutes" : "Thérapeute"}
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {isMultipleTherapists && selectedTherapists ? (
                  <div>
                    <ul className="divide-y divide-gray-200">
                      {selectedTherapists.map((t, index) => (
                        <li key={t.id} className={index === 0 ? "" : "pt-2"}>
                          <div className="flex items-center">
                            <div className={`w-2 h-2 rounded-full mr-2 ${
                              t.color ? `bg-[${t.color}]` : 
                              index === 0 ? 'bg-primary' : 
                              index === 1 ? 'bg-blue-400' : 'bg-purple-500'
                            }`}></div>
                            {t.name}
                            {index === 0 && <span className="ml-2 text-xs font-medium text-gray-500">(principal)</span>}
                          </div>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-xs text-amber-600 font-medium">
                      Mode multi-thérapeutes activé. Un rendez-vous sera créé pour chaque thérapeute.
                    </p>
                  </div>
                ) : (
                  <>{therapist && therapist.name}</>
                )}
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Date et heure</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {isMultipleTherapists && selectedTherapists && therapistSchedules && therapistSchedules.some((s: TherapistSchedule) => s.date && s.time) ? (
                  <div className="space-y-2">
                    <p className="text-xs text-amber-600 font-medium mb-2">Horaires spécifiques par thérapeute :</p>
                    <ul className="space-y-1">
                      {selectedTherapists.map(therapist => {
                        const schedule = therapistSchedules.find(s => s.therapistId === therapist.id);
                        const scheduleDate = schedule?.date || date;
                        const scheduleTime = schedule?.time || time;
                        
                        return (
                          <li key={therapist.id} className="flex items-center">
                            <span className="w-2 h-2 rounded-full mr-2 bg-primary"></span>
                            <span className="font-medium">{therapist.name} :</span>
                            <span className="ml-2">{scheduleDate} à {scheduleTime}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : (
                  <>{date} à {time}</>
                )}
              </dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Type</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {isRecurring 
                  ? `Rendez-vous récurrent (${recurringCount} séances)`
                  : "Rendez-vous unique"
                }
              </dd>
            </div>
            
            {isRecurring && recurringDates && recurringDates.length > 0 && (
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Séances planifiées</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <ul className="border border-gray-200 rounded-md divide-y divide-gray-200">
                    {recurringDates.map((date, index) => (
                      <li key={index} className="pl-3 pr-4 py-3 flex items-center justify-between text-sm">
                        <div className="w-0 flex-1 flex items-center">
                          <span className="material-icons text-xs flex-shrink-0 text-gray-400">event</span>
                          <span className="ml-2 flex-1 w-0 truncate">{date}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>
      
      {/* Bouton de confirmation */}
      <div className="flex justify-end mt-6">
        <button
          type="button"
          className="inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          onClick={() => createAppointmentMutation.mutate()}
          disabled={createAppointmentMutation.isPending}
        >
          {createAppointmentMutation.isPending ? (
            <>
              <span className="animate-spin inline-block h-4 w-4 border-t-2 border-white rounded-full mr-2"></span>
              Création en cours...
            </>
          ) : isMultipleTherapists ? (
            <>Confirmer {selectedTherapists?.length} rendez-vous</>
          ) : (
            <>Confirmer le rendez-vous</>
          )}
        </button>
      </div>
    </div>
  );
}
