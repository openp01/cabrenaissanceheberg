import { 
  Patient, InsertPatient, patients,
  Therapist, InsertTherapist, therapists,
  Appointment, InsertAppointment, appointments,
  AppointmentWithDetails,
  Invoice, InsertInvoice, invoices,
  InvoiceWithDetails,
  Expense, InsertExpense, expenses,
  TherapistPayment, InsertTherapistPayment, therapistPayments,
  TherapistPaymentWithDetails,
  Signature, InsertSignature
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
  getAppointmentsForTherapist(therapistId: number): Promise<AppointmentWithDetails[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  createRecurringAppointments(baseAppointment: InsertAppointment, frequency: string, count: number): Promise<Appointment[]>;
  updateAppointment(id: number, appointment: Partial<InsertAppointment>): Promise<Appointment | undefined>;
  deleteAppointment(id: number): Promise<{ success: boolean; message?: string }>;
  checkAvailability(therapistId: number, date: string, time: string): Promise<{ available: boolean; conflictInfo?: { patientName: string; patientId: number } }>;
  
  // Invoice methods
  getInvoices(): Promise<InvoiceWithDetails[]>;
  getInvoice(id: number): Promise<Invoice | undefined>;
  getInvoicesForPatient(patientId: number): Promise<InvoiceWithDetails[]>;
  getInvoicesForTherapist(therapistId: number): Promise<InvoiceWithDetails[]>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined>;
  deleteInvoice(id: number): Promise<boolean>;
  getInvoiceForAppointment(appointmentId: number): Promise<Invoice | undefined>;
  
  // Expense methods
  getExpenses(): Promise<Expense[]>;
  getExpense(id: number): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: number, expense: Partial<InsertExpense>): Promise<Expense | undefined>;
  deleteExpense(id: number): Promise<boolean>;
  getExpensesByCategory(category: string): Promise<Expense[]>;
  getExpensesByDateRange(startDate: string, endDate: string): Promise<Expense[]>;
  saveExpenseReceipt(id: number, fileUrl: string): Promise<Expense | undefined>;
  
  // Therapist Payment methods
  getTherapistPayments(): Promise<TherapistPaymentWithDetails[]>;
  getTherapistPayment(id: number): Promise<TherapistPayment | undefined>;
  getTherapistPaymentsForTherapist(therapistId: number): Promise<TherapistPaymentWithDetails[]>;
  createTherapistPayment(payment: InsertTherapistPayment): Promise<TherapistPayment>;
  updateTherapistPayment(id: number, payment: Partial<InsertTherapistPayment>): Promise<TherapistPayment | undefined>;
  deleteTherapistPayment(id: number): Promise<boolean>;
  getTherapistPaymentsByDateRange(startDate: string, endDate: string): Promise<TherapistPaymentWithDetails[]>;
  createPaymentFromInvoice(invoiceId: number): Promise<TherapistPayment | undefined>;
  
  // Signature methods
  getSignatures(): Promise<Signature[]>;
  getSignature(id: number): Promise<Signature | undefined>;
  getSignatureForTherapist(therapistId: number): Promise<Signature | undefined>;
  createSignature(signature: InsertSignature): Promise<Signature>;
  updateSignature(id: number, signature: InsertSignature): Promise<Signature | undefined>;
  deleteSignature(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private patientsData: Map<number, Patient> = new Map();
  private therapistsData: Map<number, Therapist> = new Map();
  private appointmentsData: Map<number, Appointment> = new Map();
  private invoicesData: Map<number, Invoice> = new Map();
  private expensesData: Map<number, Expense> = new Map();
  private therapistPaymentsData: Map<number, TherapistPayment> = new Map();
  private signaturesData: Map<number, Signature> = new Map();
  private patientCurrentId: number = 1;
  private therapistCurrentId: number = 1;
  private appointmentCurrentId: number = 1;
  private invoiceCurrentId: number = 1;
  private expenseCurrentId: number = 1;
  private therapistPaymentCurrentId: number = 1;
  private signatureCurrentId: number = 1;

  constructor() {
    // Initialize with default therapists
    this.initializeTherapists();
    
    // Initialize with example patients and appointments
    this.initializeExampleData();
    
    // Initialize with example expenses
    this.initializeExampleExpenses();
    
    // Initialize with default admin signature
    this.initializeDefaultSignature();
  }
  
  private initializeDefaultSignature() {
    // Créer une signature administrative par défaut
    const defaultSignature: InsertSignature = {
      name: "Christian",
      signatureData: "data:image/png;base64,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",
      paidStampData: "data:image/png;base64,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",
      permanentStampData: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJYAAACWCAYAAAA8AXHiAAADZ0lEQVR4Xu3dwWljURBE0fICLA3fZTjDsCvwBmxXgHdOnWUNTGfqvtYJLnKVroeOzzmXtdb/v98+RI5AB9Y5NzjnXJdvneuM/bDWtdba18Twa6KZtNIjsK9rcZ1zAYtbNWkhYG0QAYvBGssGrDFcrBqwhGusGrDGcLFqwBKusWrAGsPFqgFLuMaqAWsMF6sGLOEaqwasQVwAG8LFqgFrDBerBizjGqkGrDFcrBqwjGukGrDGcLFqwBKusWrAGsPFqgFLuMaqAWsMF6sGLOEaqwasQ7j41bEDHssGLOEaqwYsIl1rraXnLSZe7ybAejcRdgCsUKL3dQHWuz3CDvs6hzaI1ABrEBlWDVg8uOwAaw8Za8asAUu4xqoBawwXqwYs4RqrBqwxXKwasIRrrBqwxnCxasASrrFqwBrDxaoBK+AaqwasQVysGrDGcLFqwBKusWrAGsPFqgFLuMaqAWsMF6sGLOEaqwasK7iW/5NZwx++AazWaQNWy43kAaxkIhZrxqwBi0uXHTBrg0QMWIPIWDVgCddYNWCN4WLVgCVcY9WANYaLVQOWcI1VA9YYLlYNWMI1Vg1YY7hYNWAJ11g1YP2Ai//qWOpg1oAlXGPVgDWGi1UDlnCNVQPWGC5WDVjCNVYNWGO4WDVgCddYNWCN4WLVgFXCZbM2a3aBNWjWgDUIjFUDlnCNVQPWGC5WDVjCNVYNWGO4WDVgCddYNWCN4WLVgCVcY9WANYaLVRsGa6QasJgzYwewRnCxKzBrxrWAAas9tGYNWJf2aGYtPWsz94uFUMWjPR5mrdU1ZtZM2mfSaulaax25AsKsGdfVNfg+mLVakrUQsGrJvgpYHTha3YBlVxl07QBrENdaNSl/uBCwekk/2OPBJl3IAVZHTF1cCFgda/yYuHpYCFgdH/7BHg+z9vmqtcOsDQKbmvR+DLOWJTQGLXNrZhHMWm2PvzBrLeuwRpq1uGutGEjAAlaAwqmANQjMqgGrdlIIVm0PWG3BttZCH3uAtYdrrdoesA4kfLAQWAc2+bsTzVr7KQGsAVjWCFgHUm3W2g95zbzHOphqs1brGrDaSDJYwGqj+GcRYB1ItVk7AKsw6cBKEyKzVthbYKURt4Flh6wdaynAkrQEdYCVhPvs/3w5O/Q2ArBaMWohYMWgdmJhWf4Ds+VVl22oY5cAAAAASUVORK5CYII="
    };
    
    // Ajouter cette signature à la liste
    this.createSignature(defaultSignature);
  }
  
  private initializeExampleExpenses() {
    // Ajouter des dépenses de démonstration
    const today = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    const formattedToday = format(today, 'dd/MM/yyyy');
    const formattedLastMonth = format(lastMonth, 'dd/MM/yyyy');
    
    const exampleExpenses: InsertExpense[] = [
      {
        description: "Achat de fournitures de bureau",
        amount: "85.50",
        date: formattedToday,
        category: "Fournitures",
        paymentMethod: "Carte bancaire",
        notes: "Papier, stylos, classeurs"
      },
      {
        description: "Logiciel de gestion",
        amount: "120.00",
        date: formattedLastMonth,
        category: "Logiciels",
        paymentMethod: "Virement",
        notes: "Abonnement annuel"
      },
      {
        description: "Entretien du local",
        amount: "150.00",
        date: formattedLastMonth,
        category: "Maintenance",
        paymentMethod: "Chèque",
        notes: "Service de nettoyage mensuel"
      }
    ];
    
    exampleExpenses.forEach(expense => {
      this.createExpense(expense);
    });
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
      address: insertPatient.address ?? null,
      birthDate: insertPatient.birthDate ?? null,
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
      email: insertTherapist.email ?? null,
      phone: insertTherapist.phone ?? null,
      color: insertTherapist.color ?? null,
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
  
  async getAppointmentsForTherapist(therapistId: number): Promise<AppointmentWithDetails[]> {
    const appointments = Array.from(this.appointmentsData.values())
      .filter(app => app.therapistId === therapistId);
    
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

  async createAppointment(insertAppointment: InsertAppointment, skipInvoiceGeneration: boolean = false): Promise<Appointment> {
    const id = this.appointmentCurrentId++;
    const appointment: Appointment = { 
      id,
      patientId: insertAppointment.patientId,
      therapistId: insertAppointment.therapistId,
      date: insertAppointment.date,
      time: insertAppointment.time,
      duration: insertAppointment.duration ?? null,
      type: insertAppointment.type ?? null,
      notes: insertAppointment.notes ?? null,
      status: insertAppointment.status || 'confirmed',
      isRecurring: insertAppointment.isRecurring ?? null,
      recurringFrequency: insertAppointment.recurringFrequency ?? null,
      recurringCount: insertAppointment.recurringCount ?? null,
      parentAppointmentId: insertAppointment.parentAppointmentId ?? null,
      createdAt: new Date()
    };
    this.appointmentsData.set(id, appointment);
    
    // Générer automatiquement une facture si le rendez-vous est confirmé et qu'on ne saute pas la génération
    if (appointment.status.toLowerCase() === 'confirmed' && !skipInvoiceGeneration) {
      console.log(`Statut du rendez-vous créé: ${appointment.status}`);
      console.log(`Génération d'une facture pour le rendez-vous ${appointment.id}`);
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
    
    // Prix standard pour une séance thérapeutique (à adapter selon les besoins)
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
      notes: `Séance thérapeutique du ${appointment.date} à ${appointment.time}`
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
        case 'Annuel':
          nextDate = new Date(baseDate);
          nextDate.setFullYear(baseDate.getFullYear() + i);
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

  async deleteAppointment(id: number): Promise<{ success: boolean; message?: string }> {
    const appointment = this.appointmentsData.get(id);
    if (!appointment) {
      return { success: false, message: "Rendez-vous non trouvé" };
    }
    
    // Vérifier s'il existe une facture liée à ce rendez-vous
    const invoices = Array.from(this.invoicesData.values())
      .filter(invoice => invoice.appointmentId === id);
    
    // Vérifier s'il existe des paiements liés à ces factures
    for (const invoice of invoices) {
      const payments = Array.from(this.therapistPaymentsData.values())
        .filter(payment => payment.invoiceId === invoice.id);
      
      if (payments.length > 0) {
        return { 
          success: false, 
          message: "Ce rendez-vous ne peut pas être supprimé car il a déjà été réglé au thérapeute" 
        };
      }
    }
    
    // Supprimer les factures associées
    for (const invoice of invoices) {
      this.invoicesData.delete(invoice.id);
    }
    
    // Supprimer le rendez-vous
    const deleted = this.appointmentsData.delete(id);
    return { success: deleted };
  }

  async checkAvailability(therapistId: number, date: string, time: string): Promise<{ available: boolean; conflictInfo?: { patientName: string; patientId: number } }> {
    const appointments = Array.from(this.appointmentsData.values());
    
    // Check if there's already an appointment at the same time
    const conflict = appointments.find(
      app => app.therapistId === therapistId && 
             app.date === date && 
             app.time === time
    );
    
    if (!conflict) {
      return { available: true };
    }
    
    // Si on a un conflit, récupérer les informations du patient
    const patient = await this.getPatient(conflict.patientId);
    
    if (patient) {
      return {
        available: false,
        conflictInfo: {
          patientName: `${patient.firstName} ${patient.lastName}`,
          patientId: patient.id
        }
      };
    }
    
    return { available: false };
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
      notes: insertInvoice.notes || null,
      templateId: insertInvoice.templateId || null,
      signatureUrl: insertInvoice.signatureUrl || null
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

  // Expense methods
  async getExpenses(): Promise<Expense[]> {
    return Array.from(this.expensesData.values());
  }

  async getExpense(id: number): Promise<Expense | undefined> {
    return this.expensesData.get(id);
  }

  async createExpense(insertExpense: InsertExpense): Promise<Expense> {
    const id = this.expenseCurrentId++;
    const today = new Date();
    
    const expense: Expense = {
      id,
      description: insertExpense.description,
      amount: insertExpense.amount,
      date: insertExpense.date,
      category: insertExpense.category,
      paymentMethod: insertExpense.paymentMethod,
      notes: insertExpense.notes ?? null,
      receiptUrl: insertExpense.receiptUrl ?? null,
      createdAt: new Date()
    };
    
    this.expensesData.set(id, expense);
    return expense;
  }

  async updateExpense(id: number, expenseUpdate: Partial<InsertExpense>): Promise<Expense | undefined> {
    const existingExpense = this.expensesData.get(id);
    
    if (!existingExpense) {
      return undefined;
    }
    
    const updatedExpense = {
      ...existingExpense,
      ...expenseUpdate
    };
    
    this.expensesData.set(id, updatedExpense);
    return updatedExpense;
  }

  async deleteExpense(id: number): Promise<boolean> {
    return this.expensesData.delete(id);
  }

  async getExpensesByCategory(category: string): Promise<Expense[]> {
    return Array.from(this.expensesData.values())
      .filter(expense => expense.category === category);
  }

  async getExpensesByDateRange(startDate: string, endDate: string): Promise<Expense[]> {
    const start = parse(startDate, 'dd/MM/yyyy', new Date());
    const end = parse(endDate, 'dd/MM/yyyy', new Date());
    
    return Array.from(this.expensesData.values())
      .filter(expense => {
        const expenseDate = parse(expense.date, 'dd/MM/yyyy', new Date());
        return expenseDate >= start && expenseDate <= end;
      });
  }

  async saveExpenseReceipt(id: number, fileUrl: string): Promise<Expense | undefined> {
    const existingExpense = this.expensesData.get(id);
    
    if (!existingExpense) {
      return undefined;
    }
    
    const updatedExpense = {
      ...existingExpense,
      receiptUrl: fileUrl
    };
    
    this.expensesData.set(id, updatedExpense);
    return updatedExpense;
  }

  // Therapist Payment methods
  async getTherapistPayments(): Promise<TherapistPaymentWithDetails[]> {
    const payments = Array.from(this.therapistPaymentsData.values());
    return Promise.all(payments.map(async payment => {
      const therapist = await this.getTherapist(payment.therapistId);
      const invoice = await this.getInvoice(payment.invoiceId);
      const patient = invoice ? await this.getPatient(invoice.patientId) : undefined;
      
      return {
        ...payment,
        therapistName: therapist ? therapist.name : 'Unknown',
        invoiceNumber: invoice ? invoice.invoiceNumber : 'Unknown',
        patientName: patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown'
      };
    }));
  }

  async getTherapistPayment(id: number): Promise<TherapistPayment | undefined> {
    return this.therapistPaymentsData.get(id);
  }

  async getTherapistPaymentsForTherapist(therapistId: number): Promise<TherapistPaymentWithDetails[]> {
    const payments = Array.from(this.therapistPaymentsData.values())
      .filter(payment => payment.therapistId === therapistId);
    
    return Promise.all(payments.map(async payment => {
      const therapist = await this.getTherapist(payment.therapistId);
      const invoice = await this.getInvoice(payment.invoiceId);
      const patient = invoice ? await this.getPatient(invoice.patientId) : undefined;
      
      return {
        ...payment,
        therapistName: therapist ? therapist.name : 'Unknown',
        invoiceNumber: invoice ? invoice.invoiceNumber : 'Unknown',
        patientName: patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown'
      };
    }));
  }

  async createTherapistPayment(insertPayment: InsertTherapistPayment): Promise<TherapistPayment> {
    const id = this.therapistPaymentCurrentId++;
    const today = new Date();
    
    const payment: TherapistPayment = {
      id,
      therapistId: insertPayment.therapistId,
      invoiceId: insertPayment.invoiceId,
      amount: Number(insertPayment.amount),
      paymentDate: insertPayment.paymentDate,
      paymentMethod: insertPayment.paymentMethod,
      paymentReference: insertPayment.paymentReference ?? null,
      notes: insertPayment.notes ?? null,
      createdAt: today
    };
    
    this.therapistPaymentsData.set(id, payment);
    return payment;
  }

  async updateTherapistPayment(id: number, paymentUpdate: Partial<InsertTherapistPayment>): Promise<TherapistPayment | undefined> {
    const existingPayment = this.therapistPaymentsData.get(id);
    
    if (!existingPayment) {
      return undefined;
    }
    
    // Créer une version actualisée du paiement
    const updatedPayment: TherapistPayment = {
      ...existingPayment
    };
    
    // Mettre à jour les champs un par un pour assurer la cohérence des types
    if (paymentUpdate.therapistId !== undefined) updatedPayment.therapistId = paymentUpdate.therapistId;
    if (paymentUpdate.invoiceId !== undefined) updatedPayment.invoiceId = paymentUpdate.invoiceId;
    if (paymentUpdate.amount !== undefined) updatedPayment.amount = Number(paymentUpdate.amount);
    if (paymentUpdate.paymentDate !== undefined) updatedPayment.paymentDate = paymentUpdate.paymentDate;
    if (paymentUpdate.paymentMethod !== undefined) updatedPayment.paymentMethod = paymentUpdate.paymentMethod;
    if (paymentUpdate.paymentReference !== undefined) updatedPayment.paymentReference = paymentUpdate.paymentReference;
    if (paymentUpdate.notes !== undefined) updatedPayment.notes = paymentUpdate.notes;
    
    this.therapistPaymentsData.set(id, updatedPayment);
    return updatedPayment;
  }

  async deleteTherapistPayment(id: number): Promise<boolean> {
    return this.therapistPaymentsData.delete(id);
  }

  async getTherapistPaymentsByDateRange(startDate: string, endDate: string): Promise<TherapistPaymentWithDetails[]> {
    const start = parse(startDate, 'dd/MM/yyyy', new Date());
    const end = parse(endDate, 'dd/MM/yyyy', new Date());
    
    const payments = Array.from(this.therapistPaymentsData.values())
      .filter(payment => {
        const paymentDate = parse(payment.paymentDate, 'dd/MM/yyyy', new Date());
        return paymentDate >= start && paymentDate <= end;
      });
    
    return Promise.all(payments.map(async payment => {
      const therapist = await this.getTherapist(payment.therapistId);
      const invoice = await this.getInvoice(payment.invoiceId);
      const patient = invoice ? await this.getPatient(invoice.patientId) : undefined;
      
      return {
        ...payment,
        therapistName: therapist ? therapist.name : 'Unknown',
        invoiceNumber: invoice ? invoice.invoiceNumber : 'Unknown',
        patientName: patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown'
      };
    }));
  }

  async createPaymentFromInvoice(invoiceId: number): Promise<TherapistPayment | undefined> {
    const invoice = await this.getInvoice(invoiceId);
    
    if (!invoice || invoice.status !== "Payée") {
      return undefined;
    }
    
    // Vérifier si un paiement existe déjà pour cette facture
    const existingPayment = Array.from(this.therapistPaymentsData.values())
      .find(payment => payment.invoiceId === invoiceId);
    
    if (existingPayment) {
      return existingPayment;
    }
    
    // Créer un nouveau paiement
    const today = new Date();
    const formattedToday = format(today, 'dd/MM/yyyy');
    
    // Préparation des données avec conversion explicite des types
    const invoiceAmount = typeof invoice.amount === 'string' 
      ? parseFloat(invoice.amount) 
      : Number(invoice.amount);
    
    const insertPayment: InsertTherapistPayment = {
      therapistId: invoice.therapistId,
      invoiceId: invoice.id,
      amount: invoiceAmount, // Montant déjà converti en nombre
      paymentDate: formattedToday,
      paymentMethod: invoice.paymentMethod || "Virement bancaire",
      notes: `Paiement automatique pour la facture ${invoice.invoiceNumber}`
    };
    
    return this.createTherapistPayment(insertPayment);
  }

  // Signature methods
  async getSignatures(): Promise<Signature[]> {
    return Array.from(this.signaturesData.values());
  }

  async getSignature(id: number): Promise<Signature | undefined> {
    return this.signaturesData.get(id);
  }

  async getSignatureForTherapist(therapistId: number): Promise<Signature | undefined> {
    // Puisque la table admin_signature n'a pas de therapistId, on renvoie juste la signature admin par défaut
    const signatures = Array.from(this.signaturesData.values());
    return signatures.length > 0 ? signatures[0] : undefined;
  }

  async createSignature(insertSignature: InsertSignature): Promise<Signature> {
    const id = this.signatureCurrentId++;
    const signature: Signature = {
      id,
      name: insertSignature.name || "Christian",
      signatureData: insertSignature.signatureData,
      paidStampData: insertSignature.paidStampData || null,
      permanentStampData: insertSignature.permanentStampData || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.signaturesData.set(id, signature);
    return signature;
  }

  async updateSignature(id: number, signatureUpdate: InsertSignature): Promise<Signature | undefined> {
    const existingSignature = this.signaturesData.get(id);
    
    if (!existingSignature) {
      return undefined;
    }
    
    const updatedSignature: Signature = {
      ...existingSignature,
      name: signatureUpdate.name || existingSignature.name,
      signatureData: signatureUpdate.signatureData,
      paidStampData: signatureUpdate.paidStampData !== undefined ? signatureUpdate.paidStampData : existingSignature.paidStampData,
      permanentStampData: signatureUpdate.permanentStampData !== undefined ? signatureUpdate.permanentStampData : existingSignature.permanentStampData,
      updatedAt: new Date()
    };
    
    this.signaturesData.set(id, updatedSignature);
    return updatedSignature;
  }

  async deleteSignature(id: number): Promise<boolean> {
    return this.signaturesData.delete(id);
  }
}

// Importer le stockage PostgreSQL depuis dbStorage.ts
import { pgStorage } from './dbStorage';

// Utiliser le stockage PostgreSQL au lieu du stockage en mémoire
export const storage = pgStorage;
