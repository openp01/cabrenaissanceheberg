import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { AppointmentWithDetails } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { HomeButton } from "@/components/ui/home-button";
import { Checkbox } from "@/components/ui/checkbox";

export default function AppointmentList() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedAppointments, setSelectedAppointments] = useState<number[]>([]);
  const [selectMode, setSelectMode] = useState<boolean>(false);

  // Fetch appointments
  const { data: appointments, isLoading, error } = useQuery<AppointmentWithDetails[]>({
    queryKey: ['/api/appointments'],
  });

  // Delete single appointment mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/appointments/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      toast({
        title: "Rendez-vous annulé",
        description: "Le rendez-vous a été annulé avec succès.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible d'annuler le rendez-vous. Veuillez réessayer plus tard.",
        variant: "destructive",
      });
    },
  });

  // Delete multiple appointments mutation
  const deleteMultipleMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await apiRequest('/api/appointments', "DELETE", { ids });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      toast({
        title: "Rendez-vous annulés",
        description: `${selectedAppointments.length} rendez-vous ont été annulés avec succès.`,
      });
      setSelectedAppointments([]);
      setSelectMode(false);
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible d'annuler les rendez-vous sélectionnés. Veuillez réessayer plus tard.",
        variant: "destructive",
      });
    },
  });

  const handleNewAppointment = () => {
    setLocation("/");
  };
  
  const handleViewSchedule = () => {
    setLocation("/schedule");
  };

  const handleCancelAppointment = (id: number) => {
    if (confirm("Êtes-vous sûr de vouloir annuler ce rendez-vous ?")) {
      deleteMutation.mutate(id);
    }
  };

  const toggleAppointmentSelection = (id: number) => {
    if (selectedAppointments.includes(id)) {
      setSelectedAppointments(selectedAppointments.filter(appointmentId => appointmentId !== id));
    } else {
      setSelectedAppointments([...selectedAppointments, id]);
    }
  };

  const toggleSelectMode = () => {
    setSelectMode(!selectMode);
    if (selectMode) {
      // Si on quitte le mode sélection, on efface les sélections
      setSelectedAppointments([]);
    }
  };

  const selectAllAppointments = () => {
    if (appointments && appointments.length > 0) {
      if (selectedAppointments.length === appointments.length) {
        // Si tous sont déjà sélectionnés, désélectionner tout
        setSelectedAppointments([]);
      } else {
        // Sinon, sélectionner tous
        setSelectedAppointments(appointments.map(a => a.id));
      }
    }
  };

  const handleDeleteSelected = () => {
    if (selectedAppointments.length === 0) {
      toast({
        title: "Attention",
        description: "Veuillez sélectionner au moins un rendez-vous à annuler.",
        variant: "destructive",
      });
      return;
    }

    if (confirm(`Êtes-vous sûr de vouloir annuler ${selectedAppointments.length} rendez-vous ?`)) {
      deleteMultipleMutation.mutate(selectedAppointments);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "confirmed":
        return "Confirmé";
      case "pending":
        return "En attente";
      case "cancelled":
        return "Annulé";
      default:
        return status;
    }
  };

  return (
    <>
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <HomeButton />
              <h1 className="text-2xl font-bold text-gray-900">Centre d'Orthophonie</h1>
            </div>
            <div className="flex space-x-2">
              <button 
                onClick={handleViewSchedule}
                className="inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <span className="material-icons mr-2 text-sm">schedule</span>
                Emploi du temps
              </button>
              <button 
                onClick={handleNewAppointment}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <span className="material-icons mr-2 text-sm">add</span>
                Nouveau rendez-vous
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900">Mes rendez-vous</h2>
                <div className="flex space-x-2">
                  {selectMode && selectedAppointments.length > 0 && (
                    <button 
                      onClick={handleDeleteSelected}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      disabled={deleteMultipleMutation.isPending}
                    >
                      <span className="material-icons mr-2 text-sm">delete</span>
                      Annuler ({selectedAppointments.length})
                    </button>
                  )}
                  <button 
                    onClick={toggleSelectMode}
                    className={`inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      selectMode 
                        ? "border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-gray-500" 
                        : "border-indigo-300 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 focus:ring-indigo-500"
                    }`}
                  >
                    <span className="material-icons mr-2 text-sm">{selectMode ? "cancel" : "checklist"}</span>
                    {selectMode ? "Annuler la sélection" : "Mode sélection"}
                  </button>
                  <button 
                    onClick={handleNewAppointment}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <span className="material-icons mr-2 text-sm">add</span>
                    Nouveau rendez-vous
                  </button>
                </div>
              </div>
            </div>
            
            <div className="px-4 py-6 sm:px-6">
              {isLoading ? (
                <div className="space-y-4">
                  {Array(3).fill(0).map((_, idx) => (
                    <div key={idx} className="flex flex-col space-y-2">
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="p-4 bg-red-50 text-red-700 rounded-md">
                  Erreur lors du chargement des rendez-vous. Veuillez réessayer plus tard.
                </div>
              ) : appointments && appointments.length > 0 ? (
                <div className="flex flex-col">
                  <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                      <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              {selectMode && (
                                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  <div className="flex items-center">
                                    <Checkbox 
                                      id="select-all" 
                                      checked={selectedAppointments.length > 0 && selectedAppointments.length === appointments.length}
                                      onCheckedChange={selectAllAppointments} 
                                      className="cursor-pointer" 
                                    />
                                  </div>
                                </th>
                              )}
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Patient
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Thérapeute
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Date
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Heure
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Statut
                              </th>
                              <th scope="col" className="relative px-6 py-3">
                                <span className="sr-only">Actions</span>
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {appointments
                              .sort((a, b) => {
                                // Trier par date de création, du plus récent au plus ancien
                                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                              })
                              .map((appointment) => (
                              <tr key={appointment.id} className={selectedAppointments.includes(appointment.id) ? "bg-indigo-50" : ""}>
                                {selectMode && (
                                  <td className="px-3 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                      <Checkbox 
                                        id={`select-appointment-${appointment.id}`} 
                                        checked={selectedAppointments.includes(appointment.id)} 
                                        onCheckedChange={() => toggleAppointmentSelection(appointment.id)}
                                        className="cursor-pointer"
                                      />
                                    </div>
                                  </td>
                                )}
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                                      {appointment.patientName.split(" ").map(n => n[0]).join("").toUpperCase()}
                                    </div>
                                    <div className="ml-3">
                                      <div className="text-sm font-medium text-gray-900">{appointment.patientName}</div>
                                      {/* Future feature: Show additional patient info */}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div className="w-2 h-2 rounded-full bg-primary mr-2"></div>
                                    <div className="text-sm font-medium text-gray-900">{appointment.therapistName}</div>
                                    {/* Future feature: Show related appointments indicator */}
                                  </div>
                                  {appointment.notes && (
                                    <div className="text-xs text-gray-500 mt-1 italic">{appointment.notes}</div>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <span className="material-icons text-blue-500 mr-1 text-sm">event</span>
                                    <div className="text-sm text-gray-900">{appointment.date}</div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <span className="material-icons text-green-500 mr-1 text-sm">schedule</span>
                                    <div className="text-sm text-gray-900">{appointment.time}</div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(appointment.status)}`}>
                                    {getStatusLabel(appointment.status)}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  {selectMode ? (
                                    <button 
                                      onClick={() => toggleAppointmentSelection(appointment.id)}
                                      className={`text-sm font-medium ${selectedAppointments.includes(appointment.id) ? "text-indigo-600 hover:text-indigo-900" : "text-gray-600 hover:text-gray-900"}`}
                                    >
                                      {selectedAppointments.includes(appointment.id) ? "Désélectionner" : "Sélectionner"}
                                    </button>
                                  ) : (
                                    <button 
                                      onClick={() => handleCancelAppointment(appointment.id)}
                                      className="text-red-600 hover:text-red-900 ml-3"
                                      disabled={deleteMutation.isPending}
                                    >
                                      Annuler
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">Aucun rendez-vous trouvé</p>
                  <Button onClick={handleNewAppointment} className="bg-primary">
                    <span className="material-icons mr-2 text-sm">add</span>
                    Prendre un rendez-vous
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
