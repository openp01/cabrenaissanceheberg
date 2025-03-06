import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format, parse, addDays, startOfWeek, eachDayOfInterval, endOfWeek, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { Appointment, AppointmentWithDetails, Therapist } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export default function TherapistSchedule() {
  const [location, setLocation] = useLocation();
  const [selectedTherapist, setSelectedTherapist] = useState<number | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weekDates, setWeekDates] = useState<Date[]>([]);
  
  // Time slots
  const timeSlots = [
    "9:00", "9:30", "10:00", "10:30", "11:00", "11:30", 
    "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00"
  ];

  // Week days in French
  const weekDaysFull = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

  // Fetch therapists
  const { data: therapists, isLoading: isLoadingTherapists } = useQuery<Therapist[]>({
    queryKey: ['/api/therapists'],
  });

  // Fetch appointments
  const { data: appointments, isLoading: isLoadingAppointments } = useQuery<AppointmentWithDetails[]>({
    queryKey: ['/api/appointments'],
    enabled: selectedTherapist !== null,
  });

  useEffect(() => {
    // Set default therapist if available
    if (therapists && therapists.length > 0 && !selectedTherapist) {
      setSelectedTherapist(therapists[0].id);
    }
  }, [therapists]);

  useEffect(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });
    setWeekDates(days);
  }, [currentDate]);

  const handlePrevWeek = () => {
    setCurrentDate(addDays(currentDate, -7));
  };

  const handleNextWeek = () => {
    setCurrentDate(addDays(currentDate, 7));
  };

  const handleTherapistChange = (value: string) => {
    setSelectedTherapist(parseInt(value));
  };

  const handleNewAppointment = () => {
    setLocation("/");
  };

  const handleViewAppointments = () => {
    setLocation("/appointments");
  };

  const isAppointmentScheduled = (date: Date, time: string, therapistId: number) => {
    if (!appointments) return false;
    
    const formattedDate = format(date, 'dd/MM/yyyy');
    
    return appointments.some(app => 
      app.therapistId === therapistId && 
      app.date === formattedDate && 
      app.time === time
    );
  };

  const getAppointmentDetails = (date: Date, time: string, therapistId: number) => {
    if (!appointments) return null;
    
    const formattedDate = format(date, 'dd/MM/yyyy');
    
    return appointments.find(app => 
      app.therapistId === therapistId && 
      app.date === formattedDate && 
      app.time === time
    );
  };

  return (
    <>
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Centre d'Orthophonie</h1>
            <div className="flex space-x-2">
              <button 
                onClick={handleNewAppointment}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <span className="material-icons mr-2 text-sm">add</span>
                Nouveau rendez-vous
              </button>
              <button 
                onClick={handleViewAppointments}
                className="inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <span className="material-icons mr-2 text-sm">calendar_today</span>
                Liste des rendez-vous
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
              <div className="flex justify-between items-center flex-wrap">
                <h2 className="text-lg font-medium text-gray-900">Emploi du temps des orthophonistes</h2>
                {/* Therapist selector */}
                <div className="w-64 mt-2 sm:mt-0">
                  {isLoadingTherapists ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Select
                      value={selectedTherapist?.toString() || ""}
                      onValueChange={handleTherapistChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un orthophoniste" />
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
              </div>
            </div>
            
            <div className="px-4 py-5 sm:p-6">
              {/* Calendar Navigation */}
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
                  <button 
                    className="p-2 rounded-full hover:bg-gray-100"
                    onClick={handleNextWeek}
                  >
                    <span className="material-icons">chevron_right</span>
                  </button>
                </div>
              </div>
              
              {/* Weekly Calendar */}
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
                                  <div className="bg-primary text-white p-1 rounded text-center overflow-hidden text-ellipsis">
                                    <div className="font-medium">{appointment.patientName}</div>
                                  </div>
                                ) : (
                                  <div className="h-6"></div>
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
          </div>
        </div>
      </main>
    </>
  );
}