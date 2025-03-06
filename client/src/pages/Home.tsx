import { useState } from "react";
import { useLocation } from "wouter";
import BookingForm from "@/components/BookingForm";
import { BookingFormData } from "@shared/schema";

export default function Home() {
  const [location, setLocation] = useLocation();
  const [showBookingForm, setShowBookingForm] = useState(true);
  
  const handleViewAppointments = () => {
    setLocation("/appointments");
  };

  return (
    <>
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Centre Thérapeutique</h1>
            <button 
              onClick={handleViewAppointments}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <span className="material-icons mr-2 text-sm">calendar_today</span>
              Mes rendez-vous
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 py-8">
          {showBookingForm && <BookingForm />}
        </div>
      </main>
    </>
  );
}
