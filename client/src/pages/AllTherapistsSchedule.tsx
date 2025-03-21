import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Therapist, AppointmentWithDetails } from '@shared/schema';
import { format, parseISO, addDays, startOfWeek, startOfDay, addWeeks, subWeeks, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, CalendarDays, Info } from 'lucide-react';

// Couleurs variées et bien distinctes pour les thérapeutes
const THERAPIST_COLORS = [
  "#E74C3C", // Rouge vif
  "#3498DB", // Bleu clair
  "#27AE60", // Vert émeraude
  "#9B59B6", // Violet
  "#F39C12", // Orange
  "#16A085", // Turquoise foncé
  "#D35400", // Orange foncé
  "#2980B9", // Bleu marine
  "#8E44AD", // Violet foncé
  "#C0392B", // Rouge bordeaux
  "#1ABC9C", // Turquoise clair
  "#F1C40F"  // Jaune
];

// Définition des tranches horaires
const TIME_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", 
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", 
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00"
];

export default function AllTherapistsSchedule() {
  const [currentWeek, setCurrentWeek] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [daysToShow, setDaysToShow] = useState<Date[]>([]);

  // Chargement des thérapeutes
  const { data: therapists = [] } = useQuery({
    queryKey: ['/api/therapists'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Chargement des rendez-vous
  const { data: appointments = [] } = useQuery({
    queryKey: ['/api/appointments'],
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  // Générer les jours de la semaine en cours
  useEffect(() => {
    const days = [];
    for (let i = 0; i < 5; i++) {
      days.push(addDays(currentWeek, i));
    }
    setDaysToShow(days);
  }, [currentWeek]);

  // Navigation dans les semaines
  const handlePrevWeek = () => {
    setCurrentWeek(subWeeks(currentWeek, 1));
  };

  const handleNextWeek = () => {
    setCurrentWeek(addWeeks(currentWeek, 1));
  };

  // Revenir à la semaine actuelle
  const handleToday = () => {
    setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  // Obtenir les rendez-vous pour une tranche horaire donnée
  const getAppointmentsForTimeSlot = (date: Date, time: string) => {
    return appointments.filter((appointment: AppointmentWithDetails) => {
      return (
        appointment.date === format(date, 'yyyy-MM-dd') &&
        appointment.time === time
      );
    });
  };

  // Obtenir la couleur associée à un thérapeute
  const getTherapistColor = (therapistId: number): string => {
    const index = (therapistId - 1) % THERAPIST_COLORS.length;
    return THERAPIST_COLORS[index];
  };

  // Formatter les titres des jours avec le jour de la semaine et la date
  const formatDayTitle = (date: Date): string => {
    return format(date, 'EEEE d MMMM', { locale: fr });
  };

  // Déterminer si la date est aujourd'hui
  const isToday = (date: Date): boolean => {
    return isSameDay(date, new Date());
  };

  // Formater une date pour affichage
  const formatDateForDisplay = (dateStr: string): string => {
    return format(parseISO(dateStr), 'dd/MM/yyyy');
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6 text-primary">Planning commun des thérapeutes</h1>
      
      {/* Navigation de la semaine */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handlePrevWeek}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Semaine précédente
          </Button>
          <Button variant="outline" onClick={handleToday}>
            <CalendarDays className="h-4 w-4 mr-1" /> Aujourd'hui
          </Button>
          <Button variant="outline" onClick={handleNextWeek}>
            Semaine suivante <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        <div className="text-lg font-medium">
          {format(currentWeek, 'MMMM yyyy', { locale: fr })}
        </div>
      </div>

      {/* Légende des thérapeutes */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-3 flex items-center">
          <Info className="h-5 w-5 mr-2" /> Légende des thérapeutes
        </h3>
        <div className="flex flex-wrap gap-4">
          {therapists.map((therapist: Therapist) => (
            <div key={therapist.id} className="flex items-center">
              <div 
                className="w-4 h-4 rounded-full mr-2" 
                style={{ backgroundColor: getTherapistColor(therapist.id) }}
              ></div>
              <span>{therapist.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Calendrier */}
      <div className="grid grid-cols-6 gap-2">
        {/* Colonne des heures */}
        <div className="col-span-1">
          <Card className="h-16 flex items-center justify-center bg-primary text-white">
            <CardHeader className="p-4">
              <CardTitle className="text-center text-sm">Horaires</CardTitle>
            </CardHeader>
          </Card>
          {TIME_SLOTS.map((time) => (
            <Card key={time} className="mt-2 h-16 flex items-center justify-center">
              <CardContent className="p-2 text-sm font-medium">
                {time}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Colonnes des jours */}
        {daysToShow.map((day, dayIndex) => (
          <div key={dayIndex} className="col-span-1">
            <Card className={`h-16 flex items-center justify-center ${isToday(day) ? 'bg-primary text-white' : 'bg-gray-100'}`}>
              <CardHeader className="p-2">
                <CardTitle className="text-center text-sm capitalize">{formatDayTitle(day)}</CardTitle>
              </CardHeader>
            </Card>
            {TIME_SLOTS.map((time) => {
              const slotsForTime = getAppointmentsForTimeSlot(day, time);
              return (
                <Card key={`${dayIndex}-${time}`} className="mt-2 h-16 flex items-start justify-start relative p-1">
                  {slotsForTime.length > 0 ? (
                    <div className="flex flex-wrap gap-1 w-full h-full overflow-hidden">
                      {slotsForTime.map((appointment: AppointmentWithDetails) => (
                        <TooltipProvider key={appointment.id}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div 
                                className="rounded-md w-full h-full p-1 text-xs text-white overflow-hidden"
                                style={{ backgroundColor: getTherapistColor(appointment.therapistId) }}
                              >
                                <div className="font-semibold">{appointment.therapistName}</div>
                                <div className="truncate">{appointment.patientName}</div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="p-2 max-w-xs">
                              <div className="font-bold">{appointment.patientName}</div>
                              <div>Thérapeute: {appointment.therapistName}</div>
                              <div>Date: {formatDateForDisplay(appointment.date)} - {appointment.time}</div>
                              <div>Type: {appointment.type || "Consultation standard"}</div>
                              <div>Statut: {appointment.status}</div>
                              {appointment.notes && <div>Notes: {appointment.notes}</div>}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                    </div>
                  ) : null}
                </Card>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}