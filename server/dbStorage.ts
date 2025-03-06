import pkg from 'pg';
const { Pool } = pkg;
import { format, addDays } from "date-fns";
import { Patient, Therapist, Appointment, AppointmentWithDetails, Invoice, InvoiceWithDetails, InsertPatient, InsertTherapist, InsertAppointment, InsertInvoice } from '@shared/schema';
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
      color: row.color
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
      color: row.color
    };
  }

  async createTherapist(therapist: InsertTherapist): Promise<Therapist> {
    const result = await pool.query(
      'INSERT INTO therapists (name, specialty, email, phone, color) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [therapist.name, therapist.specialty, therapist.email, therapist.phone, therapist.color]
    );
    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      specialty: row.specialty,
      email: row.email,
      phone: row.phone,
      color: row.color
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

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
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
    if (newAppointment.status === 'Confirmé') {
      await this.generateInvoiceForAppointment(newAppointment);
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
    
    // Créer le premier rendez-vous
    const firstAppointment = await this.createAppointment({
      ...baseAppointment,
      isRecurring: true,
      recurringFrequency: frequency,
      recurringCount: count,
      parentAppointmentId: null
    });
    
    appointments.push(firstAppointment);
    
    // Créer les rendez-vous récurrents
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
      
      const recurringAppointment = await this.createAppointment({
        ...baseAppointment,
        date: newDate,
        isRecurring: true,
        recurringFrequency: frequency,
        recurringCount: null,
        parentAppointmentId: firstAppointment.id
      });
      
      appointments.push(recurringAppointment);
    }
    
    return appointments;
  }

  async updateAppointment(id: number, appointmentUpdate: Partial<InsertAppointment>): Promise<Appointment | undefined> {
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

  async deleteAppointment(id: number): Promise<boolean> {
    // Vérifier s'il existe des factures liées à ce rendez-vous
    const invoiceResult = await pool.query('SELECT id FROM invoices WHERE appointmentId = $1', [id]);
    
    // Si des factures existent, les supprimer d'abord (contrainte de clé étrangère)
    if (invoiceResult.rows.length > 0) {
      await pool.query('DELETE FROM invoices WHERE appointmentId = $1', [id]);
    }
    
    const result = await pool.query('DELETE FROM appointments WHERE id = $1 RETURNING id', [id]);
    return result.rows.length > 0;
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
    const query = `
      SELECT i.*, 
        p.firstName || ' ' || p.lastName as patientName,
        t.name as therapistName,
        a.date as appointmentDate,
        a.time as appointmentTime
      FROM invoices i
      JOIN patients p ON i.patientId = p.id
      JOIN therapists t ON i.therapistId = t.id
      JOIN appointments a ON i.appointmentId = a.id
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
      appointmentDate: row.appointmentdate,
      appointmentTime: row.appointmenttime
    }));
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
    const query = `
      SELECT i.*, 
        p.firstName || ' ' || p.lastName as patientName,
        t.name as therapistName,
        a.date as appointmentDate,
        a.time as appointmentTime
      FROM invoices i
      JOIN patients p ON i.patientId = p.id
      JOIN therapists t ON i.therapistId = t.id
      JOIN appointments a ON i.appointmentId = a.id
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
      appointmentDate: row.appointmentdate,
      appointmentTime: row.appointmenttime
    }));
  }

  async getInvoicesForTherapist(therapistId: number): Promise<InvoiceWithDetails[]> {
    const query = `
      SELECT i.*, 
        p.firstName || ' ' || p.lastName as patientName,
        t.name as therapistName,
        a.date as appointmentDate,
        a.time as appointmentTime
      FROM invoices i
      JOIN patients p ON i.patientId = p.id
      JOIN therapists t ON i.therapistId = t.id
      JOIN appointments a ON i.appointmentId = a.id
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
      appointmentDate: row.appointmentdate,
      appointmentTime: row.appointmenttime
    }));
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
}

// Exporter une instance de la classe PgStorage
export const pgStorage = new PgStorage();