import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Patient, AppointmentWithDetails } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { HomeButton } from "@/components/ui/home-button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function PatientProfile() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("info");
  
  // Récupérer l'ID du patient depuis l'URL
  const currentPath = window.location.pathname;
  const patientId = parseInt(currentPath.split('/').pop() || '0', 10);
  
  // Requête pour récupérer les informations du patient
  const { data: patient, isLoading: isPatientLoading, error: patientError } = useQuery<Patient>({
    queryKey: [`/api/patients/${patientId}`],
    enabled: !!patientId,
  });
  
  // Requête pour récupérer les rendez-vous du patient
  const { data: appointments, isLoading: isAppointmentsLoading, error: appointmentsError } = useQuery<AppointmentWithDetails[]>({
    queryKey: [`/api/appointments/patient/${patientId}`],
    enabled: !!patientId,
  });
  
  // Fonction pour obtenir le style du badge de statut
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "confirmed":
      case "Confirmé":
        return "bg-green-100 text-green-800";
      case "pending":
      case "En attente":
        return "bg-green-100 text-green-800"; 
      case "cancelled":
      case "Annulé":
        return "bg-red-100 text-red-800";
      case "completed":
      case "Terminé":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  
  // Fonction pour formater le libellé du statut
  const getStatusLabel = (status: string) => {
    switch (status) {
      case "confirmed":
        return "Confirmé";
      case "pending":
        return "En attente";
      case "cancelled":
        return "Annulé";
      case "completed":
        return "Terminé";
      default:
        return status;
    }
  };
  
  // Afficher un chargement en cours
  if (isPatientLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col space-y-4">
          <Skeleton className="h-12 w-1/3" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    );
  }
  
  // Afficher un message d'erreur si nécessaire
  if (patientError) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                Une erreur s'est produite lors du chargement des informations du patient.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Si aucun patient n'est trouvé
  if (!patient) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Aucun patient trouvé avec cet identifiant.
              </p>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <Button onClick={() => setLocation("/")}>
            Retour à l'accueil
          </Button>
        </div>
      </div>
    );
  }
  
  // Affichage de la page principale
  return (
    <div className="bg-gray-100 min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-4">
            <HomeButton />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Profil Patient</h1>
              <p className="text-sm text-gray-500">
                Cabinet Paramédical de la Renaissance
              </p>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {patient.firstName} {patient.lastName}
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Dossier patient #{patient.id}
              </p>
            </div>
            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setLocation("/")}
              >
                Nouveau rendez-vous
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setLocation("/appointments")}
              >
                Liste des rendez-vous
              </Button>
            </div>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="px-4 sm:px-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="info">Informations</TabsTrigger>
                <TabsTrigger value="appointments">Rendez-vous</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="info" className="p-0">
              <div className="border-t border-gray-200">
                <dl>
                  <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Nom complet</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {patient.firstName} {patient.lastName}
                    </dd>
                  </div>
                  <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Email</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {patient.email || "-"}
                    </dd>
                  </div>
                  <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Téléphone</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {patient.phone || "-"}
                    </dd>
                  </div>
                  <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Date de naissance</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {patient.birthDate || "-"}
                    </dd>
                  </div>
                  <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Adresse</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {patient.address || "-"}
                    </dd>
                  </div>
                  <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Notes</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {patient.notes || "-"}
                    </dd>
                  </div>
                </dl>
              </div>
            </TabsContent>
            
            <TabsContent value="appointments" className="p-0">
              <div className="border-t border-gray-200 p-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-medium text-gray-900">Historique des rendez-vous</h4>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setLocation(`/${patient.id}`)}
                  >
                    Prendre un rendez-vous
                  </Button>
                </div>
                
                {isAppointmentsLoading ? (
                  <div className="space-y-4">
                    {Array(3).fill(0).map((_, idx) => (
                      <Skeleton key={idx} className="h-24 w-full" />
                    ))}
                  </div>
                ) : appointmentsError ? (
                  <div className="bg-red-50 border-l-4 border-red-400 p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-red-700">
                          Une erreur s'est produite lors du chargement des rendez-vous.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : appointments && appointments.length > 0 ? (
                  <div className="space-y-4">
                    {/* Trier les rendez-vous par date décroissante */}
                    {[...appointments]
                      .sort((a, b) => {
                        const dateA = new Date(`${a.date.split('/').reverse().join('-')}T${a.time}`);
                        const dateB = new Date(`${b.date.split('/').reverse().join('-')}T${b.time}`);
                        return dateB.getTime() - dateA.getTime();
                      })
                      .map(appointment => (
                        <Card key={appointment.id} className="overflow-hidden">
                          <CardHeader className="p-4 pb-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <CardTitle className="text-md">
                                  {appointment.date} à {appointment.time}
                                </CardTitle>
                                <CardDescription>
                                  Thérapeute: {appointment.therapistName}
                                </CardDescription>
                              </div>
                              <Badge className={getStatusBadgeClass(appointment.status)}>
                                {getStatusLabel(appointment.status)}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="p-4 pt-2">
                            {appointment.notes && (
                              <p className="text-sm text-gray-500 mb-2">{appointment.notes}</p>
                            )}
                            {appointment.type && (
                              <p className="text-xs text-gray-600">Type: {appointment.type}</p>
                            )}
                            {appointment.isRecurring && (
                              <Badge variant="outline" className="mt-2">
                                Rendez-vous récurrent
                              </Badge>
                            )}
                          </CardContent>
                          <CardFooter className="bg-gray-50 p-4 flex justify-end space-x-2">
                            <Link href={`/appointments/${appointment.id}`}>
                              <Button variant="outline" size="sm">
                                Détails
                              </Button>
                            </Link>
                          </CardFooter>
                        </Card>
                      ))
                    }
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun rendez-vous</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Ce patient n'a pas encore de rendez-vous programmés.
                    </p>
                    <div className="mt-6">
                      <Button onClick={() => setLocation("/")}>
                        Programmer un rendez-vous
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}