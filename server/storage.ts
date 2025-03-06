import { 
  Patient, InsertPatient, patients,
  Therapist, InsertTherapist, therapists,
  Appointment, InsertAppointment, appointments,
  AppointmentWithDetails,
  Invoice, InsertInvoice, invoices,
  InvoiceWithDetails
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
  
  // Invoice methods
  getInvoices(): Promise<InvoiceWithDetails[]>;
  getInvoice(id: number): Promise<Invoice | undefined>;
  getInvoicesForPatient(patientId: number): Promise<InvoiceWithDetails[]>;
  getInvoicesForTherapist(therapistId: number): Promise<InvoiceWithDetails[]>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined>;
  deleteInvoice(id: number): Promise<boolean>;
  getInvoiceForAppointment(appointmentId: number): Promise<Invoice | undefined>;
}

export class MemStorage implements IStorage {
  private patientsData: Map<number, Patient>;
  private therapistsData: Map<number, Therapist>;
  private appointmentsData: Map<number, Appointment>;
  private invoicesData: Map<number, Invoice>;
  private patientCurrentId: number;
  private therapistCurrentId: number;
  private appointmentCurrentId: number;
  private invoiceCurrentId: number;

  constructor() {
    this.patientsData = new Map();
    this.therapistsData = new Map();
    this.appointmentsData = new Map();
    this.invoicesData = new Map();
    this.patientCurrentId = 1;
    this.therapistCurrentId = 1;
    this.appointmentCurrentId = 1;
    this.invoiceCurrentId = 1;
    
    // Initialize with default therapists
    this.initializeTherapists();
    
    // Initialize with example patients and appointments
    this.initializeExampleData();
  }
  
  private initializeExampleData() {
    // Ajouter des patients de démonstration
    const examplePatients: InsertPatient[] = [
      {
        firstName: "Lucas",
        lastName: "Dupont",
        email: "lucas.dupont@exemple.fr",
        phone: "06 12 34 56 78",
        notes: "Enfant de 7 ans, dyslexie"
      },
      {
        firstName: "Emma",
        lastName: "Martin",
        email: "emma.martin@exemple.fr",
        phone: "06 98 76 54 32",
        notes: "Retard de langage, 4 ans"
      },
      {
        firstName: "Thomas",
        lastName: "Bernard",
        email: "thomas.bernard@exemple.fr",
        phone: "06 45 67 89 01",
        notes: "Bégaiement, adulte"
      },
      {
        firstName: "Léa",
        lastName: "Petit",
        email: "lea.petit@exemple.fr",
        phone: "06 23 45 67 89",
        notes: "Troubles d'articulation, 5 ans"
      }
    ];
    
    // Créer les patients
    const createdPatients: Patient[] = [];
    examplePatients.forEach(async patient => {
      const createdPatient = await this.createPatient(patient);
      createdPatients.push(createdPatient);
    });
    
    // Créer quelques rendez-vous
    setTimeout(async () => {
      if (createdPatients.length > 0) {
        // Obtenir la date actuelle
        const today = new Date();
        const formattedToday = format(today, 'dd/MM/yyyy');
        const tomorrow = addDays(today, 1);
        const formattedTomorrow = format(tomorrow, 'dd/MM/yyyy');
        
        // Créer des rendez-vous pour aujourd'hui et demain
        const exampleAppointments: InsertAppointment[] = [
          {
            patientId: 1,
            therapistId: 1,
            date: formattedToday,
            time: "9:00",
            status: "Confirmé"
          },
          {
            patientId: 2,
            therapistId: 1,
            date: formattedToday,
            time: "10:00",
            status: "Confirmé"
          },
          {
            patientId: 3,
            therapistId: 2,
            date: formattedToday,
            time: "14:00",
            status: "Confirmé"
          },
          {
            patientId: 4,
            therapistId: 3,
            date: formattedTomorrow,
            time: "11:00",
            status: "Confirmé"
          },
          {
            patientId: 1,
            therapistId: 4,
            date: formattedTomorrow,
            time: "16:00",
            status: "Confirmé"
          }
        ];
        
        for (const appointment of exampleAppointments) {
          await this.createAppointment(appointment);
        }
      }
    }, 100); // Petit délai pour s'assurer que les patients sont bien créés
  }

  private initializeTherapists() {
    const defaultTherapists: InsertTherapist[] = [
      { 
        name: "Dr. Sophie Martin", 
        specialty: "Troubles du langage", 
        availableDays: "Lun-Ven", 
        workHours: "9h-17h" 
      },
      { 
        name: "Dr. Thomas Dubois", 
        specialty: "Retard de parole", 
        availableDays: "Mar-Sam", 
        workHours: "10h-18h" 
      },
      { 
        name: "Dr. Élise Bernard", 
        specialty: "Dyslexie", 
        availableDays: "Mer-Ven", 
        workHours: "8h-16h" 
      },
      { 
        name: "Dr. Jean Petit", 
        specialty: "Bégaiement", 
        availableDays: "Lun-Jeu", 
        workHours: "9h-17h" 
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
    const patient: Patient = { 
      id,
      firstName: insertPatient.firstName,
      lastName: insertPatient.lastName,
      email: insertPatient.email ?? null,
      phone: insertPatient.phone ?? null,
      notes: insertPatient.notes ?? null
    };
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
    const therapist: Therapist = { 
      id,
      name: insertTherapist.name,
      specialty: insertTherapist.specialty ?? null,
      availableDays: insertTherapist.availableDays ?? null,
      workHours: insertTherapist.workHours ?? null
    };
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
    const appointment: Appointment = { 
      id,
      patientId: insertAppointment.patientId,
      therapistId: insertAppointment.therapistId,
      date: insertAppointment.date,
      time: insertAppointment.time,
      status: insertAppointment.status || 'Confirmé',
      isRecurring: insertAppointment.isRecurring ?? null,
      recurringFrequency: insertAppointment.recurringFrequency ?? null,
      recurringCount: insertAppointment.recurringCount ?? null,
      parentAppointmentId: insertAppointment.parentAppointmentId ?? null
    };
    this.appointmentsData.set(id, appointment);
    
    // Générer automatiquement une facture si le rendez-vous est confirmé
    if (appointment.status === 'Confirmé') {
      this.generateInvoiceForAppointment(appointment);
    }
    
    return appointment;
  }
  
  private async generateInvoiceForAppointment(appointment: Appointment): Promise<Invoice> {
    // Obtenir la date actuelle pour la date d'émission
    const today = new Date();
    const issueDate = format(today, 'dd/MM/yyyy');
    
    // Date d'échéance (30 jours plus tard)
    const dueDate = format(addDays(today, 30), 'dd/MM/yyyy');
    
    // Générer un numéro de facture unique
    const invoiceNumber = `F-${today.getFullYear()}-${String(this.invoiceCurrentId).padStart(4, '0')}`;
    
    // Prix standard pour une séance d'orthophonie (à adapter selon les besoins)
    const sessionPrice = "50.00";
    
    // Créer la facture
    const invoice: InsertInvoice = {
      invoiceNumber,
      patientId: appointment.patientId,
      therapistId: appointment.therapistId,
      appointmentId: appointment.id,
      amount: sessionPrice,
      taxRate: "0", // Pas de TVA sur les actes médicaux
      totalAmount: sessionPrice,
      status: "En attente",
      issueDate,
      dueDate,
      paymentMethod: null,
      notes: `Séance d'orthophonie du ${appointment.date} à ${appointment.time}`
    };
    
    return this.createInvoice(invoice);
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
  
  // Invoice methods
  async getInvoices(): Promise<InvoiceWithDetails[]> {
    const invoices = Array.from(this.invoicesData.values());
    return Promise.all(invoices.map(async invoice => {
      const patient = await this.getPatient(invoice.patientId);
      const therapist = await this.getTherapist(invoice.therapistId);
      const appointment = await this.getAppointment(invoice.appointmentId);
      
      return {
        ...invoice,
        patientName: patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown',
        therapistName: therapist ? therapist.name : 'Unknown',
        appointmentDate: appointment ? appointment.date : 'Unknown',
        appointmentTime: appointment ? appointment.time : 'Unknown'
      };
    }));
  }
  
  async getInvoice(id: number): Promise<Invoice | undefined> {
    return this.invoicesData.get(id);
  }
  
  async getInvoicesForPatient(patientId: number): Promise<InvoiceWithDetails[]> {
    const invoices = Array.from(this.invoicesData.values())
      .filter(invoice => invoice.patientId === patientId);
    
    return Promise.all(invoices.map(async invoice => {
      const patient = await this.getPatient(invoice.patientId);
      const therapist = await this.getTherapist(invoice.therapistId);
      const appointment = await this.getAppointment(invoice.appointmentId);
      
      return {
        ...invoice,
        patientName: patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown',
        therapistName: therapist ? therapist.name : 'Unknown',
        appointmentDate: appointment ? appointment.date : 'Unknown',
        appointmentTime: appointment ? appointment.time : 'Unknown'
      };
    }));
  }
  
  async getInvoicesForTherapist(therapistId: number): Promise<InvoiceWithDetails[]> {
    const invoices = Array.from(this.invoicesData.values())
      .filter(invoice => invoice.therapistId === therapistId);
    
    return Promise.all(invoices.map(async invoice => {
      const patient = await this.getPatient(invoice.patientId);
      const therapist = await this.getTherapist(invoice.therapistId);
      const appointment = await this.getAppointment(invoice.appointmentId);
      
      return {
        ...invoice,
        patientName: patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown',
        therapistName: therapist ? therapist.name : 'Unknown',
        appointmentDate: appointment ? appointment.date : 'Unknown',
        appointmentTime: appointment ? appointment.time : 'Unknown'
      };
    }));
  }
  
  async createInvoice(insertInvoice: InsertInvoice): Promise<Invoice> {
    const id = this.invoiceCurrentId++;
    const invoice: Invoice = {
      id,
      invoiceNumber: insertInvoice.invoiceNumber,
      patientId: insertInvoice.patientId,
      therapistId: insertInvoice.therapistId,
      appointmentId: insertInvoice.appointmentId,
      amount: insertInvoice.amount,
      taxRate: insertInvoice.taxRate || "0",
      totalAmount: insertInvoice.totalAmount,
      status: insertInvoice.status || "En attente",
      issueDate: insertInvoice.issueDate,
      dueDate: insertInvoice.dueDate,
      paymentMethod: insertInvoice.paymentMethod || null,
      notes: insertInvoice.notes || null
    };
    this.invoicesData.set(id, invoice);
    return invoice;
  }
  
  async updateInvoice(id: number, invoiceUpdate: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const existingInvoice = this.invoicesData.get(id);
    
    if (!existingInvoice) {
      return undefined;
    }
    
    const updatedInvoice = {
      ...existingInvoice,
      ...invoiceUpdate
    };
    
    this.invoicesData.set(id, updatedInvoice);
    return updatedInvoice;
  }
  
  async deleteInvoice(id: number): Promise<boolean> {
    return this.invoicesData.delete(id);
  }
  
  async getInvoiceForAppointment(appointmentId: number): Promise<Invoice | undefined> {
    const invoices = Array.from(this.invoicesData.values());
    return invoices.find(invoice => invoice.appointmentId === appointmentId);
  }
}

export const storage = new MemStorage();
