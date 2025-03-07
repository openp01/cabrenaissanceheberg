import pkg from 'pg';
const { Pool } = pkg;
import { format, addDays, parse } from "date-fns";
import { 
  Patient, Therapist, Appointment, AppointmentWithDetails, 
  Invoice, InvoiceWithDetails, InsertPatient, InsertTherapist, 
  InsertAppointment, InsertInvoice, Expense, InsertExpense,
  TherapistPayment, TherapistPaymentWithDetails, InsertTherapistPayment 
} from '@shared/schema';
import { IStorage } from './storage';

// Configuration de la connexion à la base de données
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Initialisation de la base de données
async function initializeDatabase() {
  const client = await pool.connect();
  try {
    // Création des tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS patients (
        id SERIAL PRIMARY KEY,
        firstName TEXT NOT NULL,
        lastName TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        birthDate TEXT,
        address TEXT,
        notes TEXT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS therapists (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        specialty TEXT,
        email TEXT,
        phone TEXT,
        color TEXT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        patientId INTEGER NOT NULL,
        therapistId INTEGER NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        duration INTEGER,
        type TEXT,
        notes TEXT,
        status TEXT,
        isRecurring BOOLEAN,
        recurringFrequency TEXT,
        recurringCount INTEGER,
        parentAppointmentId INTEGER,
        FOREIGN KEY (patientId) REFERENCES patients (id),
        FOREIGN KEY (therapistId) REFERENCES therapists (id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        invoiceNumber TEXT NOT NULL,
        patientId INTEGER NOT NULL,
        therapistId INTEGER NOT NULL,
        appointmentId INTEGER NOT NULL,
        amount TEXT NOT NULL,
        taxRate TEXT,
        totalAmount TEXT NOT NULL,
        status TEXT NOT NULL,
        issueDate TEXT NOT NULL,
        dueDate TEXT NOT NULL,
        paymentMethod TEXT,
        notes TEXT,
        FOREIGN KEY (patientId) REFERENCES patients (id),
        FOREIGN KEY (therapistId) REFERENCES therapists (id),
        FOREIGN KEY (appointmentId) REFERENCES appointments (id)
      );
    `);

    // Création de la table expenses
    await client.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        description TEXT NOT NULL,
        amount NUMERIC(10, 2) NOT NULL,
        date TEXT NOT NULL,
        category TEXT NOT NULL,
        paymentMethod TEXT NOT NULL,
        notes TEXT,
        receiptUrl TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Création de la table therapist_payments
    await client.query(`
      CREATE TABLE IF NOT EXISTS therapist_payments (
        id SERIAL PRIMARY KEY,
        therapistId INTEGER NOT NULL,
        invoiceId INTEGER NOT NULL,
        amount NUMERIC(10, 2) NOT NULL,
        paymentDate TEXT NOT NULL,
        paymentMethod TEXT NOT NULL,
        paymentReference TEXT,
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (therapistId) REFERENCES therapists (id),
        FOREIGN KEY (invoiceId) REFERENCES invoices (id)
      );
    `);

    // Vérifier si des données existent déjà
    const result = await client.query('SELECT COUNT(*) FROM patients');
    const count = parseInt(result.rows[0].count);

    // Si aucune donnée n'existe, initialiser avec des exemples
    if (count === 0) {
      console.log("Initialisation des données d'exemple dans la base de données...");
      await initializeExampleData();
    }
  } finally {
    client.release();
  }
}

// Initialisation des données d'exemple
async function initializeExampleData() {
  const client = await pool.connect();
  try {
    // Patients d'exemple
    await client.query(`
      INSERT INTO patients (firstName, lastName, email, phone, birthDate, address)
      VALUES 
        ('Lucas', 'Martin', 'lucas.martin@email.com', '06 12 34 56 78', '15/05/2018', '12 Rue de Paris, 75001 Paris'),
        ('Emma', 'Bernard', 'emma.bernard@email.com', '06 23 45 67 89', '22/07/2017', '25 Avenue des Champs, 75008 Paris'),
        ('Hugo', 'Petit', 'hugo.petit@email.com', '06 34 56 78 90', '10/03/2019', '8 Boulevard Saint-Michel, 75005 Paris'),
        ('Léa', 'Dubois', 'lea.dubois@email.com', '06 45 67 89 01', '05/12/2016', '45 Rue de Rivoli, 75004 Paris');
    `);

    // Thérapeutes d'exemple
    await client.query(`
      INSERT INTO therapists (name, specialty, email, phone, color)
      VALUES 
        ('Dr. Sophie Laurent', 'Orthophonie pédiatrique', 'sophie.laurent@ortho.fr', '01 23 45 67 89', '#4CAF50'),
        ('Dr. Thomas Moreau', 'Troubles du langage', 'thomas.moreau@ortho.fr', '01 34 56 78 90', '#2196F3'),
        ('Dr. Marie Lefèvre', 'Rééducation vocale', 'marie.lefevre@ortho.fr', '01 45 67 89 01', '#FF9800');
    `);

    // Rendez-vous d'exemple
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const formatDate = (date: Date) => {
      return format(date, 'dd/MM/yyyy');
    };
    
    // Dépenses d'exemple
    await client.query(`
      INSERT INTO expenses (description, amount, date, category, paymentMethod, notes)
      VALUES 
        ('Achat de fournitures de bureau', 125.50, $1, 'Fournitures', 'Carte Bancaire', 'Papier, stylos, classeurs pour le cabinet'),
        ('Abonnement logiciel de gestion', 49.99, $1, 'Logiciels', 'Prélèvement', 'Abonnement mensuel au logiciel de gestion de patients'),
        ('Formation continue', 350.00, $2, 'Formation', 'Virement', 'Séminaire sur les nouvelles techniques d''orthophonie pédiatrique'),
        ('Loyer du cabinet', 800.00, $1, 'Loyer', 'Virement', 'Loyer mensuel pour le local professionnel');
    `, [formatDate(today), formatDate(tomorrow)]);

    await client.query(`
      INSERT INTO appointments (patientId, therapistId, date, time, duration, type, notes, status)
      VALUES 
        (1, 1, $1, '09:00', 45, 'Première consultation', 'Évaluation initiale', 'Confirmé'),
        (2, 2, $2, '10:30', 45, 'Suivi régulier', 'Exercices de prononciation', 'Confirmé'),
        (3, 1, $1, '14:00', 45, 'Bilan', 'Bilan semestriel', 'Confirmé'),
        (4, 3, $2, '15:30', 45, 'Rééducation', 'Travail sur la fluidité verbale', 'Confirmé');
    `, [formatDate(today), formatDate(tomorrow)]);

    // Récupérer les rendez-vous créés pour générer des factures
    const appointmentsResult = await client.query('SELECT * FROM appointments');
    
    // Générer des factures pour chaque rendez-vous
    for (const appointment of appointmentsResult.rows) {
      // Obtenir la date actuelle pour la date d'émission
      const issueDate = format(today, 'dd/MM/yyyy');
      
      // Date d'échéance (30 jours plus tard)
      const dueDate = format(addDays(today, 30), 'dd/MM/yyyy');
      
      // Générer un numéro de facture unique
      const invoiceNumber = `F-${today.getFullYear()}-${String(appointment.id).padStart(4, '0')}`;
      
      // Prix standard pour une séance d'orthophonie
      const sessionPrice = "50.00";
      
      // Créer la facture
      await client.query(`
        INSERT INTO invoices (
          invoiceNumber, patientId, therapistId, appointmentId, 
          amount, taxRate, totalAmount, status, 
          issueDate, dueDate, notes
        )
        VALUES (
          $1, $2, $3, $4, 
          $5, $6, $7, $8, 
          $9, $10, $11
        )
      `, [
        invoiceNumber,
        appointment.patientid,
        appointment.therapistid,
        appointment.id,
        sessionPrice,
        "0",
        sessionPrice,
        "En attente",
        issueDate,
        dueDate,
        `Séance d'orthophonie du ${appointment.date} à ${appointment.time}`
      ]);
    }
  } finally {
    client.release();
  }
}

// Implémentation de la classe de stockage PostgreSQL
export class PgStorage implements IStorage {
  constructor() {
    // Initialiser la base de données au démarrage
    initializeDatabase().catch(err => {
      console.error('Erreur lors de l\'initialisation de la base de données:', err);
    });
  }

  // Méthodes pour les patients
  async getPatients(): Promise<Patient[]> {
    const result = await pool.query('SELECT * FROM patients ORDER BY lastName, firstName');
    return result.rows.map(row => ({
      id: row.id,
      firstName: row.firstname,
      lastName: row.lastname,
      email: row.email,
      phone: row.phone,
      birthDate: row.birthdate,
      address: row.address,
      notes: row.notes
    }));
  }

  async getPatient(id: number): Promise<Patient | undefined> {
    const result = await pool.query('SELECT * FROM patients WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return undefined;
    }
    const row = result.rows[0];
    return {
      id: row.id,
      firstName: row.firstname,
      lastName: row.lastname,
      email: row.email,
      phone: row.phone,
      birthDate: row.birthdate,
      address: row.address,
      notes: row.notes
    };
  }

  async createPatient(patient: InsertPatient): Promise<Patient> {
    const result = await pool.query(
      'INSERT INTO patients (firstName, lastName, email, phone, birthDate, address, notes) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [patient.firstName, patient.lastName, patient.email, patient.phone, patient.birthDate, patient.address, patient.notes]
    );
    const row = result.rows[0];
    return {
      id: row.id,
      firstName: row.firstname,
      lastName: row.lastname,
      email: row.email,
      phone: row.phone,
      birthDate: row.birthdate,
      address: row.address,
      notes: row.notes
    };
  }

  async searchPatients(query: string): Promise<Patient[]> {
    const searchQuery = `%${query.toLowerCase()}%`;
    const result = await pool.query(
      'SELECT * FROM patients WHERE LOWER(firstName) LIKE $1 OR LOWER(lastName) LIKE $1 ORDER BY lastName, firstName',
      [searchQuery]
    );
    return result.rows.map(row => ({
      id: row.id,
      firstName: row.firstname,
      lastName: row.lastname,
      email: row.email,
      phone: row.phone,
      birthDate: row.birthdate,
      address: row.address,
      notes: row.notes
    }));
  }

  // Méthodes pour les thérapeutes
  async getTherapists(): Promise<Therapist[]> {
    const result = await pool.query('SELECT * FROM therapists ORDER BY name');
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      specialty: row.specialty,
      email: row.email,
      phone: row.phone,
      color: row.color,
      availableDays: row.availabledays,
      workHours: row.workhours
    }));
  }

  async getTherapist(id: number): Promise<Therapist | undefined> {
    const result = await pool.query('SELECT * FROM therapists WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return undefined;
    }
    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      specialty: row.specialty,
      email: row.email,
      phone: row.phone,
      color: row.color,
      availableDays: row.availabledays,
      workHours: row.workhours
    };
  }

  async createTherapist(therapist: InsertTherapist): Promise<Therapist> {
    const result = await pool.query(
      'INSERT INTO therapists (name, specialty, email, phone, color, availableDays, workHours) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [therapist.name, therapist.specialty, therapist.email, therapist.phone, therapist.color, therapist.availableDays, therapist.workHours]
    );
    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      specialty: row.specialty,
      email: row.email,
      phone: row.phone,
      color: row.color,
      availableDays: row.availabledays,
      workHours: row.workhours
    };
  }

  // Méthodes pour les rendez-vous
  async getAppointments(): Promise<AppointmentWithDetails[]> {
    const query = `
      SELECT a.*, p.firstName || ' ' || p.lastName as patientName, t.name as therapistName
      FROM appointments a
      JOIN patients p ON a.patientId = p.id
      JOIN therapists t ON a.therapistId = t.id
      ORDER BY a.date, a.time
    `;
    const result = await pool.query(query);
    return result.rows.map(row => ({
      id: row.id,
      patientId: row.patientid,
      therapistId: row.therapistid,
      date: row.date,
      time: row.time,
      duration: row.duration,
      type: row.type,
      notes: row.notes,
      status: row.status,
      isRecurring: row.isrecurring,
      recurringFrequency: row.recurringfrequency,
      recurringCount: row.recurringcount,
      parentAppointmentId: row.parentappointmentid,
      patientName: row.patientname,
      therapistName: row.therapistname
    }));
  }

  async getAppointment(id: number): Promise<Appointment | undefined> {
    const result = await pool.query('SELECT * FROM appointments WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return undefined;
    }
    const row = result.rows[0];
    return {
      id: row.id,
      patientId: row.patientid,
      therapistId: row.therapistid,
      date: row.date,
      time: row.time,
      duration: row.duration,
      type: row.type,
      notes: row.notes,
      status: row.status,
      isRecurring: row.isrecurring,
      recurringFrequency: row.recurringfrequency,
      recurringCount: row.recurringcount,
      parentAppointmentId: row.parentappointmentid
    };
  }

  async getAppointmentsForPatient(patientId: number): Promise<AppointmentWithDetails[]> {
    const query = `
      SELECT a.*, p.firstName || ' ' || p.lastName as patientName, t.name as therapistName
      FROM appointments a
      JOIN patients p ON a.patientId = p.id
      JOIN therapists t ON a.therapistId = t.id
      WHERE a.patientId = $1
      ORDER BY a.date, a.time
    `;
    const result = await pool.query(query, [patientId]);
    return result.rows.map(row => ({
      id: row.id,
      patientId: row.patientid,
      therapistId: row.therapistid,
      date: row.date,
      time: row.time,
      duration: row.duration,
      type: row.type,
      notes: row.notes,
      status: row.status,
      isRecurring: row.isrecurring,
      recurringFrequency: row.recurringfrequency,
      recurringCount: row.recurringcount,
      parentAppointmentId: row.parentappointmentid,
      patientName: row.patientname,
      therapistName: row.therapistname
    }));
  }

  async createAppointment(appointment: InsertAppointment, skipInvoiceGeneration: boolean = false): Promise<Appointment> {
    const result = await pool.query(
      `INSERT INTO appointments (
        patientId, therapistId, date, time, duration, type, notes, status,
        isRecurring, recurringFrequency, recurringCount, parentAppointmentId
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [
        appointment.patientId,
        appointment.therapistId,
        appointment.date,
        appointment.time,
        appointment.duration,
        appointment.type,
        appointment.notes,
        appointment.status,
        appointment.isRecurring,
        appointment.recurringFrequency,
        appointment.recurringCount,
        appointment.parentAppointmentId
      ]
    );
    
    const row = result.rows[0];
    const newAppointment = {
      id: row.id,
      patientId: row.patientid,
      therapistId: row.therapistid,
      date: row.date,
      time: row.time,
      duration: row.duration,
      type: row.type,
      notes: row.notes,
      status: row.status,
      isRecurring: row.isrecurring,
      recurringFrequency: row.recurringfrequency,
      recurringCount: row.recurringcount,
      parentAppointmentId: row.parentappointmentid
    };
    
    // Générer automatiquement une facture si le rendez-vous est confirmé
    // et que skipInvoiceGeneration n'est pas activé
    console.log("Statut du rendez-vous créé:", newAppointment.status);
    if (!skipInvoiceGeneration && (newAppointment.status === 'Confirmé' || newAppointment.status === 'confirmed')) {
      console.log("Génération d'une facture pour le rendez-vous", newAppointment.id);
      await this.generateInvoiceForAppointment(newAppointment);
    } else if (skipInvoiceGeneration) {
      console.log("Génération de facture désactivée pour le rendez-vous récurrent", newAppointment.id);
    } else {
      console.log("Pas de génération de facture car statut !=", 'Confirmé');
    }
    
    return newAppointment;
  }

  private async generateInvoiceForAppointment(appointment: Appointment): Promise<Invoice> {
    // Obtenir la date actuelle pour la date d'émission
    const today = new Date();
    const issueDate = format(today, 'dd/MM/yyyy');
    
    // Date d'échéance (30 jours plus tard)
    const dueDate = format(addDays(today, 30), 'dd/MM/yyyy');
    
    // Générer un numéro de facture unique
    const invoiceNumber = `F-${today.getFullYear()}-${String(appointment.id).padStart(4, '0')}`;
    
    // Prix standard pour une séance d'orthophonie
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
    
    return await this.createInvoice(invoice);
  }

  async createRecurringAppointments(
    baseAppointment: InsertAppointment, 
    frequency: string, 
    count: number
  ): Promise<Appointment[]> {
    const appointments: Appointment[] = [];
    
    // Calculer toutes les dates récurrentes à l'avance pour vérifier la disponibilité
    const recurringDates: { date: string; time: string }[] = [];
    
    // Ajouter la date de base
    recurringDates.push({ date: baseAppointment.date, time: baseAppointment.time });
    
    // Calculer les dates suivantes
    for (let i = 1; i < count; i++) {
      let nextDate = new Date();
      const [day, month, year] = baseAppointment.date.split('/').map(n => parseInt(n));
      nextDate = new Date(year, month - 1, day);
      
      // Calculer la date du prochain rendez-vous en fonction de la fréquence
      if (frequency === 'weekly') {
        nextDate.setDate(nextDate.getDate() + (7 * i));
      } else if (frequency === 'biweekly') {
        nextDate.setDate(nextDate.getDate() + (14 * i));
      } else if (frequency === 'monthly') {
        nextDate.setMonth(nextDate.getMonth() + i);
      }
      
      const newDate = format(nextDate, 'dd/MM/yyyy');
      recurringDates.push({ date: newDate, time: baseAppointment.time });
    }
    
    // Vérifier la disponibilité pour toutes les dates calculées (sauf la première qui a déjà été vérifiée)
    for (let i = 1; i < recurringDates.length; i++) {
      const isAvailable = await this.checkAvailability(
        baseAppointment.therapistId,
        recurringDates[i].date,
        recurringDates[i].time
      );
      
      if (!isAvailable) {
        throw new Error(`Le créneau du ${recurringDates[i].date} à ${recurringDates[i].time} est déjà réservé`);
      }
    }
    
    // Créer le premier rendez-vous
    const firstAppointment = await this.createAppointment({
      ...baseAppointment,
      isRecurring: true,
      recurringFrequency: frequency,
      recurringCount: count,
      parentAppointmentId: null
    });
    
    appointments.push(firstAppointment);
    
    // Récupérer la facture générée pour le premier rendez-vous (si elle existe)
    const firstInvoice = await this.getInvoiceForAppointment(firstAppointment.id);
    
    // Créer les rendez-vous récurrents
    for (let i = 1; i < count; i++) {
      // Désactiver la génération automatique de facture en utilisant un flag spécial
      const skipInvoiceGeneration = true;
      
      const recurringAppointment = await this.createAppointment({
        ...baseAppointment,
        date: recurringDates[i].date,
        isRecurring: true,
        recurringFrequency: frequency,
        recurringCount: null,
        parentAppointmentId: firstAppointment.id
      }, skipInvoiceGeneration);
      
      appointments.push(recurringAppointment);
      
      // Si une facture a été générée pour le premier rendez-vous, mettre à jour ses notes
      // pour mentionner ce rendez-vous supplémentaire
      if (firstInvoice) {
        const updatedNotes = `${firstInvoice.notes}\nInclut également la séance du ${recurringDates[i].date}`;
        await this.updateInvoice(firstInvoice.id, { 
          notes: updatedNotes
        });
      }
    }
    
    // Mettre à jour la facture du premier rendez-vous pour indiquer qu'elle couvre plusieurs séances
    if (firstInvoice) {
      const totalAmount = (parseFloat(firstInvoice.amount) * count).toFixed(2);
      await this.updateInvoice(firstInvoice.id, {
        notes: `Facture groupée pour ${count} séances d'orthophonie (${frequency})`,
        amount: (parseFloat(firstInvoice.amount) * count).toString(),
        totalAmount: totalAmount
      });
    }
    
    return appointments;
  }

  async updateAppointment(id: number, appointmentUpdate: Partial<InsertAppointment>): Promise<Appointment | undefined> {
    // Récupérer le rendez-vous avant la mise à jour
    const oldAppointment = await this.getAppointment(id);
    if (!oldAppointment) {
      return undefined;
    }
    
    // Construire la requête de mise à jour de manière dynamique
    let query = 'UPDATE appointments SET ';
    const values: any[] = [];
    const updates: string[] = [];
    let paramIndex = 1;
    
    // Parcourir les champs à mettre à jour
    for (const [key, value] of Object.entries(appointmentUpdate)) {
      // Convertir camelCase en snake_case pour les noms de colonnes
      const columnName = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      updates.push(`${columnName} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
    
    query += updates.join(', ');
    query += ` WHERE id = $${paramIndex} RETURNING *`;
    values.push(id);
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return undefined;
    }
    
    const row = result.rows[0];
    const updatedAppointment = {
      id: row.id,
      patientId: row.patientid,
      therapistId: row.therapistid,
      date: row.date,
      time: row.time,
      duration: row.duration,
      type: row.type,
      notes: row.notes,
      status: row.status,
      isRecurring: row.isrecurring,
      recurringFrequency: row.recurringfrequency,
      recurringCount: row.recurringcount,
      parentAppointmentId: row.parentappointmentid
    };
    
    // Si le statut a changé, mettre à jour la facture correspondante
    if (appointmentUpdate.status && oldAppointment.status !== appointmentUpdate.status) {
      console.log(`Statut du rendez-vous ${id} modifié: ${oldAppointment.status} -> ${appointmentUpdate.status}`);
      
      const invoice = await this.getInvoiceForAppointment(id);
      
      if (invoice) {
        // Mettre à jour le statut de la facture en fonction du statut du rendez-vous
        let invoiceStatus = invoice.status;
        
        if (appointmentUpdate.status === 'Annulé' || appointmentUpdate.status === 'canceled') {
          invoiceStatus = 'En suspens';
          console.log(`Facture ${invoice.id} mise en suspens suite à l'annulation du rendez-vous`);
        } else if (appointmentUpdate.status === 'Confirmé' || appointmentUpdate.status === 'confirmed') {
          invoiceStatus = 'En attente';
          console.log(`Facture ${invoice.id} mise en attente suite à la confirmation du rendez-vous`);
        } else if (appointmentUpdate.status === 'Terminé' || appointmentUpdate.status === 'completed') {
          invoiceStatus = 'À payer';
          console.log(`Facture ${invoice.id} mise à payer suite à la complétion du rendez-vous`);
        }
        
        await this.updateInvoice(invoice.id, { status: invoiceStatus });
      } else if (
        (appointmentUpdate.status === 'Confirmé' || appointmentUpdate.status === 'confirmed') &&
        !updatedAppointment.parentAppointmentId // Ne pas générer de facture pour les rendez-vous récurrents enfants
      ) {
        // Si le statut passe à Confirmé et qu'il n'y a pas de facture, en créer une
        console.log(`Création d'une facture pour le rendez-vous ${id} qui vient d'être confirmé`);
        await this.generateInvoiceForAppointment(updatedAppointment);
      }
    }
    
    return updatedAppointment;
  }

  async deleteAppointment(id: number): Promise<boolean> {
    try {
      // Récupérer les informations sur le rendez-vous
      const appointment = await this.getAppointment(id);
      
      if (!appointment) {
        return false;
      }
      
      // Vérifier si ce rendez-vous est récurrent et s'il est le premier d'une série
      const isParentAppointment = appointment.isRecurring && !appointment.parentAppointmentId;
      
      // Si c'est un rendez-vous parent, récupérer tous les rendez-vous enfants
      let childAppointments: Appointment[] = [];
      if (isParentAppointment) {
        const result = await pool.query(
          'SELECT * FROM appointments WHERE parentAppointmentId = $1',
          [id]
        );
        
        childAppointments = result.rows.map(row => ({
          id: row.id,
          patientId: row.patientid,
          therapistId: row.therapistid,
          date: row.date,
          time: row.time,
          duration: row.duration,
          type: row.type,
          notes: row.notes,
          status: row.status,
          isRecurring: row.isrecurring,
          recurringFrequency: row.recurringfrequency,
          recurringCount: row.recurringcount,
          parentAppointmentId: row.parentappointmentid
        }));
      }
      
      // Traiter les enfants d'abord si c'est un rendez-vous parent
      if (isParentAppointment && childAppointments.length > 0) {
        console.log(`Traitement de ${childAppointments.length} rendez-vous récurrents liés au rendez-vous parent ${id}`);
        
        for (const childAppointment of childAppointments) {
          try {
            // Vérifier s'il existe une facture pour ce rendez-vous enfant
            const childInvoiceResult = await pool.query(
              'SELECT id FROM invoices WHERE appointmentId = $1',
              [childAppointment.id]
            );
            
            // Mettre à jour le statut des factures associées
            if (childInvoiceResult.rows.length > 0) {
              for (const row of childInvoiceResult.rows) {
                await this.updateInvoice(row.id, { status: 'Annulée' });
              }
            }
            
            // Supprimer le rendez-vous enfant
            await pool.query('DELETE FROM appointments WHERE id = $1', [childAppointment.id]);
          } catch (err) {
            console.error(`Erreur lors de la suppression du rendez-vous enfant ${childAppointment.id}:`, err);
            // Continuer avec les autres rendez-vous enfants malgré l'erreur
          }
        }
      }
      
      // Vérifier s'il existe des factures liées à ce rendez-vous
      const invoiceResult = await pool.query('SELECT id FROM invoices WHERE appointmentId = $1', [id]);
      
      // Si des factures existent, mettre à jour leur statut plutôt que de les supprimer
      if (invoiceResult.rows.length > 0) {
        for (const row of invoiceResult.rows) {
          console.log(`Mise à jour de la facture ${row.id} suite à la suppression du rendez-vous ${id}`);
          await this.updateInvoice(row.id, { status: 'Annulée' });
        }
      }
      
      // Supprimer le rendez-vous principal
      const result = await pool.query('DELETE FROM appointments WHERE id = $1 RETURNING id', [id]);
      return result.rows.length > 0;
    } catch (error) {
      console.error("Erreur lors de la suppression du rendez-vous:", error);
      throw error; // Propager l'erreur pour pouvoir la capturer dans la route
    }
  }

  async checkAvailability(therapistId: number, date: string, time: string): Promise<boolean> {
    const result = await pool.query(
      'SELECT COUNT(*) FROM appointments WHERE therapistId = $1 AND date = $2 AND time = $3',
      [therapistId, date, time]
    );
    const count = parseInt(result.rows[0].count);
    return count === 0; // Disponible si aucun rendez-vous n'existe à cette date et heure
  }

  // Méthodes pour les factures
  async getInvoices(): Promise<InvoiceWithDetails[]> {
    try {
      const query = `
        SELECT i.*, 
          p.firstName || ' ' || p.lastName as patientName,
          t.name as therapistName,
          a.date as appointmentDate,
          a.time as appointmentTime
        FROM invoices i
        JOIN patients p ON i.patientId = p.id
        JOIN therapists t ON i.therapistId = t.id
        LEFT JOIN appointments a ON i.appointmentId = a.id
        ORDER BY i.issueDate DESC
      `;
      const result = await pool.query(query);
      return result.rows.map(row => ({
        id: row.id,
        invoiceNumber: row.invoicenumber,
        patientId: row.patientid,
        therapistId: row.therapistid,
        appointmentId: row.appointmentid,
        amount: row.amount,
        taxRate: row.taxrate,
        totalAmount: row.totalamount,
        status: row.status,
        issueDate: row.issuedate,
        dueDate: row.duedate,
        paymentMethod: row.paymentmethod,
        notes: row.notes,
        patientName: row.patientname,
        therapistName: row.therapistname,
        appointmentDate: row.appointmentdate || 'N/A',
        appointmentTime: row.appointmenttime || 'N/A'
      }));
    } catch (error) {
      console.error("Erreur lors de la récupération des factures:", error);
      return [];
    }
  }

  async getInvoice(id: number): Promise<Invoice | undefined> {
    const result = await pool.query('SELECT * FROM invoices WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return undefined;
    }
    const row = result.rows[0];
    return {
      id: row.id,
      invoiceNumber: row.invoicenumber,
      patientId: row.patientid,
      therapistId: row.therapistid,
      appointmentId: row.appointmentid,
      amount: row.amount,
      taxRate: row.taxrate,
      totalAmount: row.totalamount,
      status: row.status,
      issueDate: row.issuedate,
      dueDate: row.duedate,
      paymentMethod: row.paymentmethod,
      notes: row.notes
    };
  }

  async getInvoicesForPatient(patientId: number): Promise<InvoiceWithDetails[]> {
    try {
      const query = `
        SELECT i.*, 
          p.firstName || ' ' || p.lastName as patientName,
          t.name as therapistName,
          a.date as appointmentDate,
          a.time as appointmentTime
        FROM invoices i
        JOIN patients p ON i.patientId = p.id
        JOIN therapists t ON i.therapistId = t.id
        LEFT JOIN appointments a ON i.appointmentId = a.id
        WHERE i.patientId = $1
        ORDER BY i.issueDate DESC
      `;
      const result = await pool.query(query, [patientId]);
      return result.rows.map(row => ({
        id: row.id,
        invoiceNumber: row.invoicenumber,
        patientId: row.patientid,
        therapistId: row.therapistid,
        appointmentId: row.appointmentid,
        amount: row.amount,
        taxRate: row.taxrate,
        totalAmount: row.totalamount,
        status: row.status,
        issueDate: row.issuedate,
        dueDate: row.duedate,
        paymentMethod: row.paymentmethod,
        notes: row.notes,
        patientName: row.patientname,
        therapistName: row.therapistname,
        appointmentDate: row.appointmentdate || 'N/A',
        appointmentTime: row.appointmenttime || 'N/A'
      }));
    } catch (error) {
      console.error(`Erreur lors de la récupération des factures pour le patient ${patientId}:`, error);
      return [];
    }
  }

  async getInvoicesForTherapist(therapistId: number): Promise<InvoiceWithDetails[]> {
    try {
      const query = `
        SELECT i.*, 
          p.firstName || ' ' || p.lastName as patientName,
          t.name as therapistName,
          a.date as appointmentDate,
          a.time as appointmentTime
        FROM invoices i
        JOIN patients p ON i.patientId = p.id
        JOIN therapists t ON i.therapistId = t.id
        LEFT JOIN appointments a ON i.appointmentId = a.id
        WHERE i.therapistId = $1
        ORDER BY i.issueDate DESC
      `;
      const result = await pool.query(query, [therapistId]);
      return result.rows.map(row => ({
        id: row.id,
        invoiceNumber: row.invoicenumber,
        patientId: row.patientid,
        therapistId: row.therapistid,
        appointmentId: row.appointmentid,
        amount: row.amount,
        taxRate: row.taxrate,
        totalAmount: row.totalamount,
        status: row.status,
        issueDate: row.issuedate,
        dueDate: row.duedate,
        paymentMethod: row.paymentmethod,
        notes: row.notes,
        patientName: row.patientname,
        therapistName: row.therapistname,
        appointmentDate: row.appointmentdate || 'N/A',
        appointmentTime: row.appointmenttime || 'N/A'
      }));
    } catch (error) {
      console.error(`Erreur lors de la récupération des factures pour le thérapeute ${therapistId}:`, error);
      return [];
    }
  }

  async createInvoice(insertInvoice: InsertInvoice): Promise<Invoice> {
    const result = await pool.query(
      `INSERT INTO invoices (
        invoiceNumber, patientId, therapistId, appointmentId,
        amount, taxRate, totalAmount, status,
        issueDate, dueDate, paymentMethod, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [
        insertInvoice.invoiceNumber,
        insertInvoice.patientId,
        insertInvoice.therapistId,
        insertInvoice.appointmentId,
        insertInvoice.amount,
        insertInvoice.taxRate || "0",
        insertInvoice.totalAmount,
        insertInvoice.status || "En attente",
        insertInvoice.issueDate,
        insertInvoice.dueDate,
        insertInvoice.paymentMethod,
        insertInvoice.notes
      ]
    );
    
    const row = result.rows[0];
    return {
      id: row.id,
      invoiceNumber: row.invoicenumber,
      patientId: row.patientid,
      therapistId: row.therapistid,
      appointmentId: row.appointmentid,
      amount: row.amount,
      taxRate: row.taxrate,
      totalAmount: row.totalamount,
      status: row.status,
      issueDate: row.issuedate,
      dueDate: row.duedate,
      paymentMethod: row.paymentmethod,
      notes: row.notes
    };
  }

  async updateInvoice(id: number, invoiceUpdate: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    // Construire la requête de mise à jour de manière dynamique
    let query = 'UPDATE invoices SET ';
    const values: any[] = [];
    const updates: string[] = [];
    let paramIndex = 1;
    
    // Parcourir les champs à mettre à jour
    for (const [key, value] of Object.entries(invoiceUpdate)) {
      // Convertir camelCase en snake_case pour les noms de colonnes
      const columnName = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      updates.push(`${columnName} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
    
    query += updates.join(', ');
    query += ` WHERE id = $${paramIndex} RETURNING *`;
    values.push(id);
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return undefined;
    }
    
    const row = result.rows[0];
    return {
      id: row.id,
      invoiceNumber: row.invoicenumber,
      patientId: row.patientid,
      therapistId: row.therapistid,
      appointmentId: row.appointmentid,
      amount: row.amount,
      taxRate: row.taxrate,
      totalAmount: row.totalamount,
      status: row.status,
      issueDate: row.issuedate,
      dueDate: row.duedate,
      paymentMethod: row.paymentmethod,
      notes: row.notes
    };
  }

  async deleteInvoice(id: number): Promise<boolean> {
    const result = await pool.query('DELETE FROM invoices WHERE id = $1 RETURNING id', [id]);
    return result.rows.length > 0;
  }

  async getInvoiceForAppointment(appointmentId: number): Promise<Invoice | undefined> {
    const result = await pool.query('SELECT * FROM invoices WHERE appointmentId = $1', [appointmentId]);
    if (result.rows.length === 0) {
      return undefined;
    }
    const row = result.rows[0];
    return {
      id: row.id,
      invoiceNumber: row.invoicenumber,
      patientId: row.patientid,
      therapistId: row.therapistid,
      appointmentId: row.appointmentid,
      amount: row.amount,
      taxRate: row.taxrate,
      totalAmount: row.totalamount,
      status: row.status,
      issueDate: row.issuedate,
      dueDate: row.duedate,
      paymentMethod: row.paymentmethod,
      notes: row.notes
    };
  }

  // Méthodes pour gérer les dépenses
  async getExpenses(): Promise<Expense[]> {
    const result = await pool.query('SELECT * FROM expenses ORDER BY date DESC');
    return result.rows.map(row => ({
      id: row.id,
      description: row.description,
      amount: row.amount.toString(),
      date: row.date,
      category: row.category,
      paymentMethod: row.paymentmethod,
      notes: row.notes,
      receiptUrl: row.receipturl,
      createdAt: row.created_at
    }));
  }

  async getExpense(id: number): Promise<Expense | undefined> {
    const result = await pool.query('SELECT * FROM expenses WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return undefined;
    }
    
    const row = result.rows[0];
    return {
      id: row.id,
      description: row.description,
      amount: row.amount.toString(),
      date: row.date,
      category: row.category,
      paymentMethod: row.paymentmethod,
      notes: row.notes,
      receiptUrl: row.receipturl,
      createdAt: row.created_at
    };
  }

  async createExpense(insertExpense: InsertExpense): Promise<Expense> {
    const result = await pool.query(
      `INSERT INTO expenses 
      (description, amount, date, category, paymentMethod, notes, receiptUrl)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        insertExpense.description,
        insertExpense.amount,
        insertExpense.date,
        insertExpense.category,
        insertExpense.paymentMethod,
        insertExpense.notes,
        insertExpense.receiptUrl
      ]
    );
    
    const row = result.rows[0];
    return {
      id: row.id,
      description: row.description,
      amount: row.amount.toString(),
      date: row.date,
      category: row.category,
      paymentMethod: row.paymentmethod,
      notes: row.notes,
      receiptUrl: row.receipturl,
      createdAt: row.created_at
    };
  }

  async updateExpense(id: number, expenseUpdate: Partial<InsertExpense>): Promise<Expense | undefined> {
    // Récupérer la dépense existante
    const existingExpense = await this.getExpense(id);
    if (!existingExpense) {
      return undefined;
    }
    
    // Construire la requête de mise à jour
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;
    
    if ('description' in expenseUpdate) {
      updates.push(`description = $${paramCount++}`);
      values.push(expenseUpdate.description);
    }
    
    if ('amount' in expenseUpdate) {
      updates.push(`amount = $${paramCount++}`);
      values.push(expenseUpdate.amount);
    }
    
    if ('date' in expenseUpdate) {
      updates.push(`date = $${paramCount++}`);
      values.push(expenseUpdate.date);
    }
    
    if ('category' in expenseUpdate) {
      updates.push(`category = $${paramCount++}`);
      values.push(expenseUpdate.category);
    }
    
    if ('paymentMethod' in expenseUpdate) {
      updates.push(`paymentMethod = $${paramCount++}`);
      values.push(expenseUpdate.paymentMethod);
    }
    
    if ('notes' in expenseUpdate) {
      updates.push(`notes = $${paramCount++}`);
      values.push(expenseUpdate.notes);
    }
    
    if ('receiptUrl' in expenseUpdate) {
      updates.push(`receiptUrl = $${paramCount++}`);
      values.push(expenseUpdate.receiptUrl);
    }
    
    // Si aucune mise à jour à effectuer, retourner la dépense existante
    if (updates.length === 0) {
      return existingExpense;
    }
    
    // Effectuer la mise à jour
    values.push(id);
    const result = await pool.query(
      `UPDATE expenses SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      return undefined;
    }
    
    const row = result.rows[0];
    return {
      id: row.id,
      description: row.description,
      amount: row.amount.toString(),
      date: row.date,
      category: row.category,
      paymentMethod: row.paymentmethod,
      notes: row.notes,
      receiptUrl: row.receipturl,
      createdAt: row.created_at
    };
  }

  async deleteExpense(id: number): Promise<boolean> {
    const result = await pool.query('DELETE FROM expenses WHERE id = $1 RETURNING id', [id]);
    return result.rows.length > 0;
  }

  async getExpensesByCategory(category: string): Promise<Expense[]> {
    const result = await pool.query('SELECT * FROM expenses WHERE category = $1 ORDER BY date DESC', [category]);
    return result.rows.map(row => ({
      id: row.id,
      description: row.description,
      amount: row.amount.toString(),
      date: row.date,
      category: row.category,
      paymentMethod: row.paymentmethod,
      notes: row.notes,
      receiptUrl: row.receipturl,
      createdAt: row.created_at
    }));
  }

  async getExpensesByDateRange(startDate: string, endDate: string): Promise<Expense[]> {
    const result = await pool.query(
      'SELECT * FROM expenses WHERE date >= $1 AND date <= $2 ORDER BY date DESC',
      [startDate, endDate]
    );
    
    return result.rows.map(row => ({
      id: row.id,
      description: row.description,
      amount: row.amount.toString(),
      date: row.date,
      category: row.category,
      paymentMethod: row.paymentmethod,
      notes: row.notes,
      receiptUrl: row.receipturl,
      createdAt: row.created_at
    }));
  }

  async saveExpenseReceipt(id: number, fileUrl: string): Promise<Expense | undefined> {
    const result = await pool.query(
      'UPDATE expenses SET receiptUrl = $1 WHERE id = $2 RETURNING *',
      [fileUrl, id]
    );
    
    if (result.rows.length === 0) {
      return undefined;
    }
    
    const row = result.rows[0];
    return {
      id: row.id,
      description: row.description,
      amount: row.amount.toString(),
      date: row.date,
      category: row.category,
      paymentMethod: row.paymentmethod,
      notes: row.notes,
      receiptUrl: row.receipturl,
      createdAt: row.created_at
    };
  }

  // Méthodes pour les paiements des thérapeutes
  async getTherapistPayments(): Promise<TherapistPaymentWithDetails[]> {
    const query = `
      SELECT tp.*, t.name as therapistName, i.invoiceNumber, 
             p.firstName || ' ' || p.lastName as patientName
      FROM therapist_payments tp
      JOIN therapists t ON tp.therapistId = t.id
      JOIN invoices i ON tp.invoiceId = i.id
      JOIN patients p ON i.patientId = p.id
      ORDER BY tp.paymentDate DESC
    `;
    const result = await pool.query(query);
    return result.rows.map(row => ({
      id: row.id,
      therapistId: row.therapistid,
      invoiceId: row.invoiceid,
      amount: parseFloat(row.amount),
      paymentDate: row.paymentdate,
      paymentMethod: row.paymentmethod,
      paymentReference: row.paymentreference,
      notes: row.notes,
      createdAt: row.created_at,
      therapistName: row.therapistname,
      invoiceNumber: row.invoicenumber,
      patientName: row.patientname
    }));
  }

  async getTherapistPayment(id: number): Promise<TherapistPayment | undefined> {
    const result = await pool.query('SELECT * FROM therapist_payments WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return undefined;
    }
    const row = result.rows[0];
    return {
      id: row.id,
      therapistId: row.therapistid,
      invoiceId: row.invoiceid,
      amount: parseFloat(row.amount),
      paymentDate: row.paymentdate,
      paymentMethod: row.paymentmethod,
      paymentReference: row.paymentreference,
      notes: row.notes,
      createdAt: row.created_at
    };
  }

  async getTherapistPaymentsForTherapist(therapistId: number): Promise<TherapistPaymentWithDetails[]> {
    const query = `
      SELECT tp.*, t.name as therapistName, i.invoiceNumber, 
             p.firstName || ' ' || p.lastName as patientName
      FROM therapist_payments tp
      JOIN therapists t ON tp.therapistId = t.id
      JOIN invoices i ON tp.invoiceId = i.id
      JOIN patients p ON i.patientId = p.id
      WHERE tp.therapistId = $1
      ORDER BY tp.paymentDate DESC
    `;
    const result = await pool.query(query, [therapistId]);
    return result.rows.map(row => ({
      id: row.id,
      therapistId: row.therapistid,
      invoiceId: row.invoiceid,
      amount: parseFloat(row.amount),
      paymentDate: row.paymentdate,
      paymentMethod: row.paymentmethod,
      paymentReference: row.paymentreference,
      notes: row.notes,
      createdAt: row.created_at,
      therapistName: row.therapistname,
      invoiceNumber: row.invoicenumber,
      patientName: row.patientname
    }));
  }

  async createTherapistPayment(payment: InsertTherapistPayment): Promise<TherapistPayment> {
    const result = await pool.query(
      `INSERT INTO therapist_payments (
        therapistId, invoiceId, amount, paymentDate, paymentMethod, paymentReference, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        payment.therapistId,
        payment.invoiceId,
        payment.amount,
        payment.paymentDate,
        payment.paymentMethod,
        payment.paymentReference,
        payment.notes
      ]
    );
    
    const row = result.rows[0];
    return {
      id: row.id,
      therapistId: row.therapistid,
      invoiceId: row.invoiceid,
      amount: parseFloat(row.amount),
      paymentDate: row.paymentdate,
      paymentMethod: row.paymentmethod,
      paymentReference: row.paymentreference,
      notes: row.notes,
      createdAt: row.created_at
    };
  }

  async updateTherapistPayment(id: number, paymentUpdate: Partial<InsertTherapistPayment>): Promise<TherapistPayment | undefined> {
    // Construire la requête dynamiquement en fonction des champs à mettre à jour
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (paymentUpdate.therapistId !== undefined) {
      updates.push(`therapistId = $${paramIndex++}`);
      values.push(paymentUpdate.therapistId);
    }
    
    if (paymentUpdate.invoiceId !== undefined) {
      updates.push(`invoiceId = $${paramIndex++}`);
      values.push(paymentUpdate.invoiceId);
    }
    
    if (paymentUpdate.amount !== undefined) {
      updates.push(`amount = $${paramIndex++}`);
      values.push(paymentUpdate.amount);
    }
    
    if (paymentUpdate.paymentDate !== undefined) {
      updates.push(`paymentDate = $${paramIndex++}`);
      values.push(paymentUpdate.paymentDate);
    }
    
    if (paymentUpdate.paymentMethod !== undefined) {
      updates.push(`paymentMethod = $${paramIndex++}`);
      values.push(paymentUpdate.paymentMethod);
    }
    
    if (paymentUpdate.paymentReference !== undefined) {
      updates.push(`paymentReference = $${paramIndex++}`);
      values.push(paymentUpdate.paymentReference);
    }
    
    if (paymentUpdate.notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`);
      values.push(paymentUpdate.notes);
    }
    
    if (updates.length === 0) {
      // Aucun champ à mettre à jour
      return this.getTherapistPayment(id);
    }
    
    // Compléter la requête avec l'ID du paiement
    values.push(id);
    
    const updateQuery = `
      UPDATE therapist_payments 
      SET ${updates.join(', ')} 
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    const result = await pool.query(updateQuery, values);
    
    if (result.rows.length === 0) {
      return undefined;
    }
    
    const row = result.rows[0];
    return {
      id: row.id,
      therapistId: row.therapistid,
      invoiceId: row.invoiceid,
      amount: parseFloat(row.amount),
      paymentDate: row.paymentdate,
      paymentMethod: row.paymentmethod,
      paymentReference: row.paymentreference,
      notes: row.notes,
      createdAt: row.created_at
    };
  }

  async deleteTherapistPayment(id: number): Promise<boolean> {
    const result = await pool.query('DELETE FROM therapist_payments WHERE id = $1 RETURNING id', [id]);
    return result.rows.length > 0;
  }

  async getTherapistPaymentsByDateRange(startDate: string, endDate: string): Promise<TherapistPaymentWithDetails[]> {
    const query = `
      SELECT tp.*, t.name as therapistName, i.invoiceNumber, 
             p.firstName || ' ' || p.lastName as patientName
      FROM therapist_payments tp
      JOIN therapists t ON tp.therapistId = t.id
      JOIN invoices i ON tp.invoiceId = i.id
      JOIN patients p ON i.patientId = p.id
      WHERE tp.paymentDate >= $1 AND tp.paymentDate <= $2
      ORDER BY tp.paymentDate
    `;
    const result = await pool.query(query, [startDate, endDate]);
    return result.rows.map(row => ({
      id: row.id,
      therapistId: row.therapistid,
      invoiceId: row.invoiceid,
      amount: parseFloat(row.amount),
      paymentDate: row.paymentdate,
      paymentMethod: row.paymentmethod,
      paymentReference: row.paymentreference,
      notes: row.notes,
      createdAt: row.created_at,
      therapistName: row.therapistname,
      invoiceNumber: row.invoicenumber,
      patientName: row.patientname
    }));
  }

  async createPaymentFromInvoice(invoiceId: number): Promise<TherapistPayment | undefined> {
    // Vérifier si l'invoice existe et est payée
    const invoiceResult = await pool.query('SELECT * FROM invoices WHERE id = $1', [invoiceId]);
    
    if (invoiceResult.rows.length === 0) {
      return undefined;
    }
    
    const invoice = invoiceResult.rows[0];
    
    if (invoice.status !== "Payée") {
      return undefined;
    }
    
    // Vérifier si un paiement existe déjà pour cette facture
    const existingPaymentResult = await pool.query(
      'SELECT * FROM therapist_payments WHERE invoiceId = $1',
      [invoiceId]
    );
    
    if (existingPaymentResult.rows.length > 0) {
      // Un paiement existe déjà, le retourner
      const row = existingPaymentResult.rows[0];
      return {
        id: row.id,
        therapistId: row.therapistid,
        invoiceId: row.invoiceid,
        amount: parseFloat(row.amount),
        paymentDate: row.paymentdate,
        paymentMethod: row.paymentmethod,
        paymentReference: row.paymentreference,
        notes: row.notes,
        createdAt: row.created_at
      };
    }
    
    // Créer un nouveau paiement
    const today = new Date();
    const formattedToday = format(today, 'dd/MM/yyyy');
    
    const insertPayment: InsertTherapistPayment = {
      therapistId: invoice.therapistid,
      invoiceId: invoice.id,
      amount: parseFloat(invoice.amount),
      paymentDate: formattedToday,
      paymentMethod: invoice.paymentmethod || "Virement bancaire",
      notes: `Paiement automatique pour la facture ${invoice.invoicenumber}`
    };
    
    return this.createTherapistPayment(insertPayment);
  }
}

// Exporter une instance de la classe PgStorage
export const pgStorage = new PgStorage();