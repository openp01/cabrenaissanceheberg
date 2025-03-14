import { useState, useEffect } from "react";
import { format, parse, addDays, startOfWeek, isSameDay, isSameMonth } from "date-fns";
import { fr } from "date-fns/locale";
import { BookingFormData, TherapistSchedule, Therapist } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import RecurringOptions from "./RecurringOptions";
import MultipleTimeSlotsOptions from "./MultipleTimeSlotsOptions";

interface DateTimeSelectionProps {
  formData: BookingFormData;
  updateFormData: (data: Partial<BookingFormData>) => void;
}

export default function DateTimeSelection({ formData, updateFormData }: DateTimeSelectionProps) {
  const [currentMonth, setCurrentMonth] = useState(format(new Date(), 'MMMM yyyy', { locale: fr }));
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [calendarDays, setCalendarDays] = useState<Date[]>([]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [isMultipleTimeSlots, setIsMultipleTimeSlots] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState("Hebdomadaire");
  const [recurringCount, setRecurringCount] = useState(4);
  const [recurringDates, setRecurringDates] = useState<string[]>([]);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<Array<{date: string, time: string}>>([]);
  
  // État pour le thérapeute actuellement sélectionné dans l'interface
  const [currentTherapistIndex, setCurrentTherapistIndex] = useState<number>(0);
  
  const { toast } = useToast();

  const { selectedTherapists, isMultipleTherapists, therapistSchedules = [] } = formData;

  // Time slots avec des tranches de 30 minutes pour les séances d'orthophonie
  const timeSlots = [
    "9:00", "9:30", "10:00", "10:30", "11:00", "11:30", 
    "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00"
  ];
  
  // Week days in French
  const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  
  // Requête pour vérifier la disponibilité des créneaux
  const { data: appointments } = useQuery<any[]>({
    queryKey: ['/api/appointments'],
  });
  
  // Initialiser les horaires des thérapeutes sélectionnés
  useEffect(() => {
    if (isMultipleTherapists && selectedTherapists && selectedTherapists.length > 0) {
      // Créer ou mettre à jour les horaires pour chaque thérapeute sélectionné
      const schedules = selectedTherapists.map(therapist => {
        // Rechercher si un horaire existe déjà pour ce thérapeute
        const existingSchedule = therapistSchedules.find((s: TherapistSchedule) => s.therapistId === therapist.id);
        
        if (existingSchedule) {
          return existingSchedule;
        } else {
          // Créer un nouvel horaire vide
          return {
            therapistId: therapist.id,
            date: undefined,
            time: undefined
          };
        }
      });
      
      // Mettre à jour les données du formulaire avec les horaires
      updateFormData({ 
        therapistSchedules: schedules,
        currentTherapistIndex: 0 // Réinitialiser au premier thérapeute
      });
      
      // Mettre à jour l'état local
      setCurrentTherapistIndex(0);
    }
  }, [isMultipleTherapists, selectedTherapists]);
  
  useEffect(() => {
    generateCalendarDays(currentDate);
  }, [currentDate]);
  
  // Mettre à jour les données du formulaire en fonction du thérapeute actuel ou du mode standard
  useEffect(() => {
    // Si nous sommes en mode thérapeute unique, mettre à jour date/heure normalement
    if (!isMultipleTherapists && selectedDate && selectedTime) {
      const formattedDate = format(selectedDate, 'dd/MM/yyyy');
      updateFormData({ 
        date: formattedDate, 
        time: selectedTime,
        isRecurring: isRecurring,
        recurringFrequency: isRecurring ? recurringFrequency : undefined,
        recurringCount: isRecurring ? recurringCount : undefined,
        recurringDates: isRecurring ? recurringDates : undefined
      });
    } 
    // En mode multi-thérapeutes, mettre à jour l'horaire du thérapeute actuel
    else if (isMultipleTherapists && selectedTherapists && selectedTherapists.length > 0 && selectedDate && selectedTime) {
      const formattedDate = format(selectedDate, 'dd/MM/yyyy');
      
      // Récupérer le thérapeute actuel
      const currentTherapist = selectedTherapists[currentTherapistIndex];
      
      if (currentTherapist) {
        // Créer une copie des horaires existants
        const updatedSchedules = [...(therapistSchedules || [])];
        
        // Trouver l'index de l'horaire du thérapeute actuel
        const scheduleIndex = updatedSchedules.findIndex((s: TherapistSchedule) => s.therapistId === currentTherapist.id);
        
        if (scheduleIndex >= 0) {
          // Mettre à jour l'horaire existant
          updatedSchedules[scheduleIndex] = {
            ...updatedSchedules[scheduleIndex],
            date: formattedDate,
            time: selectedTime
          };
        } else {
          // Ajouter un nouvel horaire
          updatedSchedules.push({
            therapistId: currentTherapist.id,
            date: formattedDate,
            time: selectedTime
          });
        }
        
        // Mettre à jour les données du formulaire
        updateFormData({
          therapistSchedules: updatedSchedules,
          // Mettre à jour la date/heure globale aussi pour la compatibilité avec d'autres composants
          date: formattedDate,
          time: selectedTime,
          isRecurring: isRecurring,
          recurringFrequency: isRecurring ? recurringFrequency : undefined,
          recurringCount: isRecurring ? recurringCount : undefined,
          recurringDates: isRecurring ? recurringDates : undefined
        });
      }
    }
  }, [selectedDate, selectedTime, isRecurring, recurringFrequency, recurringCount, recurringDates, currentTherapistIndex]);
  
  const generateCalendarDays = (date: Date) => {
    const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    
    // Start from Monday of the week containing the first day of the month
    let startDate = startOfWeek(firstDayOfMonth, { weekStartsOn: 1 });
    
    // Generate 42 days (6 weeks)
    const days: Date[] = [];
    for (let i = 0; i < 42; i++) {
      days.push(addDays(startDate, i));
    }
    
    setCalendarDays(days);
    setCurrentMonth(format(date, 'MMMM yyyy', { locale: fr }));
  };
  
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)));
  };
  
  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)));
  };
  
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    
    // Generate recurring dates if needed
    if (isRecurring && selectedTime) {
      generateRecurringDates(date, selectedTime);
    }
  };
  
  // Vérifie si un créneau est disponible
  const isTimeSlotAvailable = (date: Date, time: string) => {
    // Si pas de rendez-vous dans la base
    if (!appointments) return true;
    
    const formattedDate = format(date, 'dd/MM/yyyy');
    
    // En mode multi-thérapeutes
    if (isMultipleTherapists && selectedTherapists && selectedTherapists.length > 0) {
      // On vérifie pour le thérapeute actuellement sélectionné
      const currentTherapist = selectedTherapists[currentTherapistIndex];
      
      if (!currentTherapist) return true;
      
      return !appointments.some((app: any) => 
        app.therapistId === currentTherapist.id && 
        app.date === formattedDate && 
        app.time === time
      );
    } 
    // En mode thérapeute unique
    else if (formData.therapist) {
      return !appointments.some((app: any) => 
        app.therapistId === formData.therapist?.id && 
        app.date === formattedDate && 
        app.time === time
      );
    }
    
    // Si aucun thérapeute n'est sélectionné
    return true;
  };
  
  const handleTimeSelect = (time: string) => {
    if (!selectedDate) return;
    
    // Vérifier la disponibilité
    if (!isTimeSlotAvailable(selectedDate, time)) {
      // Déterminer le nom du thérapeute concerné par le message
      let therapistName = "";
      
      if (isMultipleTherapists && selectedTherapists && selectedTherapists.length > 0) {
        therapistName = selectedTherapists[currentTherapistIndex]?.name || "";
      } else if (formData.therapist) {
        therapistName = formData.therapist.name;
      }
      
      toast({
        title: "Créneau non disponible",
        description: `Ce créneau horaire est déjà réservé pour ${therapistName}.`,
        variant: "destructive"
      });
      return;
    }
    
    setSelectedTime(time);
    
    // Si le mode créneaux multiples est activé, ajouter ce créneau à la liste
    if (isMultipleTimeSlots) {
      const formattedDate = format(selectedDate, 'dd/MM/yyyy');
      // Vérifier si ce créneau existe déjà dans la liste
      const slotExists = selectedTimeSlots.some(
        slot => slot.date === formattedDate && slot.time === time
      );
      
      if (!slotExists) {
        const newTimeSlots = [...selectedTimeSlots, { date: formattedDate, time }];
        setSelectedTimeSlots(newTimeSlots);
        updateFormData({ selectedTimeSlots: newTimeSlots, isMultipleTimeSlots: true });
        
        toast({
          title: "Créneau ajouté",
          description: `Le créneau du ${formattedDate} à ${time} a été ajouté à votre sélection.`,
          variant: "default"
        });
      }
    }
    
    // Generate recurring dates if needed
    if (isRecurring && selectedDate) {
      generateRecurringDates(selectedDate, time);
    }
  };
  
  const handleRecurringChange = (value: boolean) => {
    setIsRecurring(value);
    
    // Si on active les rendez-vous récurrents, on désactive les créneaux multiples
    if (value) {
      setIsMultipleTimeSlots(false);
      // Mettre à jour les données du formulaire
      updateFormData({ isMultipleTimeSlots: false });
    }
    
    // Generate recurring dates if now enabled
    if (value && selectedDate && selectedTime) {
      generateRecurringDates(selectedDate, selectedTime);
    }
  };
  
  const handleMultipleTimeSlotsChange = (value: boolean) => {
    setIsMultipleTimeSlots(value);
    
    // Si on active les créneaux multiples, on désactive les rendez-vous récurrents
    if (value) {
      setIsRecurring(false);
      // Mettre à jour les données du formulaire
      updateFormData({ 
        isRecurring: false,
        isMultipleTimeSlots: value,
        selectedTimeSlots: value ? selectedTimeSlots : []
      });
    } else {
      // Si on désactive, vider la liste des créneaux sélectionnés
      setSelectedTimeSlots([]);
      updateFormData({ selectedTimeSlots: [] });
    }
  };
  
  const handleFrequencyChange = (value: string) => {
    setRecurringFrequency(value);
    
    // Update recurring dates with new frequency
    if (selectedDate && selectedTime) {
      generateRecurringDates(selectedDate, selectedTime, value, recurringCount);
    }
  };
  
  const handleCountChange = (value: number) => {
    setRecurringCount(value);
    
    // Update recurring dates with new count
    if (selectedDate && selectedTime) {
      generateRecurringDates(selectedDate, selectedTime, recurringFrequency, value);
    }
  };
  
  const generateRecurringDates = (
    baseDate: Date, 
    time: string, 
    frequency: string = recurringFrequency, 
    count: number = recurringCount
  ) => {
    const dates = [];
    const baseDateStr = format(baseDate, 'EEEE d MMMM', { locale: fr });
    dates.push(`${baseDateStr} à ${time}`);
    
    let currentDate = baseDate;
    
    for (let i = 1; i < count; i++) {
      let nextDate;
      
      switch (frequency) {
        case 'Hebdomadaire':
          nextDate = addDays(currentDate, 7);
          break;
        case 'Bimensuel':
          nextDate = addDays(currentDate, 14);
          break;
        case 'Mensuel':
          nextDate = new Date(currentDate);
          nextDate.setMonth(nextDate.getMonth() + 1);
          break;
        case 'Annuel':
          nextDate = new Date(currentDate);
          nextDate.setFullYear(nextDate.getFullYear() + 1);
          break;
        default:
          nextDate = addDays(currentDate, 7);
      }
      
      const formattedDate = format(nextDate, 'EEEE d MMMM', { locale: fr });
      dates.push(`${formattedDate} à ${time}`);
      currentDate = nextDate;
    }
    
    setRecurringDates(dates);
  };
  
  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };
  
  return (
    <div className="max-w-4xl mx-auto">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Sélectionner la date et l'heure</h3>
      
      {/* Affichage du mode multiple si activé */}
      {isMultipleTherapists && selectedTherapists && selectedTherapists.length > 1 && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-4">
          <p className="text-amber-800 text-sm font-medium mb-2">
            <strong>Mode multi-thérapeutes activé:</strong> Vous avez sélectionné {selectedTherapists.length} thérapeutes.
          </p>
          
          {/* Sélecteur de thérapeute pour le calendrier actuel */}
          <div className="mb-2">
            <p className="text-sm text-gray-600 mb-1">Sélectionner le thérapeute pour définir son horaire:</p>
            <div className="flex flex-wrap gap-2">
              {selectedTherapists.map((therapist, index) => {
                // Déterminer si ce thérapeute a déjà un horaire
                const hasSchedule = therapistSchedules.some((s: TherapistSchedule) => 
                  s.therapistId === therapist.id && s.date && s.time
                );
                
                return (
                  <button
                    key={therapist.id}
                    onClick={() => setCurrentTherapistIndex(index)}
                    className={`px-3 py-1 text-sm rounded-full border 
                      ${index === currentTherapistIndex 
                        ? 'bg-primary text-white border-primary' 
                        : 'border-gray-300 hover:border-primary'
                      }
                      ${hasSchedule ? 'ring-1 ring-green-500' : ''}
                    `}
                  >
                    <div className="flex items-center">
                      <span>{therapist.name}</span>
                      {hasSchedule && (
                        <span className="ml-1 text-xs text-white bg-green-500 rounded-full w-4 h-4 flex items-center justify-center">
                          ✓
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Afficher le thérapeute actuellement sélectionné */}
          <p className="text-sm text-gray-700">
            Horaires affichés pour: <strong>{selectedTherapists[currentTherapistIndex]?.name}</strong>
          </p>
          
          {/* Afficher les horaires déjà définis */}
          {therapistSchedules.some((s: TherapistSchedule) => s.date && s.time) && (
            <div className="mt-2 text-xs space-y-1">
              <p className="font-medium text-gray-600">Horaires définis:</p>
              {therapistSchedules
                .filter((s: TherapistSchedule) => s.date && s.time)
                .map((schedule, idx) => {
                  const therapist = selectedTherapists.find((t: Therapist) => t.id === schedule.therapistId);
                  return (
                    <div key={idx} className="flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                      <span>{therapist?.name}: {schedule.date} à {schedule.time}</span>
                    </div>
                  );
                })
              }
            </div>
          )}
        </div>
      )}
      
      {/* Calendar Navigation */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h4 className="text-lg font-medium text-gray-900">{currentMonth.charAt(0).toUpperCase() + currentMonth.slice(1)}</h4>
        </div>
        <div className="flex space-x-2">
          <button 
            className="p-2 rounded-full hover:bg-gray-100" 
            onClick={handlePrevMonth}
          >
            <span className="material-icons">chevron_left</span>
          </button>
          <button 
            className="p-2 rounded-full hover:bg-gray-100"
            onClick={handleNextMonth}
          >
            <span className="material-icons">chevron_right</span>
          </button>
        </div>
      </div>
      
      {/* Calendar Grid */}
      <div className="mb-8">
        <div className="grid grid-cols-7 mb-2 border-b pb-2">
          {weekDays.map((day, index) => (
            <div key={index} className="text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => (
            <div key={index} className="aspect-w-1 aspect-h-1 p-1">
              <button 
                className={`w-full h-full flex items-center justify-center rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary
                  ${isSameDay(day, selectedDate as Date) ? 'bg-primary text-white' : ''}
                  ${!isCurrentMonth(day) ? 'text-gray-300' : ''}
                `}
                onClick={() => handleDateSelect(day)}
                disabled={!isCurrentMonth(day)}
              >
                <span>{format(day, 'd')}</span>
              </button>
            </div>
          ))}
        </div>
      </div>
      
      {/* Time Slots */}
      {selectedDate && (
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-4">
            Horaires disponibles pour {format(selectedDate, 'EEEE d MMMM', { locale: fr })}
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 mb-6">
            {timeSlots.map((time, index) => {
              const isAvailable = selectedDate ? isTimeSlotAvailable(selectedDate, time) : true;
              return (
                <button 
                  key={index}
                  className={`py-3 px-4 rounded-md text-center text-sm relative transition-all
                    ${selectedTime === time 
                      ? 'bg-primary text-white border-primary border-2 shadow-md transform scale-105' 
                      : isAvailable 
                        ? 'bg-green-50 border-2 border-green-300 text-green-800 hover:bg-green-100 hover:border-green-500 hover:shadow-sm hover:transform hover:scale-102' 
                        : 'bg-red-50 border border-red-200 text-red-600 opacity-70 cursor-not-allowed'
                    }
                  `}
                  onClick={() => isAvailable && handleTimeSelect(time)}
                  disabled={!isAvailable}
                >
                  <div className="flex items-center justify-center">
                    {isAvailable ? (
                      <>
                        <span className="w-3 h-3 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                        <span className="font-medium">{time}</span>
                        <span className="absolute top-1 right-1 text-xs text-green-700 font-bold">LIBRE</span>
                      </>
                    ) : (
                      <>
                        <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                        <span className="line-through">{time}</span>
                      </>
                    )}
                  </div>
                  {!isAvailable && (
                    <span className="absolute -top-1 -right-1 text-xs bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-sm">
                      ✕
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          
          {/* Recurring Options */}
          <RecurringOptions 
            isRecurring={isRecurring}
            recurringFrequency={recurringFrequency}
            recurringCount={recurringCount}
            recurringDates={recurringDates}
            onRecurringChange={handleRecurringChange}
            onFrequencyChange={handleFrequencyChange}
            onCountChange={handleCountChange}
          />
          
          {/* Multiple Time Slots Options */}
          <MultipleTimeSlotsOptions
            isMultipleTimeSlots={isMultipleTimeSlots}
            selectedTimeSlots={selectedTimeSlots}
            onMultipleTimeSlotsChange={handleMultipleTimeSlotsChange}
          />
        </div>
      )}
    </div>
  );
}
