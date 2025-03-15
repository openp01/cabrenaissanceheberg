import { useState, useEffect, useMemo } from "react";
import React from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { AppointmentWithDetails, Therapist } from "@shared/schema";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { HomeButton } from "@/components/ui/home-button";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  addWeeks, 
  subWeeks,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  isSameDay,
  parse,
  addDays,
} from "date-fns";
import { fr } from "date-fns/locale";
import { useAuth, useIsAdmin, useIsAdminStaff, useIsTherapist } from "@/hooks/use-auth";
import ErrorMessage from "@/components/ErrorMessages";
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

/**
 * Interface pour les propriétés du composant d'événement draggable
 */
interface DraggableAppointmentProps {
  appointment: AppointmentWithDetails;
  onStatusChange: (id: number, status: string) => void;
  onCancelAppointment: (id: number) => void;
  onEditAppointment: (id: number) => void;
  className?: string;
}

/**
 * Interface pour l'emplacement cible d'un rendez-vous
 */
interface DropTarget {
  date: string;
  time: string;
  therapistId: number;
}

/**
 * Page principale Planning qui combine la vue calendrier et la vue liste
 */
export default function Planning() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdminOrStaff = useIsAdminStaff();
  const isTherapistUser = useIsTherapist();
  
  // États pour la vue calendrier
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [calendarView, setCalendarView] = useState<"week" | "month">("week");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [weekDates, setWeekDates] = useState<Date[]>([]);
  const [monthDates, setMonthDates] = useState<Date[]>([]);
  const [selectedTherapist, setSelectedTherapist] = useState<number | null>(null);
  
  // États pour la vue liste
  const [selectedAppointments, setSelectedAppointments] = useState<number[]>([]);
  const [selectMode, setSelectMode] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [expandedAppointments, setExpandedAppointments] = useState<string[]>([]);
  
  // Créneaux horaires pour la vue semaine
  const timeSlots = [
    "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
    "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00"
  ];
  
  // Jours de la semaine pour l'affichage
  const weekDaysFull = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

  // Fetch therapists
  const { data: therapists, isLoading: isLoadingTherapists } = useQuery<Therapist[]>({
    queryKey: ['/api/therapists'],
  });

  // Fetch appointments
  const { data: appointments, isLoading: isLoadingAppointments } = useQuery<AppointmentWithDetails[]>({
    queryKey: ['/api/appointments'],
  });

  // Mutation pour la suppression d'un rendez-vous
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/appointments/${id}`, "DELETE");
    },
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Le rendez-vous a été annulé avec succès.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: `Une erreur est survenue: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Mutation pour la suppression multiple de rendez-vous
  const deleteMultipleMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const promises = ids.map(id => 
        apiRequest(`/api/appointments/${id}`, "DELETE")
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Les rendez-vous sélectionnés ont été annulés avec succès.",
        variant: "default",
      });
      setSelectedAppointments([]);
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: `Une erreur est survenue: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Mutation pour la mise à jour du statut d'un rendez-vous
  const statusChangeMutation = useMutation({
    mutationFn: async ({ appointmentId, status }: { appointmentId: number, status: string }) => {
      return await apiRequest(`/api/appointments/${appointmentId}`, "PUT", { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
    },
    onError: (error) => {
      console.error("Erreur lors de la mise à jour du statut", error);
    }
  });

  // Mutation pour le déplacement d'un rendez-vous (drag-and-drop)
  const moveAppointmentMutation = useMutation({
    mutationFn: async ({ appointmentId, date, time, therapistId }: { 
      appointmentId: number, 
      date: string, 
      time: string,
      therapistId: number
    }) => {
      return await apiRequest(`/api/appointments/${appointmentId}`, "PUT", { 
        date, 
        time,
        therapistId
      });
    },
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Le rendez-vous a été déplacé avec succès.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: `Une erreur est survenue: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  useEffect(() => {
    // Set default therapist if available
    if (therapists && therapists.length > 0 && !selectedTherapist) {
      setSelectedTherapist(therapists[0].id);
    }
  }, [therapists]);

  useEffect(() => {
    // Mettre à jour les dates de la semaine
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });
    setWeekDates(days);

    // Mettre à jour les dates du mois
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    let firstDay = startOfWeek(monthStart, { weekStartsOn: 1 });
    
    // Si le premier jour du mois est déjà un lundi, on prend la semaine précédente pour avoir un calendrier plus complet
    if (firstDay.getTime() === monthStart.getTime()) {
      firstDay = addDays(firstDay, -7);
    }
    
    // On s'assure d'avoir 6 semaines pour un affichage uniforme
    const lastDay = addDays(endOfWeek(monthEnd, { weekStartsOn: 1 }), 7);
    const monthDays = eachDayOfInterval({ start: firstDay, end: lastDay });
    setMonthDates(monthDays);
  }, [currentDate]);

  // Vérifier et mettre à jour automatiquement les statuts des rendez-vous passés
  useEffect(() => {
    if (appointments) {
      const now = new Date();
      const appointmentsToUpdate = appointments.filter(appointment => {
        // Vérifie si le rendez-vous est "En attente" et si sa date/heure est déjà passée
        if (appointment.status !== "pending") return false;
        
        const appointmentDateTime = new Date(`${appointment.date}T${appointment.time}`);
        return appointmentDateTime < now;
      });
      
      // Mise à jour automatique des statuts pour les rendez-vous passés
      appointmentsToUpdate.forEach(appointment => {
        statusChangeMutation.mutate({ 
          appointmentId: appointment.id, 
          status: "completed"
        });
      });
    }
  }, [appointments]);

  // Navigation dans le calendrier
  const handlePrevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const handleNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  
  // Changer le mode d'affichage du calendrier
  const handleViewModeChange = (mode: "week" | "month") => {
    setCalendarView(mode);
  };

  // Changer de thérapeute sélectionné
  const handleTherapistChange = (value: string) => {
    setSelectedTherapist(parseInt(value, 10));
  };

  // Vérifier si un créneau horaire a un rendez-vous
  const isAppointmentScheduled = (date: Date, time: string, therapistId: number) => {
    if (!appointments) return false;
    
    return appointments.some(app => {
      if (app.therapistId !== therapistId) return false;
      
      const appDate = parse(app.date, 'dd/MM/yyyy', new Date());
      return app.time === time && isSameDay(appDate, date);
    });
  };

  // Récupérer les détails d'un rendez-vous pour un créneau
  const getAppointmentDetails = (date: Date, time: string, therapistId: number) => {
    if (!appointments) return null;
    
    return appointments.find(app => {
      if (app.therapistId !== therapistId) return false;
      
      const appDate = parse(app.date, 'dd/MM/yyyy', new Date());
      return app.time === time && isSameDay(appDate, date);
    });
  };

  // Fonctions pour la vue liste
  const toggleSelectMode = () => {
    setSelectMode(!selectMode);
    if (selectMode) {
      setSelectedAppointments([]);
    }
  };

  const toggleAppointmentSelection = (id: number) => {
    if (selectedAppointments.includes(id)) {
      setSelectedAppointments(selectedAppointments.filter(appointmentId => appointmentId !== id));
    } else {
      setSelectedAppointments([...selectedAppointments, id]);
    }
  };

  const selectAllAppointments = (checked: boolean | string) => {
    if (checked === true && appointments) {
      setSelectedAppointments(appointments.map(appointment => appointment.id));
    } else {
      setSelectedAppointments([]);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedAppointments.length === 0) return;
    
    if (confirm(`Êtes-vous sûr de vouloir annuler les ${selectedAppointments.length} rendez-vous sélectionnés ?`)) {
      deleteMultipleMutation.mutate(selectedAppointments);
    }
  };

  // Fonction pour gérer le changement de statut d'un rendez-vous
  const handleStatusChange = (id: number, status: string) => {
    // Récupère l'appointment concerné
    const appointment = appointments?.find(a => a.id === id);
    if (!appointment) return;
    
    // Vérifier si le rendez-vous est lié à une récurrence
    const isRecurringChild = appointment.parentAppointmentId !== null;
    const isRecurringParent = appointment.isRecurring === true && appointment.relatedAppointments && appointment.relatedAppointments.length > 0;
    
    // Procéder avec la mise à jour du statut
    updateStatus(id, status, isRecurringParent, isRecurringChild, appointment.parentAppointmentId);
  };

  // Fonction pour mettre à jour le statut (avec gestion des récurrences)
  const updateStatus = (id: number, status: string, isRecurringParent: boolean, isRecurringChild: boolean, parentId: number | null) => {
    if (isRecurringParent && status === "cancelled") {
      const confirmAction = confirm("Voulez-vous annuler uniquement ce rendez-vous ou toute la série ?");
      
      if (confirmAction) {
        // Annuler toute la série
        cancelRecurringSeries(id);
      } else {
        // Annuler uniquement ce rendez-vous
        statusChangeMutation.mutate({ appointmentId: id, status });
      }
    } 
    else if (isRecurringChild && status === "cancelled") {
      const confirmAction = confirm("Voulez-vous annuler uniquement ce rendez-vous ou toute la série à partir de cette date ?");
      
      if (confirmAction && parentId) {
        // Annuler la série à partir de cette date
        cancelSeriesFromDate(id, parentId);
      } else {
        // Annuler uniquement ce rendez-vous
        statusChangeMutation.mutate({ appointmentId: id, status });
      }
    } 
    else {
      // Mise à jour standard pour les autres cas
      statusChangeMutation.mutate({ appointmentId: id, status });
    }
  };

  // Fonction pour annuler une série récurrente
  const cancelRecurringSeries = (parentId: number) => {
    if (!appointments) return;
    
    // Trouver tous les rendez-vous de la série
    const seriesAppointments = appointments.filter(a => 
      a.id === parentId || a.parentAppointmentId === parentId
    );
    
    // Annuler tous les rendez-vous de la série
    const appointmentIds = seriesAppointments.map(a => a.id);
    deleteMultipleMutation.mutate(appointmentIds);
  };

  // Fonction pour annuler une série à partir d'une date
  const cancelSeriesFromDate = (currentId: number, parentId: number) => {
    if (!appointments) return;
    
    // Trouver le rendez-vous actuel
    const currentAppointment = appointments.find(a => a.id === currentId);
    if (!currentAppointment) return;
    
    // Convertir la date du rendez-vous actuel
    const currentDate = parse(currentAppointment.date, 'dd/MM/yyyy', new Date());
    
    // Trouver tous les rendez-vous de la série à partir de cette date
    const appointmentsToCancel = appointments.filter(a => {
      if (a.parentAppointmentId !== parentId && a.id !== parentId) return false;
      
      const appDate = parse(a.date, 'dd/MM/yyyy', new Date());
      return appDate >= currentDate;
    });
    
    // Annuler tous les rendez-vous trouvés
    const appointmentIds = appointmentsToCancel.map(a => a.id);
    deleteMultipleMutation.mutate(appointmentIds);
  };

  // Navigation
  const handleNewAppointment = (date?: Date, therapistId?: number) => {
    if (date && therapistId) {
      const formattedDate = format(date, 'dd/MM/yyyy');
      setLocation(`/booking?date=${formattedDate}&therapistId=${therapistId}`);
    } else {
      setLocation("/booking");
    }
  };

  const handleEditAppointment = (id: number) => {
    setLocation(`/appointments/${id}/edit`);
  };

  const handleCancelAppointment = (id: number) => {
    if (confirm("Êtes-vous sûr de vouloir annuler ce rendez-vous ?")) {
      deleteMutation.mutate(id);
    }
  };

  // Function to handle appointment dragging
  const handleMoveAppointment = (appointment: AppointmentWithDetails, target: DropTarget) => {
    // Check if the appointment can be moved (not cancelled, etc.)
    if (appointment.status === "cancelled") {
      toast({
        title: "Action non autorisée",
        description: "Impossible de déplacer un rendez-vous annulé.",
        variant: "destructive",
      });
      return;
    }
    
    // Check if the target slot is available
    const isTargetSlotTaken = appointments?.some(app => 
      app.therapistId === target.therapistId && 
      app.date === target.date && 
      app.time === target.time && 
      app.id !== appointment.id
    );
    
    if (isTargetSlotTaken) {
      toast({
        title: "Conflit d'horaire",
        description: "Ce créneau horaire est déjà occupé par un autre rendez-vous.",
        variant: "destructive",
      });
      return;
    }
    
    // Move the appointment
    moveAppointmentMutation.mutate({
      appointmentId: appointment.id,
      date: target.date,
      time: target.time,
      therapistId: target.therapistId
    });
  };

  // Fonctions pour obtenir les libellés et classes CSS
  const getStatusClass = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "completed":
        return "bg-green-100 text-green-800";
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
      case "completed":
        return "Terminé";
      default:
        return status;
    }
  };
  
  // Fonction pour déterminer le type de rendez-vous
  const getAppointmentType = (appointment: AppointmentWithDetails) => {
    if (appointment.isRecurring === true) {
      return "recurring";
    } else if (appointment.relatedAppointments && appointment.relatedAppointments.length > 0) {
      return "multiple";
    } else {
      return "single";
    }
  };
  
  // Fonction pour obtenir le libellé du type de rendez-vous
  const getAppointmentTypeLabel = (type: string) => {
    switch (type) {
      case "recurring":
        return "Récurrent";
      case "multiple":
        return "Multiple";
      case "single":
        return "Ponctuel";
      default:
        return type;
    }
  };
  
  // Grouper les rendez-vous récurrents pour la vue liste
  const groupedAppointments = useMemo(() => {
    if (!appointments) return [];
    
    // Créer une map des parents et leurs enfants
    const parentMap = new Map<number, AppointmentWithDetails[]>();
    
    // Collecter tous les rendez-vous qui ont un parentAppointmentId
    appointments.forEach(appointment => {
      if (appointment.parentAppointmentId) {
        const parentId = appointment.parentAppointmentId;
        if (!parentMap.has(parentId)) {
          parentMap.set(parentId, []);
        }
        parentMap.get(parentId)?.push(appointment);
      }
    });
    
    // Filtrer les rendez-vous pour garder uniquement les parents ou les rendez-vous sans parent
    return appointments.filter(appointment => {
      // Si c'est un parent de rendez-vous récurrents
      if (appointment.isRecurring === true && parentMap.has(appointment.id)) {
        // Ajouter les rendez-vous enfants comme propriété
        appointment.relatedAppointments = parentMap.get(appointment.id)?.map(child => ({
          id: child.id,
          therapistName: child.therapistName,
          date: child.date,
          time: child.time,
          status: child.status
        }));
        return true;
      }
      
      // Si ce n'est pas un enfant d'un rendez-vous récurrent, on le garde
      return !appointment.parentAppointmentId;
    });
  }, [appointments]);
  
  // Trier les rendez-vous selon les critères choisis
  const sortAppointments = (appointments: AppointmentWithDetails[]) => {
    return [...appointments].sort((a, b) => {
      if (sortBy === "date") {
        // Tri par date puis par heure
        const dateA = parse(a.date, 'dd/MM/yyyy', new Date());
        const dateB = parse(b.date, 'dd/MM/yyyy', new Date());
        const timeA = a.time;
        const timeB = b.time;
        
        if (dateA.getTime() !== dateB.getTime()) {
          return sortOrder === "asc" 
            ? dateA.getTime() - dateB.getTime() 
            : dateB.getTime() - dateA.getTime();
        }
        
        return sortOrder === "asc" 
          ? timeA.localeCompare(timeB) 
          : timeB.localeCompare(timeA);
      } 
      else if (sortBy === "therapist") {
        // Tri par thérapeute puis par date
        const therapistA = a.therapistName;
        const therapistB = b.therapistName;
        
        if (therapistA !== therapistB) {
          return sortOrder === "asc" 
            ? therapistA.localeCompare(therapistB) 
            : therapistB.localeCompare(therapistA);
        }
        
        const dateA = parse(a.date, 'dd/MM/yyyy', new Date());
        const dateB = parse(b.date, 'dd/MM/yyyy', new Date());
        return sortOrder === "asc" 
          ? dateA.getTime() - dateB.getTime() 
          : dateB.getTime() - dateA.getTime();
      } 
      else if (sortBy === "type") {
        // Tri par type puis par date
        const typeA = getAppointmentType(a);
        const typeB = getAppointmentType(b);
        
        if (typeA !== typeB) {
          return sortOrder === "asc" 
            ? typeA.localeCompare(typeB) 
            : typeB.localeCompare(typeA);
        }
        
        const dateA = parse(a.date, 'dd/MM/yyyy', new Date());
        const dateB = parse(b.date, 'dd/MM/yyyy', new Date());
        return sortOrder === "asc" 
          ? dateA.getTime() - dateB.getTime() 
          : dateB.getTime() - dateA.getTime();
      }
      
      return 0;
    });
  };
  
  // Composant pour les rendez-vous dans la vue calendrier
  const CalendarAppointment: React.FC<DraggableAppointmentProps> = ({ 
    appointment, 
    onStatusChange,
    onCancelAppointment,
    onEditAppointment,
    className 
  }) => {
    return (
      <div className={`bg-primary text-white p-1 rounded text-center overflow-hidden ${className}`}>
        <div className="flex items-center justify-between">
          <span className="font-medium truncate">{appointment.patientName}</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-5 w-5 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30">
                <span className="material-icons text-xs">more_vert</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {appointment.status !== "completed" && (
                <DropdownMenuItem 
                  onClick={() => onStatusChange(appointment.id, "completed")}
                >
                  <span className="material-icons mr-2 text-sm text-green-500">check_circle</span>
                  Marquer comme terminé
                </DropdownMenuItem>
              )}
              {appointment.status !== "cancelled" && (
                <DropdownMenuItem 
                  onClick={() => onCancelAppointment(appointment.id)}
                >
                  <span className="material-icons mr-2 text-sm text-red-500">cancel</span>
                  Annuler
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                onClick={() => onEditAppointment(appointment.id)}
              >
                <span className="material-icons mr-2 text-sm text-blue-500">edit</span>
                Modifier
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {appointment.notes && (
          <div className="text-xs opacity-80 truncate">{appointment.notes}</div>
        )}
      </div>
    );
  };

  return (
    <DndProvider backend={HTML5Backend}>
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <HomeButton />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Cabinet Paramédical de la Renaissance</h1>
                {isTherapistUser && (
                  <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">
                    Vue Thérapeute
                  </span>
                )}
                {isAdminOrStaff && (
                  <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                    {user?.role === 'admin' ? 'Administrateur' : 'Secrétariat'}
                  </span>
                )}
              </div>
            </div>
            <div className="flex space-x-2">
              <Button 
                onClick={() => handleNewAppointment()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <span className="material-icons mr-2 text-sm">add</span>
                Nouveau rendez-vous
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {/* En-tête avec options */}
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <div className="flex flex-wrap justify-between items-center">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">Planning des rendez-vous</h2>
                  <p className="mt-1 text-sm text-gray-600">
                    Organisez et gérez tous vos rendez-vous
                  </p>
                </div>
                
                {/* Boutons de vue */}
                <div className="flex space-x-2 mt-2 sm:mt-0">
                  <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "calendar" | "list")}>
                    <TabsList className="grid grid-cols-2 w-[200px]">
                      <TabsTrigger value="calendar" className="flex items-center">
                        <span className="material-icons mr-2 text-sm">calendar_month</span>
                        Calendrier
                      </TabsTrigger>
                      <TabsTrigger value="list" className="flex items-center">
                        <span className="material-icons mr-2 text-sm">format_list_bulleted</span>
                        Liste
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>
            </div>
            
            {/* Contenu principal */}
            <div className="px-4 py-5 sm:p-6">
              {viewMode === "calendar" ? (
                <div>
                  {/* Sélecteur de thérapeute pour la vue calendrier */}
                  <div className="flex flex-wrap justify-between items-center mb-6">
                    <div className="w-64 mt-2 sm:mt-0">
                      {isLoadingTherapists ? (
                        <Skeleton className="h-10 w-full" />
                      ) : (
                        <Select
                          value={selectedTherapist?.toString() || ""}
                          onValueChange={handleTherapistChange}
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
                      )}
                    </div>
                    
                    {/* Sélecteur de vue (semaine/mois) */}
                    <Tabs value={calendarView} onValueChange={(value) => handleViewModeChange(value as "week" | "month")}>
                      <TabsList className="grid grid-cols-2 w-[200px]">
                        <TabsTrigger value="week" className="flex items-center">
                          <span className="material-icons mr-2 text-sm">view_week</span>
                          Semaine
                        </TabsTrigger>
                        <TabsTrigger value="month" className="flex items-center">
                          <span className="material-icons mr-2 text-sm">calendar_month</span>
                          Mois
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                  
                  {/* Vue semaine */}
                  {calendarView === "week" && (
                    <div>
                      {/* Navigation - Semaine */}
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h4 className="text-lg font-medium text-gray-900">
                            Semaine du {format(weekDates[0] || new Date(), 'dd MMMM', { locale: fr })}
                            {' au '}
                            {format(weekDates[6] || new Date(), 'dd MMMM yyyy', { locale: fr })}
                          </h4>
                        </div>
                        <div className="flex space-x-2">
                          <button 
                            className="p-2 rounded-full hover:bg-gray-100" 
                            onClick={handlePrevWeek}
                          >
                            <span className="material-icons">chevron_left</span>
                          </button>
                          <Button 
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentDate(new Date())}
                            className="mx-1"
                          >
                            Aujourd'hui
                          </Button>
                          <button 
                            className="p-2 rounded-full hover:bg-gray-100"
                            onClick={handleNextWeek}
                          >
                            <span className="material-icons">chevron_right</span>
                          </button>
                        </div>
                      </div>
                      
                      {/* Calendrier hebdomadaire */}
                      {isLoadingAppointments ? (
                        <div className="space-y-4">
                          <Skeleton className="h-[600px] w-full" />
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Heures
                                </th>
                                {weekDates.map((date, index) => (
                                  <th 
                                    key={index} 
                                    scope="col" 
                                    className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                                    style={{ minWidth: '100px' }}
                                  >
                                    <div>{weekDaysFull[index]}</div>
                                    <div className="text-sm mt-1">{format(date, 'dd/MM', { locale: fr })}</div>
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {timeSlots.map((time, timeIndex) => (
                                <tr key={timeIndex} className={timeIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                  <td className="px-6 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {time}
                                  </td>
                                  {weekDates.map((date, dateIndex) => {
                                    const isScheduled = selectedTherapist ? 
                                      isAppointmentScheduled(date, time, selectedTherapist) : false;
                                    const appointment = selectedTherapist ? 
                                      getAppointmentDetails(date, time, selectedTherapist) : null;
                                    
                                    return (
                                      <td 
                                        key={dateIndex} 
                                        className="px-2 py-2 whitespace-nowrap text-xs border-l"
                                      >
                                        {isScheduled && appointment ? (
                                          <CalendarAppointment 
                                            appointment={appointment}
                                            onStatusChange={handleStatusChange}
                                            onCancelAppointment={handleCancelAppointment}
                                            onEditAppointment={handleEditAppointment}
                                            className={appointment.status === "cancelled" ? "opacity-50" : ""}
                                          />
                                        ) : (
                                          <div 
                                            className="h-6 w-full cursor-pointer hover:bg-gray-100 rounded"
                                            onClick={() => {
                                              // Ouvrir le formulaire de création directement avec des valeurs pré-remplies
                                              const formattedDate = format(date, 'dd/MM/yyyy');
                                              // Nous n'avons pas de route /booking, utilisons notre nouveau planning
                                              handleNewAppointment();
                                            }}
                                          ></div>
                                        )}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Vue mois */}
                  {calendarView === "month" && (
                    <div>
                      {/* Navigation - Mois */}
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h4 className="text-lg font-medium text-gray-900">
                            {format(currentDate, 'MMMM yyyy', { locale: fr }).charAt(0).toUpperCase() + 
                            format(currentDate, 'MMMM yyyy', { locale: fr }).slice(1)}
                          </h4>
                        </div>
                        <div className="flex space-x-2">
                          <button 
                            className="p-2 rounded-full hover:bg-gray-100" 
                            onClick={handlePrevMonth}
                          >
                            <span className="material-icons">chevron_left</span>
                          </button>
                          <Button 
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentDate(new Date())}
                            className="mx-1"
                          >
                            Aujourd'hui
                          </Button>
                          <button 
                            className="p-2 rounded-full hover:bg-gray-100"
                            onClick={handleNextMonth}
                          >
                            <span className="material-icons">chevron_right</span>
                          </button>
                        </div>
                      </div>
                      
                      {/* Calendrier mensuel */}
                      {isLoadingAppointments ? (
                        <div className="space-y-4">
                          <Skeleton className="h-[600px] w-full" />
                        </div>
                      ) : (
                        <div className="overflow-hidden">
                          <div className="grid grid-cols-7 gap-px bg-gray-200">
                            {/* En-têtes des jours de la semaine */}
                            {weekDaysFull.map((day, i) => (
                              <div key={i} className="bg-gray-50 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                                {day.substring(0, 3)}
                              </div>
                            ))}
                            
                            {/* Cases du calendrier */}
                            {Array.from({ length: Math.ceil(monthDates.length / 7) }).map((_, weekIndex) => (
                              monthDates.slice(weekIndex * 7, weekIndex * 7 + 7).map((date, dayIndex) => {
                                const currentMonth = date.getMonth() === currentDate.getMonth();
                                const dayAppointments = appointments?.filter(app => {
                                  if (!selectedTherapist) return false;
                                  const appDate = parse(app.date, 'dd/MM/yyyy', new Date());
                                  return app.therapistId === selectedTherapist && 
                                         isSameDay(appDate, date);
                                });
                                
                                return (
                                  <div 
                                    key={`${weekIndex}-${dayIndex}`} 
                                    className={`bg-white h-28 p-1 overflow-hidden ${
                                      currentMonth ? 'text-gray-900' : 'text-gray-400 bg-gray-50'
                                    }`}
                                  >
                                    <div className="flex justify-between items-start">
                                      <span className="text-sm font-medium">
                                        {format(date, 'd')}
                                      </span>
                                      {isSameDay(date, new Date()) && (
                                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white text-xs">
                                          Auj.
                                        </span>
                                      )}
                                    </div>
                                    
                                    {/* Liste des rendez-vous du jour */}
                                    <div className="mt-1 space-y-1 max-h-20 overflow-y-auto">
                                      {dayAppointments && dayAppointments.length > 0 ? (
                                        dayAppointments.map((app, idx) => (
                                          <div 
                                            key={idx} 
                                            className={`${app.status === "cancelled" ? "opacity-50" : ""}`}
                                          >
                                            <CalendarAppointment 
                                              appointment={app}
                                              onStatusChange={handleStatusChange}
                                              onCancelAppointment={handleCancelAppointment}
                                              onEditAppointment={handleEditAppointment}
                                              className="text-xs"
                                            />
                                          </div>
                                        ))
                                      ) : (
                                        <div 
                                          className="text-xs text-gray-400 cursor-pointer hover:text-primary"
                                          onClick={() => {
                                            // Redirect to booking page with pre-filled date and therapist
                                            handleNewAppointment(date, selectedTherapist);
                                          }}
                                        >
                                          + Ajouter
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  {/* Vue Liste */}
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">
                      {isTherapistUser 
                        ? "Mes rendez-vous" 
                        : "Tous les rendez-vous"}
                    </h3>
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
                    </div>
                  </div>
                  
                  {/* Options de tri */}
                  {appointments && appointments.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2 items-center">
                      <span className="text-sm font-medium text-gray-700">Trier par :</span>
                      
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            setSortBy("date");
                            setSortOrder(sortOrder === "asc" && sortBy === "date" ? "desc" : "asc");
                          }}
                          className={`px-3 py-1 rounded-md text-sm flex items-center ${
                            sortBy === "date" ? "bg-indigo-100 text-indigo-800" : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          Date
                          {sortBy === "date" && (
                            <span className="material-icons ml-1 text-sm">
                              {sortOrder === "asc" ? "arrow_upward" : "arrow_downward"}
                            </span>
                          )}
                        </button>
                        
                        {/* Afficher le filtre de thérapeute uniquement pour les administrateurs et le secrétariat */}
                        {isAdminOrStaff && (
                          <button 
                            onClick={() => {
                              setSortBy("therapist");
                              setSortOrder(sortOrder === "asc" && sortBy === "therapist" ? "desc" : "asc");
                            }}
                            className={`px-3 py-1 rounded-md text-sm flex items-center ${
                              sortBy === "therapist" ? "bg-indigo-100 text-indigo-800" : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            Thérapeute
                            {sortBy === "therapist" && (
                              <span className="material-icons ml-1 text-sm">
                                {sortOrder === "asc" ? "arrow_upward" : "arrow_downward"}
                              </span>
                            )}
                          </button>
                        )}
                        
                        <button 
                          onClick={() => {
                            setSortBy("type");
                            setSortOrder(sortOrder === "asc" && sortBy === "type" ? "desc" : "asc");
                          }}
                          className={`px-3 py-1 rounded-md text-sm flex items-center ${
                            sortBy === "type" ? "bg-indigo-100 text-indigo-800" : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          Type de rendez-vous
                          {sortBy === "type" && (
                            <span className="material-icons ml-1 text-sm">
                              {sortOrder === "asc" ? "arrow_upward" : "arrow_downward"}
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                
                  {/* Liste des rendez-vous */}
                  <div className="mt-6">
                    {isLoadingAppointments ? (
                      <div className="space-y-4">
                        {Array(3).fill(0).map((_, idx) => (
                          <div key={idx} className="flex flex-col space-y-2">
                            <Skeleton className="h-12 w-full" />
                          </div>
                        ))}
                      </div>
                    ) : isLoadingAppointments ? (
                      <div className="p-4 bg-red-50 text-red-700 rounded-md">
                        Erreur lors du chargement des rendez-vous. Veuillez réessayer plus tard.
                      </div>
                    ) : groupedAppointments && groupedAppointments.length > 0 ? (
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
                                            checked={selectedAppointments.length > 0 && appointments && selectedAppointments.length === appointments.length}
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
                                      Type
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
                                  {sortAppointments(groupedAppointments).map((appointment) => {
                                    const isRecurringParent = appointment.relatedAppointments && appointment.relatedAppointments.length > 0;
                                    
                                    return (
                                      <React.Fragment key={appointment.id}>
                                        <tr className={selectedAppointments.includes(appointment.id) ? "bg-indigo-50" : ""}>
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
                                              </div>
                                            </div>
                                          </td>
                                          <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                              <div className="w-2 h-2 rounded-full bg-primary mr-2"></div>
                                              <div className="text-sm font-medium text-gray-900">{appointment.therapistName}</div>
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
                                            {(() => {
                                              const appointmentType = getAppointmentType(appointment);
                                              const badgeClass = 
                                                appointmentType === "recurring" 
                                                  ? "bg-purple-100 text-purple-800"
                                                  : appointmentType === "multiple"
                                                    ? "bg-blue-100 text-blue-800"
                                                    : "bg-gray-100 text-gray-800";
                                              
                                              return (
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${badgeClass}`}>
                                                  {getAppointmentTypeLabel(appointmentType)}
                                                </span>
                                              );
                                            })()}
                                          </td>
                                          <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(appointment.status)}`}>
                                              {getStatusLabel(appointment.status)}
                                            </span>
                                          </td>
                                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex space-x-2 justify-end">
                                              {appointment.status !== "cancelled" && (
                                                <button
                                                  onClick={() => handleCancelAppointment(appointment.id)}
                                                  className="text-red-600 hover:text-red-900"
                                                >
                                                  <span className="material-icons text-sm">cancel</span>
                                                </button>
                                              )}
                                              {appointment.status !== "completed" && appointment.status !== "cancelled" && (
                                                <button
                                                  onClick={() => handleStatusChange(appointment.id, "completed")}
                                                  className="text-green-600 hover:text-green-900"
                                                >
                                                  <span className="material-icons text-sm">check_circle</span>
                                                </button>
                                              )}
                                              <button
                                                onClick={() => handleEditAppointment(appointment.id)}
                                                className="text-blue-600 hover:text-blue-900"
                                              >
                                                <span className="material-icons text-sm">edit</span>
                                              </button>
                                              {isRecurringParent && (
                                                <button
                                                  onClick={() => {
                                                    const accordionId = `appointment-${appointment.id}`;
                                                    if (expandedAppointments.includes(accordionId)) {
                                                      setExpandedAppointments(expandedAppointments.filter(id => id !== accordionId));
                                                    } else {
                                                      setExpandedAppointments([...expandedAppointments, accordionId]);
                                                    }
                                                  }}
                                                  className="text-indigo-600 hover:text-indigo-900"
                                                >
                                                  <span className="material-icons text-sm">
                                                    {expandedAppointments.includes(`appointment-${appointment.id}`) ? "expand_less" : "expand_more"}
                                                  </span>
                                                </button>
                                              )}
                                            </div>
                                          </td>
                                        </tr>
                                        
                                        {/* Rendez-vous liés (pour les séries récurrentes) */}
                                        {isRecurringParent && expandedAppointments.includes(`appointment-${appointment.id}`) && (
                                          <tr>
                                            <td colSpan={selectMode ? 8 : 7} className="px-6 py-4 bg-gray-50">
                                              <div className="ml-8">
                                                <h4 className="text-sm font-medium text-gray-900 mb-2">Rendez-vous liés :</h4>
                                                <ul className="space-y-2">
                                                  {appointment.relatedAppointments?.map((related, index) => (
                                                    <li key={index} className="flex items-center justify-between py-1 px-2 bg-white rounded border border-gray-200">
                                                      <div className="flex items-center">
                                                        <span className="text-sm font-medium text-gray-900 mr-2">{related.date}</span>
                                                        <span className="text-sm text-gray-600 mr-2">{related.time}</span>
                                                        <span className="text-sm text-gray-600 mr-2">{related.therapistName}</span>
                                                        <span className={`px-2 text-xs leading-5 font-semibold rounded-full ${getStatusClass(related.status)}`}>
                                                          {getStatusLabel(related.status)}
                                                        </span>
                                                      </div>
                                                      <div className="flex space-x-2">
                                                        {related.status !== "cancelled" && (
                                                          <button
                                                            onClick={() => handleCancelAppointment(related.id)}
                                                            className="text-red-600 hover:text-red-900"
                                                          >
                                                            <span className="material-icons text-sm">cancel</span>
                                                          </button>
                                                        )}
                                                        {related.status !== "completed" && related.status !== "cancelled" && (
                                                          <button
                                                            onClick={() => handleStatusChange(related.id, "completed")}
                                                            className="text-green-600 hover:text-green-900"
                                                          >
                                                            <span className="material-icons text-sm">check_circle</span>
                                                          </button>
                                                        )}
                                                        <button
                                                          onClick={() => handleEditAppointment(related.id)}
                                                          className="text-blue-600 hover:text-blue-900"
                                                        >
                                                          <span className="material-icons text-sm">edit</span>
                                                        </button>
                                                      </div>
                                                    </li>
                                                  ))}
                                                </ul>
                                              </div>
                                            </td>
                                          </tr>
                                        )}
                                      </React.Fragment>
                                    );
                                  })}
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
              )}
            </div>
          </div>
        </div>
      </main>
    </DndProvider>
  );
}