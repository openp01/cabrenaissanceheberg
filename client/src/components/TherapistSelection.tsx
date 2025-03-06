import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Therapist, BookingFormData } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

interface TherapistSelectionProps {
  formData: BookingFormData;
  updateFormData: (data: Partial<BookingFormData>) => void;
}

export default function TherapistSelection({ formData, updateFormData }: TherapistSelectionProps) {
  const { data: therapists, isLoading, error } = useQuery<Therapist[]>({
    queryKey: ['/api/therapists'],
  });

  const handleSelectTherapist = (therapist: Therapist) => {
    updateFormData({ therapist });
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Choisir un thérapeute</h3>
      <p className="text-sm text-gray-500 mb-6">Sélectionnez le thérapeute avec lequel vous souhaitez prendre rendez-vous</p>
      
      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array(3).fill(0).map((_, index) => (
            <Skeleton key={index} className="h-52 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-50 p-4 rounded-md text-red-700">
          Erreur lors du chargement des thérapeutes. Veuillez réessayer plus tard.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {therapists?.map((therapist) => (
            <div 
              key={therapist.id}
              className={`bg-white overflow-hidden shadow rounded-lg border hover:shadow-md transition-all cursor-pointer ${
                formData.therapist?.id === therapist.id ? 'border-primary' : 'border-gray-200'
              }`}
              onClick={() => handleSelectTherapist(therapist)}
            >
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center">
                  <div className={`flex-shrink-0 rounded-full p-3 ${
                    therapist.id === 1 ? 'bg-primary' : 
                    therapist.id === 2 ? 'bg-blue-400' : 'bg-purple-500'
                  }`}>
                    <span className="material-icons text-white">person</span>
                  </div>
                  <div className="ml-5">
                    <h4 className="text-lg font-medium text-gray-900">{therapist.name}</h4>
                    <p className="text-sm text-gray-500">Spécialité: {therapist.specialty}</p>
                  </div>
                </div>
                <div className="mt-4 text-sm text-gray-500">
                  <p>Disponible: {therapist.availableDays}</p>
                  <p>Horaires: {therapist.workHours}</p>
                </div>
                <div className="mt-5">
                  <button 
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Sélectionner
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
