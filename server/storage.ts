import { 
  Patient, InsertPatient, patients,
  Therapist, InsertTherapist, therapists,
  Appointment, InsertAppointment, appointments,
  AppointmentWithDetails
} from "@shared/schema";
import { addDays, addWeeks, addMonths, format, parse } from "date-fns";
import { fr } from "date-fns/locale";

// Storage interface
export interface IStorage {
  // Patient methods
  getPatients(): Promise<Patient[]>;
  getPatient(id: number): Promise<Patient | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  searchPatients(query: string): Promise<Patient[]>;
  
  // Therapist methods
  getTherapists(): Promise<Therapist[]>;
  getTherapist(id: number): Promise<Therapist | undefined>;
  createTherapist(therapist: InsertTherapist): Promise<Therapist>;
  
  // Appointment methods
  getAppointments(): Promise<AppointmentWithDetails[]>;
  getAppointment(id: number): Promise<Appointment | undefined>;
  getAppointmentsForPatient(patientId: number): Promise<AppointmentWithDetails[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  createRecurringAppointments(baseAppointment: InsertAppointment, frequency: string, count: number): Promise<Appointment[]>;
  updateAppointment(id: number, appointment: Partial<InsertAppointment>): Promise<Appointment | undefined>;
  deleteAppointment(id: number): Promise<boolean>;
  checkAvailability(therapistId: number, date: string, time: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private patientsData: Map<number, Patient>;
  private therapistsData: Map<number, Therapist>;
  private appointmentsData: Map<number, Appointment>;
  private patientCurrentId: number;
  private therapistCurrentId: number;
  private appointmentCurrentId: number;

  constructor() {
    this.patientsData = new Map();
    this.therapistsData = new Map();
    this.appointmentsData = new Map();
    this.patientCurrentId = 1;
    this.therapistCurrentId = 1;
    this.appointmentCurrentId = 1;
    
    // Initialize with default therapists
    this.initializeTherapists();
  }

  private initializeTherapists() {
    const defaultTherapists: InsertTherapist[] = [
      { 
        name: "Thérapeute 1", 
        specialty: "Psychothérapie", 
        availableDays: "Lun-Ven", 
        workHours: "9h-17h" 
      },
      { 
        name: "Thérapeute 2", 
        specialty: "Thérapie familiale", 
        availableDays: "Mar-Sam", 
        workHours: "10h-18h" 
      },
      { 
        name: "Thérapeute 3", 
        specialty: "TCC", 
        availableDays: "Mer-Dim", 
        workHours: "8h-16h" 
      }
    ];

    defaultTherapists.forEach(therapist => {
      this.createTherapist(therapist);
    });
  }

  // Patient methods
  async getPatients(): Promise<Patient[]> {
    return Array.from(this.patientsData.values());
  }

  async getPatient(id: number): Promise<Patient | undefined> {
    return this.patientsData.get(id);
  }

  async createPatient(insertPatient: InsertPatient): Promise<Patient> {
    const id = this.patientCurrentId++;
    const patient: Patient = { ...insertPatient, id };
    this.patientsData.set(id, patient);
    return patient;
  }

  async searchPatients(query: string): Promise<Patient[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.patientsData.values()).filter(patient => 
      patient.firstName.toLowerCase().includes(lowerQuery) || 
      patient.lastName.toLowerCase().includes(lowerQuery) ||
      patient.email?.toLowerCase().includes(lowerQuery) ||
      patient.phone?.includes(lowerQuery)
    );
  }

  // Therapist methods
  async getTherapists(): Promise<Therapist[]> {
    return Array.from(this.therapistsData.values());
  }

  async getTherapist(id: number): Promise<Therapist | undefined> {
    return this.therapistsData.get(id);
  }

  async createTherapist(insertTherapist: InsertTherapist): Promise<Therapist> {
    const id = this.therapistCurrentId++;
    const therapist: Therapist = { ...insertTherapist, id };
    this.therapistsData.set(id, therapist);
    return therapist;
  }

  // Appointment methods
  async getAppointments(): Promise<AppointmentWithDetails[]> {
    const appointments = Array.from(this.appointmentsData.values());
    return Promise.all(appointments.map(async appointment => {
      const patient = await this.getPatient(appointment.patientId);
      const therapist = await this.getTherapist(appointment.therapistId);
      
      return {
        ...appointment,
        patientName: patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown',
        therapistName: therapist ? therapist.name : 'Unknown'
      };
    }));
  }

  async getAppointment(id: number): Promise<Appointment | undefined> {
    return this.appointmentsData.get(id);
  }

  async getAppointmentsForPatient(patientId: number): Promise<AppointmentWithDetails[]> {
    const appointments = Array.from(this.appointmentsData.values())
      .filter(app => app.patientId === patientId);
    
    return Promise.all(appointments.map(async appointment => {
      const patient = await this.getPatient(appointment.patientId);
      const therapist = await this.getTherapist(appointment.therapistId);
      
      return {
        ...appointment,
        patientName: patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown',
        therapistName: therapist ? therapist.name : 'Unknown'
      };
    }));
  }

  async createAppointment(insertAppointment: InsertAppointment): Promise<Appointment> {
    const id = this.appointmentCurrentId++;
    const appointment: Appointment = { ...insertAppointment, id };
    this.appointmentsData.set(id, appointment);
    return appointment;
  }

  async createRecurringAppointments(
    baseAppointment: InsertAppointment, 
    frequency: string, 
    count: number
  ): Promise<Appointment[]> {
    const appointments: Appointment[] = [];
    
    // Create the first appointment
    const firstAppointment = await this.createAppointment({
      ...baseAppointment,
      isRecurring: true,
      recurringFrequency: frequency,
      recurringCount: count
    });
    
    appointments.push(firstAppointment);
    
    // Parse the date from the string format
    const baseDate = parse(baseAppointment.date, 'dd/MM/yyyy', new Date());
    
    // Create subsequent recurring appointments
    for (let i = 1; i < count; i++) {
      let nextDate;
      
      switch (frequency) {
        case 'Hebdomadaire':
          nextDate = addWeeks(baseDate, i);
          break;
        case 'Bimensuel':
          nextDate = addWeeks(baseDate, i * 2);
          break;
        case 'Mensuel':
          nextDate = addMonths(baseDate, i);
          break;
        default:
          nextDate = addWeeks(baseDate, i);
      }
      
      const formattedDate = format(nextDate, 'dd/MM/yyyy');
      
      const recurringAppointment = await this.createAppointment({
        ...baseAppointment,
        date: formattedDate,
        parentAppointmentId: firstAppointment.id,
        isRecurring: false
      });
      
      appointments.push(recurringAppointment);
    }
    
    return appointments;
  }

  async updateAppointment(id: number, appointmentUpdate: Partial<InsertAppointment>): Promise<Appointment | undefined> {
    const existingAppointment = this.appointmentsData.get(id);
    
    if (!existingAppointment) {
      return undefined;
    }
    
    const updatedAppointment = {
      ...existingAppointment,
      ...appointmentUpdate
    };
    
    this.appointmentsData.set(id, updatedAppointment);
    return updatedAppointment;
  }

  async deleteAppointment(id: number): Promise<boolean> {
    return this.appointmentsData.delete(id);
  }

  async checkAvailability(therapistId: number, date: string, time: string): Promise<boolean> {
    const appointments = Array.from(this.appointmentsData.values());
    
    // Check if there's already an appointment at the same time
    const conflict = appointments.find(
      app => app.therapistId === therapistId && 
             app.date === date && 
             app.time === time
    );
    
    return !conflict;
  }
}

export const storage = new MemStorage();
