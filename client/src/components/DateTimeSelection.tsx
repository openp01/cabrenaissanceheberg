import { useState, useEffect } from "react";
import { format, parse, addDays, startOfWeek, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { BookingFormData } from "@shared/schema";
import { Button } from "@/components/ui/button";
import RecurringOptions from "./RecurringOptions";

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
  const [recurringFrequency, setRecurringFrequency] = useState("Hebdomadaire");
  const [recurringCount, setRecurringCount] = useState(4);
  const [recurringDates, setRecurringDates] = useState<string[]>([]);
  
  // Time slots
  const timeSlots = [
    "9:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00"
  ];
  
  // Week days in French
  const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  
  useEffect(() => {
    generateCalendarDays(currentDate);
  }, [currentDate]);
  
  useEffect(() => {
    if (selectedDate && selectedTime) {
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
  }, [selectedDate, selectedTime, isRecurring, recurringFrequency, recurringCount, recurringDates]);
  
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
  
  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    
    // Generate recurring dates if needed
    if (isRecurring && selectedDate) {
      generateRecurringDates(selectedDate, time);
    }
  };
  
  const handleRecurringChange = (value: boolean) => {
    setIsRecurring(value);
    
    // Generate recurring dates if now enabled
    if (value && selectedDate && selectedTime) {
      generateRecurringDates(selectedDate, selectedTime);
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 mb-6">
            {timeSlots.map((time, index) => (
              <button 
                key={index}
                className={`py-2 px-3 border rounded-md text-center text-sm hover:border-primary
                  ${selectedTime === time ? 'bg-primary text-white' : ''}
                `}
                onClick={() => handleTimeSelect(time)}
              >
                {time}
              </button>
            ))}
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
        </div>
      )}
    </div>
  );
}
