import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { BookingFormData } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface AppointmentConfirmationProps {
  formData: BookingFormData;
}

export default function AppointmentConfirmation({ formData }: AppointmentConfirmationProps) {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  
  const { patient, therapist, date, time, isRecurring, recurringFrequency, recurringCount, recurringDates } = formData;
  
  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: async () => {
      if (!patient || !therapist || !date || !time) {
        throw new Error("Informations manquantes pour créer le rendez-vous");
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
      
      const response = await apiRequest("POST", "/api/appointments", appointmentData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Rendez-vous confirmé",
        description: "Votre rendez-vous a été créé avec succès",
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
  
  if (!patient || !therapist || !date || !time) {
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
              Vous êtes sur le point de confirmer votre rendez-vous.
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
              <dt className="text-sm font-medium text-gray-500">Thérapeute</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{therapist.name}</dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Date et heure</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{date} à {time}</dd>
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
    </div>
  );
}
