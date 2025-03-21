import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfWeek, addDays, isToday } from "date-fns";
import { fr } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AppointmentWithDetails, Therapist } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Calendar } from "lucide-react";

// Couleurs prédéfinies pour les thérapeutes
const DEFAULT_COLORS = [
  "#3fb549", // Vert (Couleur principale CPR)
  "#266d2c", // Vert foncé (Couleur secondaire CPR)
  "#3b82f6", // Bleu
  "#ef4444", // Rouge
  "#8b5cf6", // Violet
  "#f97316", // Orange
  "#ec4899", // Rose
  "#6366f1", // Indigo
  "#eab308", // Jaune
  "#06b6d4", // Cyan
  "#10b981", // Émeraude
  "#1d4ed8", // Bleu foncé
  "#991b1b"  // Rouge foncé
];

// Heures de travail au cabinet
const WORK_HOURS = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

export default function AllTherapistsSchedule() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weekDates, setWeekDates] = useState<Date[]>([]);

  // Récupération des thérapeutes
  const { data: therapists } = useQuery({
    queryKey: ['/api/therapists'],
    select: (data) => data as Therapist[]
  });

  // Récupération des rendez-vous
  const { data: appointments } = useQuery({
    queryKey: ['/api/appointments'],
    select: (data) => data as AppointmentWithDetails[]
  });

  // Initialisation des dates de la semaine
  useEffect(() => {
    const startDate = startOfWeek(currentDate, { weekStartsOn: 1 }); // Commence le lundi
    const dates = Array.from({ length: 6 }, (_, i) => addDays(startDate, i)); // Du lundi au samedi
    setWeekDates(dates);
  }, [currentDate]);

  // Navigation dans les semaines
  const goToPreviousWeek = () => {
    setCurrentDate(prevDate => addDays(prevDate, -7));
  };

  const goToNextWeek = () => {
    setCurrentDate(prevDate => addDays(prevDate, 7));
  };

  const goToCurrentWeek = () => {
    setCurrentDate(new Date());
  };

  // Récupérer les rendez-vous pour un créneau horaire donné
  const getAppointmentsForTimeSlot = (date: Date, time: string) => {
    if (!appointments) return [];
    
    const dateString = format(date, 'yyyy-MM-dd');
    return appointments.filter(appointment => 
      appointment.date === dateString && 
      appointment.time === time
    );
  };

  // Obtenir la couleur à utiliser pour un thérapeute
  const getTherapistColor = (therapistId: number): string => {
    if (!therapists) return DEFAULT_COLORS[0];
    
    const therapist = therapists.find(t => t.id === therapistId);
    if (!therapist || !therapist.color) {
      // Si pas de couleur attribuée, utiliser une couleur par défaut en fonction de l'ID
      return DEFAULT_COLORS[(therapistId - 1) % DEFAULT_COLORS.length];
    }
    
    return therapist.color;
  };

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Planning commun des thérapeutes</h1>
      
      {/* Navigation des semaines */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <Button variant="outline" onClick={goToPreviousWeek}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Semaine précédente
          </Button>
        </div>
        
        <div className="text-xl font-medium">
          {weekDates.length > 0 && (
            <>
              {format(weekDates[0], "d MMMM", { locale: fr })} - {format(weekDates[weekDates.length - 1], "d MMMM yyyy", { locale: fr })}
            </>
          )}
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline" onClick={goToCurrentWeek}>
            <Calendar className="mr-2 h-4 w-4" />
            Aujourd'hui
          </Button>
          <Button variant="outline" onClick={goToNextWeek}>
            Semaine suivante
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Légende des thérapeutes */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-medium mb-3">Thérapeutes</h3>
        <div className="flex flex-wrap gap-3">
          {therapists?.map((therapist) => (
            <Badge 
              key={therapist.id} 
              style={{ 
                backgroundColor: getTherapistColor(therapist.id),
                color: 'white'
              }}
              className="text-sm py-1 px-3"
            >
              {therapist.name}
            </Badge>
          ))}
        </div>
      </div>
      
      {/* Grille de planning */}
      <div className="grid grid-cols-7 gap-2">
        {/* En-tête des heures */}
        <div className="col-span-1">
          <Card className="h-20 flex items-center justify-center bg-gray-100">
            <CardHeader className="p-4">
              <CardTitle className="text-sm font-semibold text-center">Horaires</CardTitle>
            </CardHeader>
          </Card>
          
          {WORK_HOURS.map((hour) => (
            <Card key={hour} className="h-16 flex items-center justify-center">
              <CardContent className="p-2 text-center">
                {hour}
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Colonnes des jours */}
        {weekDates.map((date) => (
          <div key={date.toString()} className="col-span-1">
            {/* En-tête du jour */}
            <Card className={`h-20 flex flex-col items-center justify-center ${isToday(date) ? 'bg-blue-100' : 'bg-gray-50'}`}>
              <CardHeader className="p-4">
                <CardTitle className="text-sm font-semibold text-center">
                  {format(date, "EEEE", { locale: fr })}
                </CardTitle>
                <p className={`text-center text-sm mt-1 ${isToday(date) ? 'font-bold' : ''}`}>
                  {format(date, "d MMM", { locale: fr })}
                </p>
              </CardHeader>
            </Card>
            
            {/* Créneaux horaires */}
            {WORK_HOURS.map((hour) => {
              const appointmentsForSlot = getAppointmentsForTimeSlot(date, hour);
              
              return (
                <Card key={`${date.toString()}-${hour}`} className="h-16 relative overflow-hidden">
                  <CardContent className="p-0 h-full">
                    <div className="h-full border border-gray-100 p-1">
                      {appointmentsForSlot.length > 0 ? (
                        <div className="flex flex-col space-y-1 h-full">
                          {appointmentsForSlot.map((appointment) => (
                            <div 
                              key={appointment.id}
                              className="text-xs truncate px-1 py-0.5 rounded-sm text-white font-medium"
                              style={{ 
                                backgroundColor: getTherapistColor(appointment.therapistId),
                                maxHeight: `${90 / appointmentsForSlot.length}%`
                              }}
                              title={`${appointment.patientName} - ${appointment.therapistName}`}
                            >
                              {appointment.patientName}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="h-full w-full"></div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}