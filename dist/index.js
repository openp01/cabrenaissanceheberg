var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
import { addDays as addDays2, addWeeks, addMonths, format as format2, parse as parse2 } from "date-fns";

// server/dbStorage.ts
import pkg from "pg";
import { format, addDays } from "date-fns";
var { Pool } = pkg;
var pool = new Pool({
  connectionString: process.env.DATABASE_URL
});
async function initializeDatabase() {
  const client = await pool.connect();
  try {
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
    const result = await client.query("SELECT COUNT(*) FROM patients");
    const count = parseInt(result.rows[0].count);
    if (count === 0) {
      console.log("Initialisation des donn\xE9es d'exemple dans la base de donn\xE9es...");
      await initializeExampleData();
    }
  } finally {
    client.release();
  }
}
async function initializeExampleData() {
  const client = await pool.connect();
  try {
    await client.query(`
      INSERT INTO patients (firstName, lastName, email, phone, birthDate, address)
      VALUES 
        ('Lucas', 'Martin', 'lucas.martin@email.com', '06 12 34 56 78', '15/05/2018', '12 Rue de Paris, 75001 Paris'),
        ('Emma', 'Bernard', 'emma.bernard@email.com', '06 23 45 67 89', '22/07/2017', '25 Avenue des Champs, 75008 Paris'),
        ('Hugo', 'Petit', 'hugo.petit@email.com', '06 34 56 78 90', '10/03/2019', '8 Boulevard Saint-Michel, 75005 Paris'),
        ('L\xE9a', 'Dubois', 'lea.dubois@email.com', '06 45 67 89 01', '05/12/2016', '45 Rue de Rivoli, 75004 Paris');
    `);
    await client.query(`
      INSERT INTO therapists (name, specialty, email, phone, color)
      VALUES 
        ('Dr. Sophie Laurent', 'Orthophonie p\xE9diatrique', 'sophie.laurent@ortho.fr', '01 23 45 67 89', '#4CAF50'),
        ('Dr. Thomas Moreau', 'Troubles du langage', 'thomas.moreau@ortho.fr', '01 34 56 78 90', '#2196F3'),
        ('Dr. Marie Lef\xE8vre', 'R\xE9\xE9ducation vocale', 'marie.lefevre@ortho.fr', '01 45 67 89 01', '#FF9800');
    `);
    const today = /* @__PURE__ */ new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const formatDate3 = (date) => {
      return format(date, "dd/MM/yyyy");
    };
    await client.query(`
      INSERT INTO expenses (description, amount, date, category, paymentMethod, notes)
      VALUES 
        ('Achat de fournitures de bureau', 125.50, $1, 'Fournitures', 'Carte Bancaire', 'Papier, stylos, classeurs pour le cabinet'),
        ('Abonnement logiciel de gestion', 49.99, $1, 'Logiciels', 'Pr\xE9l\xE8vement', 'Abonnement mensuel au logiciel de gestion de patients'),
        ('Formation continue', 350.00, $2, 'Formation', 'Virement', 'S\xE9minaire sur les nouvelles techniques d''orthophonie p\xE9diatrique'),
        ('Loyer du cabinet', 800.00, $1, 'Loyer', 'Virement', 'Loyer mensuel pour le local professionnel');
    `, [formatDate3(today), formatDate3(tomorrow)]);
    await client.query(`
      INSERT INTO appointments (patientId, therapistId, date, time, duration, type, notes, status)
      VALUES 
        (1, 1, $1, '09:00', 45, 'Premi\xE8re consultation', '\xC9valuation initiale', 'Confirm\xE9'),
        (2, 2, $2, '10:30', 45, 'Suivi r\xE9gulier', 'Exercices de prononciation', 'Confirm\xE9'),
        (3, 1, $1, '14:00', 45, 'Bilan', 'Bilan semestriel', 'Confirm\xE9'),
        (4, 3, $2, '15:30', 45, 'R\xE9\xE9ducation', 'Travail sur la fluidit\xE9 verbale', 'Confirm\xE9');
    `, [formatDate3(today), formatDate3(tomorrow)]);
    const appointmentsResult = await client.query("SELECT * FROM appointments");
    for (const appointment of appointmentsResult.rows) {
      const issueDate = format(today, "dd/MM/yyyy");
      const dueDate = format(addDays(today, 30), "dd/MM/yyyy");
      const invoiceNumber = `F-${today.getFullYear()}-${String(appointment.id).padStart(4, "0")}`;
      const sessionPrice = "50.00";
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
        `S\xE9ance th\xE9rapeutique du ${appointment.date} \xE0 ${appointment.time}`
      ]);
    }
  } finally {
    client.release();
  }
}
var PgStorage = class {
  constructor() {
    initializeDatabase().catch((err) => {
      console.error("Erreur lors de l'initialisation de la base de donn\xE9es:", err);
    });
  }
  // Méthodes pour les patients
  async getPatients() {
    const result = await pool.query("SELECT * FROM patients ORDER BY lastName, firstName");
    return result.rows.map((row) => ({
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
  async getPatient(id) {
    const result = await pool.query("SELECT * FROM patients WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      return void 0;
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
  async createPatient(patient) {
    const result = await pool.query(
      "INSERT INTO patients (firstName, lastName, email, phone, birthDate, address, notes) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
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
  async searchPatients(query) {
    const searchQuery = `%${query.toLowerCase()}%`;
    const result = await pool.query(
      "SELECT * FROM patients WHERE LOWER(firstName) LIKE $1 OR LOWER(lastName) LIKE $1 ORDER BY lastName, firstName",
      [searchQuery]
    );
    return result.rows.map((row) => ({
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
  async getTherapists() {
    const result = await pool.query("SELECT * FROM therapists ORDER BY name");
    return result.rows.map((row) => ({
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
  async getTherapist(id) {
    const result = await pool.query("SELECT * FROM therapists WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      return void 0;
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
  async createTherapist(therapist) {
    const result = await pool.query(
      "INSERT INTO therapists (name, specialty, email, phone, color, availableDays, workHours) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
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
  async getAppointments() {
    const query = `
      SELECT a.*, p.firstName || ' ' || p.lastName as patientName, t.name as therapistName
      FROM appointments a
      JOIN patients p ON a.patientId = p.id
      JOIN therapists t ON a.therapistId = t.id
      ORDER BY a.date, a.time
    `;
    const result = await pool.query(query);
    return result.rows.map((row) => ({
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
  async getAppointment(id) {
    const result = await pool.query("SELECT * FROM appointments WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      return void 0;
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
  async getAppointmentsForPatient(patientId) {
    const query = `
      SELECT a.*, p.firstName || ' ' || p.lastName as patientName, t.name as therapistName
      FROM appointments a
      JOIN patients p ON a.patientId = p.id
      JOIN therapists t ON a.therapistId = t.id
      WHERE a.patientId = $1
      ORDER BY a.date, a.time
    `;
    const result = await pool.query(query, [patientId]);
    return result.rows.map((row) => ({
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
      therapistName: row.therapistname,
      createdAt: row.createdat || /* @__PURE__ */ new Date()
    }));
  }
  async getAppointmentsForTherapist(therapistId) {
    const query = `
      SELECT a.*, p.firstName || ' ' || p.lastName as patientName, t.name as therapistName
      FROM appointments a
      JOIN patients p ON a.patientId = p.id
      JOIN therapists t ON a.therapistId = t.id
      WHERE a.therapistId = $1
      ORDER BY a.date, a.time
    `;
    const result = await pool.query(query, [therapistId]);
    return result.rows.map((row) => ({
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
      therapistName: row.therapistname,
      createdAt: row.createdat || /* @__PURE__ */ new Date()
    }));
  }
  async createAppointment(appointment, skipInvoiceGeneration = false) {
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
    console.log("Statut du rendez-vous cr\xE9\xE9:", newAppointment.status);
    if (!skipInvoiceGeneration && (newAppointment.status === "Confirm\xE9" || newAppointment.status === "confirmed")) {
      console.log("G\xE9n\xE9ration d'une facture pour le rendez-vous", newAppointment.id);
      await this.generateInvoiceForAppointment(newAppointment);
    } else if (skipInvoiceGeneration) {
      console.log("G\xE9n\xE9ration de facture d\xE9sactiv\xE9e pour le rendez-vous r\xE9current", newAppointment.id);
    } else {
      console.log("Pas de g\xE9n\xE9ration de facture car statut !=", "Confirm\xE9");
    }
    return newAppointment;
  }
  async generateInvoiceForAppointment(appointment) {
    const today = /* @__PURE__ */ new Date();
    const issueDate = format(today, "dd/MM/yyyy");
    const dueDate = format(addDays(today, 30), "dd/MM/yyyy");
    const invoiceNumber = `F-${today.getFullYear()}-${String(appointment.id).padStart(4, "0")}`;
    const sessionPrice = "50.00";
    const invoice = {
      invoiceNumber,
      patientId: appointment.patientId,
      therapistId: appointment.therapistId,
      appointmentId: appointment.id,
      amount: sessionPrice,
      taxRate: "0",
      // Pas de TVA sur les actes médicaux
      totalAmount: sessionPrice,
      status: "En attente",
      issueDate,
      dueDate,
      paymentMethod: null,
      notes: `S\xE9ance th\xE9rapeutique du ${appointment.date} \xE0 ${appointment.time}`
    };
    return await this.createInvoice(invoice);
  }
  async createRecurringAppointments(baseAppointment, frequency, count, generateSingleInvoice = true) {
    const appointments2 = [];
    const recurringDates = [];
    recurringDates.push({ date: baseAppointment.date, time: baseAppointment.time });
    const [day, month, year] = baseAppointment.date.split("/").map((n) => parseInt(n));
    const baseDate = new Date(year, month - 1, day);
    const baseDayOfWeek = baseDate.getDay();
    for (let i = 1; i < count; i++) {
      let nextDate = new Date(baseDate);
      if (frequency === "weekly" || frequency === "Hebdomadaire") {
        nextDate.setDate(nextDate.getDate() + 7 * i);
      } else if (frequency === "biweekly" || frequency === "Bimensuel") {
        nextDate.setDate(nextDate.getDate() + 14 * i);
      } else if (frequency === "monthly" || frequency === "Mensuel") {
        nextDate.setMonth(nextDate.getMonth() + i);
        const currentDayOfWeek = nextDate.getDay();
        if (currentDayOfWeek !== baseDayOfWeek) {
          const daysToAdd = (baseDayOfWeek - currentDayOfWeek + 7) % 7;
          const newDay = nextDate.getDate() + daysToAdd;
          const tempDate = new Date(nextDate);
          tempDate.setDate(newDay);
          if (tempDate.getMonth() !== nextDate.getMonth()) {
            nextDate.setDate(newDay - 7);
          } else {
            nextDate.setDate(newDay);
          }
        }
      } else if (frequency === "Annuel") {
        nextDate.setFullYear(nextDate.getFullYear() + i);
        const currentDayOfWeek = nextDate.getDay();
        if (currentDayOfWeek !== baseDayOfWeek) {
          const daysToAdd = (baseDayOfWeek - currentDayOfWeek + 7) % 7;
          nextDate.setDate(nextDate.getDate() + daysToAdd);
        }
      }
      const newDate = format(nextDate, "dd/MM/yyyy");
      recurringDates.push({ date: newDate, time: baseAppointment.time });
    }
    for (let i = 1; i < recurringDates.length; i++) {
      const { available, conflictInfo } = await this.checkAvailability(
        baseAppointment.therapistId,
        recurringDates[i].date,
        recurringDates[i].time
      );
      if (!available) {
        const errorMessage = conflictInfo ? `Le cr\xE9neau du ${recurringDates[i].date} \xE0 ${recurringDates[i].time} est d\xE9j\xE0 r\xE9serv\xE9 pour le patient ${conflictInfo.patientName}` : `Le cr\xE9neau du ${recurringDates[i].date} \xE0 ${recurringDates[i].time} est d\xE9j\xE0 r\xE9serv\xE9`;
        throw new Error(errorMessage);
      }
    }
    const firstAppointment = await this.createAppointment({
      ...baseAppointment,
      isRecurring: true,
      recurringFrequency: frequency,
      recurringCount: count,
      parentAppointmentId: null
    });
    appointments2.push(firstAppointment);
    const firstInvoice = await this.getInvoiceForAppointment(firstAppointment.id);
    for (let i = 1; i < count; i++) {
      const skipInvoiceGeneration = generateSingleInvoice;
      const recurringAppointment = await this.createAppointment({
        ...baseAppointment,
        date: recurringDates[i].date,
        isRecurring: true,
        recurringFrequency: frequency,
        recurringCount: null,
        parentAppointmentId: firstAppointment.id
      }, skipInvoiceGeneration);
      appointments2.push(recurringAppointment);
      if (generateSingleInvoice && firstInvoice) {
        const updatedNotes = `${firstInvoice.notes}
Inclut \xE9galement la s\xE9ance du ${recurringDates[i].date}`;
        await this.updateInvoice(firstInvoice.id, {
          notes: updatedNotes
        });
      }
    }
    if (firstInvoice && generateSingleInvoice) {
      const allFormattedDates = recurringDates.map((rd) => {
        const [day2, month2, year2] = rd.date.split("/").map((n) => parseInt(n));
        const date = new Date(year2, month2 - 1, day2);
        const formattedDate = date.toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric"
        });
        return `${formattedDate} \xE0 ${rd.time}`;
      }).join(", ");
      const totalAmount = (parseFloat(firstInvoice.amount) * count).toFixed(2);
      await this.updateInvoice(firstInvoice.id, {
        notes: `Facture group\xE9e pour ${count} s\xE9ances th\xE9rapeutiques (${frequency}): ${allFormattedDates}`,
        amount: (parseFloat(firstInvoice.amount) * count).toString(),
        totalAmount
      });
    }
    return appointments2;
  }
  async updateAppointment(id, appointmentUpdate) {
    const oldAppointment = await this.getAppointment(id);
    if (!oldAppointment) {
      return void 0;
    }
    let query = "UPDATE appointments SET ";
    const values = [];
    const updates = [];
    let paramIndex = 1;
    for (const [key, value] of Object.entries(appointmentUpdate)) {
      const columnName = key.replace(/([A-Z])/g, "_$1").toLowerCase();
      updates.push(`${columnName} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
    query += updates.join(", ");
    query += ` WHERE id = $${paramIndex} RETURNING *`;
    values.push(id);
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return void 0;
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
    if (appointmentUpdate.status && oldAppointment.status !== appointmentUpdate.status) {
      console.log(`Statut du rendez-vous ${id} modifi\xE9: ${oldAppointment.status} -> ${appointmentUpdate.status}`);
      const isRecurringParent = updatedAppointment.isRecurring && !updatedAppointment.parentAppointmentId;
      if (isRecurringParent) {
        console.log(`Propagation du statut ${appointmentUpdate.status} aux rendez-vous li\xE9s...`);
        const childrenResult = await pool.query(
          "SELECT id FROM appointments WHERE parentAppointmentId = $1",
          [id]
        );
        if (childrenResult.rows.length > 0) {
          const childIds = childrenResult.rows.map((row2) => row2.id);
          console.log(`Mise \xE0 jour du statut de ${childIds.length} rendez-vous li\xE9s`);
          await pool.query(
            "UPDATE appointments SET status = $1 WHERE id = ANY($2)",
            [appointmentUpdate.status, childIds]
          );
        }
      }
      const isRecurringChild = updatedAppointment.parentAppointmentId !== null;
      let invoice;
      if (isRecurringChild) {
        invoice = await this.getInvoiceForAppointment(updatedAppointment.parentAppointmentId);
      } else {
        invoice = await this.getInvoiceForAppointment(id);
      }
      if (invoice) {
        if (invoice.status === "Pay\xE9e") {
          console.log(`Facture ${invoice.id} d\xE9j\xE0 pay\xE9e, pas de modification du statut`);
        } else {
          let invoiceStatus = invoice.status;
          let newAmount = invoice.amount;
          if (isRecurringChild && appointmentUpdate.status === "cancelled") {
            const parentAppointment = await this.getAppointment(updatedAppointment.parentAppointmentId);
            if (parentAppointment && parentAppointment.recurringCount) {
              const fixedSessionPrice = 50;
              const cancelledSessionsResult = await pool.query(
                "SELECT COUNT(*) as cancelled_count FROM appointments WHERE parentAppointmentId = $1 AND status = $2",
                [parentAppointment.id, "cancelled"]
              );
              const cancelledSessionsCount = parseInt(cancelledSessionsResult.rows[0].cancelled_count);
              const remainingSessions = parentAppointment.recurringCount - cancelledSessionsCount;
              newAmount = fixedSessionPrice * remainingSessions;
              newAmount = Math.round(newAmount * 100) / 100;
              console.log(`Ajustement du montant de la facture ${invoice.id}:`);
              console.log(`- Nombre total de s\xE9ances: ${parentAppointment.recurringCount}`);
              console.log(`- Nombre de s\xE9ances annul\xE9es: ${cancelledSessionsCount}`);
              console.log(`- Nombre de s\xE9ances restantes: ${remainingSessions}`);
              console.log(`- Prix par s\xE9ance: ${fixedSessionPrice}\u20AC`);
              console.log(`- Nouveau montant total: ${newAmount}\u20AC`);
              await pool.query(
                "INSERT INTO appointment_status_changes (appointment_id, old_status, new_status) VALUES ($1, $2, $3)",
                [id, oldAppointment.status, "cancelled"]
              );
            }
          }
          if (appointmentUpdate.status === "cancelled") {
            if (!isRecurringChild) {
              invoiceStatus = "Annul\xE9e";
              console.log(`Facture ${invoice.id} annul\xE9e suite \xE0 l'annulation du rendez-vous`);
            }
          } else if (appointmentUpdate.status === "pending") {
            if (!isRecurringChild) {
              invoiceStatus = "En attente";
              console.log(`Facture ${invoice.id} mise en attente suite \xE0 la mise en attente du rendez-vous`);
            }
          } else if (appointmentUpdate.status === "completed") {
            if (!isRecurringChild) {
              invoiceStatus = "\xC0 payer";
              console.log(`Facture ${invoice.id} mise \xE0 payer suite \xE0 la compl\xE9tion du rendez-vous`);
            }
          }
          if (isRecurringChild && appointmentUpdate.status === "cancelled") {
            await this.updateInvoice(invoice.id, {
              amount: newAmount,
              totalAmount: newAmount
            });
            if (invoice.status === "Pay\xE9e" || invoice.status === "paid") {
              const paymentResult = await pool.query(
                "SELECT id FROM therapist_payments WHERE invoiceId = $1",
                [invoice.id]
              );
              if (paymentResult.rows.length > 0) {
                const paymentId = paymentResult.rows[0].id;
                console.log(`Mise \xE0 jour du montant du paiement ${paymentId} associ\xE9 \xE0 la facture ${invoice.id}: ${invoice.amount} -> ${newAmount}`);
                await pool.query(
                  "UPDATE therapist_payments SET amount = $1 WHERE id = $2",
                  [newAmount, paymentId]
                );
              }
            }
          } else if (!isRecurringChild) {
            await this.updateInvoice(invoice.id, { status: invoiceStatus });
          }
        }
      } else if ((appointmentUpdate.status === "confirmed" || appointmentUpdate.status === "Confirm\xE9" || appointmentUpdate.status === "pending" || appointmentUpdate.status === "En attente") && !updatedAppointment.parentAppointmentId) {
        console.log(`Cr\xE9ation d'une facture pour le rendez-vous ${id} avec le statut ${appointmentUpdate.status}`);
        await this.generateInvoiceForAppointment(updatedAppointment);
      }
    }
    return updatedAppointment;
  }
  async deleteAppointment(id) {
    try {
      const appointment = await this.getAppointment(id);
      if (!appointment) {
        return { success: false, message: "Rendez-vous non trouv\xE9" };
      }
      const invoiceResult = await pool.query("SELECT id FROM invoices WHERE appointmentId = $1", [id]);
      if (invoiceResult.rows.length > 0) {
        for (const row of invoiceResult.rows) {
          const paymentResult = await pool.query(
            "SELECT id FROM therapist_payments WHERE invoiceId = $1",
            [row.id]
          );
          if (paymentResult.rows.length > 0) {
            console.log(`Impossible de supprimer le rendez-vous ${id} car il a des paiements associ\xE9s`);
            return {
              success: false,
              message: "Ce rendez-vous ne peut pas \xEAtre supprim\xE9 car il a d\xE9j\xE0 \xE9t\xE9 r\xE9gl\xE9 au th\xE9rapeute"
            };
          }
        }
      }
      const isParentAppointment = appointment.isRecurring && !appointment.parentAppointmentId;
      let childAppointments = [];
      if (isParentAppointment) {
        const result2 = await pool.query(
          "SELECT * FROM appointments WHERE parentAppointmentId = $1",
          [id]
        );
        childAppointments = result2.rows.map((row) => ({
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
      if (isParentAppointment && childAppointments.length > 0) {
        console.log(`Traitement de ${childAppointments.length} rendez-vous r\xE9currents li\xE9s au rendez-vous parent ${id}`);
        for (const childAppointment of childAppointments) {
          try {
            const childInvoiceResult = await pool.query(
              "SELECT id FROM invoices WHERE appointmentId = $1",
              [childAppointment.id]
            );
            if (childInvoiceResult.rows.length > 0) {
              let hasPayments = false;
              for (const row of childInvoiceResult.rows) {
                const paymentResult = await pool.query(
                  "SELECT id FROM therapist_payments WHERE invoiceId = $1",
                  [row.id]
                );
                if (paymentResult.rows.length > 0) {
                  hasPayments = true;
                  console.log(`Le rendez-vous enfant ${childAppointment.id} a des paiements associ\xE9s et ne peut pas \xEAtre supprim\xE9`);
                  break;
                }
              }
              if (hasPayments) {
                continue;
              }
              for (const row of childInvoiceResult.rows) {
                console.log(`Suppression de la facture ${row.id} li\xE9e au rendez-vous enfant ${childAppointment.id}`);
                await pool.query("DELETE FROM invoices WHERE id = $1", [row.id]);
              }
            }
            await pool.query("DELETE FROM appointments WHERE id = $1", [childAppointment.id]);
          } catch (err) {
            console.error(`Erreur lors de la suppression du rendez-vous enfant ${childAppointment.id}:`, err);
          }
        }
      }
      const finalInvoiceResult = await pool.query("SELECT id FROM invoices WHERE appointmentId = $1", [id]);
      if (finalInvoiceResult.rows.length > 0) {
        for (const row of finalInvoiceResult.rows) {
          const paymentCheckResult = await pool.query(
            "SELECT id FROM therapist_payments WHERE invoiceId = $1",
            [row.id]
          );
          if (paymentCheckResult.rows.length > 0) {
            return {
              success: false,
              message: "Ce rendez-vous ne peut pas \xEAtre supprim\xE9 car il a d\xE9j\xE0 \xE9t\xE9 r\xE9gl\xE9 au th\xE9rapeute"
            };
          }
          console.log(`Suppression de la facture ${row.id} li\xE9e au rendez-vous ${id}`);
          await pool.query("DELETE FROM invoices WHERE id = $1", [row.id]);
        }
      }
      const result = await pool.query("DELETE FROM appointments WHERE id = $1 RETURNING id", [id]);
      return { success: result.rows.length > 0 };
    } catch (error) {
      console.error("Erreur lors de la suppression du rendez-vous:", error);
      if (error.code === "23503" && error.constraint === "therapist_payments_invoiceid_fkey") {
        return {
          success: false,
          message: "Ce rendez-vous ne peut pas \xEAtre supprim\xE9 car il a d\xE9j\xE0 \xE9t\xE9 r\xE9gl\xE9 au th\xE9rapeute"
        };
      }
      throw error;
    }
  }
  async checkAvailability(therapistId, date, time) {
    const conflictResult = await pool.query(
      `SELECT a.id, a.patientId, CONCAT(p.firstName, ' ', p.lastName) as patientName
       FROM appointments a
       JOIN patients p ON a.patientId = p.id
       WHERE a.therapistId = $1 AND a.date = $2 AND a.time = $3`,
      [therapistId, date, time]
    );
    if (conflictResult.rows.length === 0) {
      return { available: true };
    }
    const conflict = conflictResult.rows[0];
    return {
      available: false,
      conflictInfo: {
        patientName: conflict.patientname,
        // en minuscules car PostgreSQL normalise les noms de colonnes
        patientId: conflict.patientid
      }
    };
  }
  // Méthodes pour les factures
  async getInvoices() {
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
      return result.rows.map((row) => ({
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
        appointmentDate: row.appointmentdate || "N/A",
        appointmentTime: row.appointmenttime || "N/A"
      }));
    } catch (error) {
      console.error("Erreur lors de la r\xE9cup\xE9ration des factures:", error);
      return [];
    }
  }
  async getInvoice(id) {
    const result = await pool.query("SELECT * FROM invoices WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      return void 0;
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
  async getInvoicesForPatient(patientId) {
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
      return result.rows.map((row) => ({
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
        appointmentDate: row.appointmentdate || "N/A",
        appointmentTime: row.appointmenttime || "N/A"
      }));
    } catch (error) {
      console.error(`Erreur lors de la r\xE9cup\xE9ration des factures pour le patient ${patientId}:`, error);
      return [];
    }
  }
  async getInvoicesForTherapist(therapistId) {
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
      return result.rows.map((row) => ({
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
        appointmentDate: row.appointmentdate || "N/A",
        appointmentTime: row.appointmenttime || "N/A"
      }));
    } catch (error) {
      console.error(`Erreur lors de la r\xE9cup\xE9ration des factures pour le th\xE9rapeute ${therapistId}:`, error);
      return [];
    }
  }
  async createInvoice(insertInvoice) {
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
  async updateInvoice(id, invoiceUpdate) {
    const isBeingPaidUpdate = invoiceUpdate.status === "Pay\xE9e";
    const isAmountUpdate = invoiceUpdate.amount !== void 0 && invoiceUpdate.totalAmount !== void 0;
    const existingInvoice = await this.getInvoice(id);
    if (!existingInvoice) {
      return void 0;
    }
    if ((existingInvoice.status === "Pay\xE9e" || existingInvoice.status === "paid" || existingInvoice.status === "Paid") && !isAmountUpdate) {
      console.log(`Facture ${id} d\xE9j\xE0 pay\xE9e, pas de modification du statut`);
      delete invoiceUpdate.status;
    }
    let query = "UPDATE invoices SET ";
    const values = [];
    const updates = [];
    let paramIndex = 1;
    for (const [key, value] of Object.entries(invoiceUpdate)) {
      let columnName = key.toLowerCase();
      const columnMapping = {
        "invoicenumber": "invoicenumber",
        "patientid": "patientid",
        "therapistid": "therapistid",
        "appointmentid": "appointmentid",
        "amount": "amount",
        "taxrate": "taxrate",
        "totalamount": "totalamount",
        "status": "status",
        "issuedate": "issuedate",
        "duedate": "duedate",
        "paymentmethod": "paymentmethod",
        "notes": "notes"
      };
      if (key === "invoiceNumber") columnName = "invoicenumber";
      else if (key === "patientId") columnName = "patientid";
      else if (key === "therapistId") columnName = "therapistid";
      else if (key === "appointmentId") columnName = "appointmentid";
      else if (key === "taxRate") columnName = "taxrate";
      else if (key === "totalAmount") columnName = "totalamount";
      else if (key === "issueDate") columnName = "issuedate";
      else if (key === "dueDate") columnName = "duedate";
      else if (key === "paymentMethod") columnName = "paymentmethod";
      updates.push(`${columnName} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
    query += updates.join(", ");
    query += ` WHERE id = $${paramIndex} RETURNING *`;
    values.push(id);
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return void 0;
    }
    const row = result.rows[0];
    const updatedInvoice = {
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
    if (isBeingPaidUpdate && row.status === "Pay\xE9e") {
      console.log(`La facture #${row.invoicenumber} a \xE9t\xE9 marqu\xE9e comme pay\xE9e. Cr\xE9ation d'un paiement au th\xE9rapeute...`);
      await this.createPaymentFromInvoice(row.id);
    }
    return updatedInvoice;
  }
  async deleteInvoice(id) {
    const result = await pool.query("DELETE FROM invoices WHERE id = $1 RETURNING id", [id]);
    return result.rows.length > 0;
  }
  async getInvoiceForAppointment(appointmentId) {
    const result = await pool.query("SELECT * FROM invoices WHERE appointmentId = $1", [appointmentId]);
    if (result.rows.length === 0) {
      return void 0;
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
  async getExpenses() {
    const result = await pool.query("SELECT * FROM expenses ORDER BY date DESC");
    return result.rows.map((row) => ({
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
  async getExpense(id) {
    const result = await pool.query("SELECT * FROM expenses WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      return void 0;
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
  async createExpense(insertExpense) {
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
  async updateExpense(id, expenseUpdate) {
    const existingExpense = await this.getExpense(id);
    if (!existingExpense) {
      return void 0;
    }
    const updates = [];
    const values = [];
    let paramCount = 1;
    if ("description" in expenseUpdate) {
      updates.push(`description = $${paramCount++}`);
      values.push(expenseUpdate.description);
    }
    if ("amount" in expenseUpdate) {
      updates.push(`amount = $${paramCount++}`);
      values.push(expenseUpdate.amount);
    }
    if ("date" in expenseUpdate) {
      updates.push(`date = $${paramCount++}`);
      values.push(expenseUpdate.date);
    }
    if ("category" in expenseUpdate) {
      updates.push(`category = $${paramCount++}`);
      values.push(expenseUpdate.category);
    }
    if ("paymentMethod" in expenseUpdate) {
      updates.push(`paymentMethod = $${paramCount++}`);
      values.push(expenseUpdate.paymentMethod);
    }
    if ("notes" in expenseUpdate) {
      updates.push(`notes = $${paramCount++}`);
      values.push(expenseUpdate.notes);
    }
    if ("receiptUrl" in expenseUpdate) {
      updates.push(`receiptUrl = $${paramCount++}`);
      values.push(expenseUpdate.receiptUrl);
    }
    if (updates.length === 0) {
      return existingExpense;
    }
    values.push(id);
    const result = await pool.query(
      `UPDATE expenses SET ${updates.join(", ")} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    if (result.rows.length === 0) {
      return void 0;
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
  async deleteExpense(id) {
    const result = await pool.query("DELETE FROM expenses WHERE id = $1 RETURNING id", [id]);
    return result.rows.length > 0;
  }
  async getExpensesByCategory(category) {
    const result = await pool.query("SELECT * FROM expenses WHERE category = $1 ORDER BY date DESC", [category]);
    return result.rows.map((row) => ({
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
  async getExpensesByDateRange(startDate, endDate) {
    const result = await pool.query(
      "SELECT * FROM expenses WHERE date >= $1 AND date <= $2 ORDER BY date DESC",
      [startDate, endDate]
    );
    return result.rows.map((row) => ({
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
  async saveExpenseReceipt(id, fileUrl) {
    const result = await pool.query(
      "UPDATE expenses SET receiptUrl = $1 WHERE id = $2 RETURNING *",
      [fileUrl, id]
    );
    if (result.rows.length === 0) {
      return void 0;
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
  async getTherapistPayments() {
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
    return result.rows.map((row) => ({
      id: row.id,
      therapistId: row.therapistid,
      invoiceId: row.invoiceid,
      amount: row.amount.toString(),
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
  async getTherapistPayment(id) {
    const result = await pool.query("SELECT * FROM therapist_payments WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      return void 0;
    }
    const row = result.rows[0];
    return {
      id: row.id,
      therapistId: row.therapistid,
      invoiceId: row.invoiceid,
      amount: Number(row.amount),
      paymentDate: row.paymentdate,
      paymentMethod: row.paymentmethod,
      paymentReference: row.paymentreference,
      notes: row.notes,
      createdAt: row.created_at
    };
  }
  async getTherapistPaymentsForTherapist(therapistId) {
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
    return result.rows.map((row) => ({
      id: row.id,
      therapistId: row.therapistid,
      invoiceId: row.invoiceid,
      amount: Number(row.amount),
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
  async createTherapistPayment(payment) {
    const result = await pool.query(
      `INSERT INTO therapist_payments (
        therapistId, invoiceId, amount, paymentDate, paymentMethod, paymentReference, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        payment.therapistId,
        payment.invoiceId,
        String(payment.amount),
        // Conversion explicite en string pour PostgreSQL
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
      amount: Number(row.amount),
      paymentDate: row.paymentdate,
      paymentMethod: row.paymentmethod,
      paymentReference: row.paymentreference,
      notes: row.notes,
      createdAt: row.created_at
    };
  }
  async updateTherapistPayment(id, paymentUpdate) {
    const updates = [];
    const values = [];
    let paramIndex = 1;
    if (paymentUpdate.therapistId !== void 0) {
      updates.push(`therapistId = $${paramIndex++}`);
      values.push(paymentUpdate.therapistId);
    }
    if (paymentUpdate.invoiceId !== void 0) {
      updates.push(`invoiceId = $${paramIndex++}`);
      values.push(paymentUpdate.invoiceId);
    }
    if (paymentUpdate.amount !== void 0) {
      updates.push(`amount = $${paramIndex++}`);
      values.push(String(paymentUpdate.amount));
    }
    if (paymentUpdate.paymentDate !== void 0) {
      updates.push(`paymentDate = $${paramIndex++}`);
      values.push(paymentUpdate.paymentDate);
    }
    if (paymentUpdate.paymentMethod !== void 0) {
      updates.push(`paymentMethod = $${paramIndex++}`);
      values.push(paymentUpdate.paymentMethod);
    }
    if (paymentUpdate.paymentReference !== void 0) {
      updates.push(`paymentReference = $${paramIndex++}`);
      values.push(paymentUpdate.paymentReference);
    }
    if (paymentUpdate.notes !== void 0) {
      updates.push(`notes = $${paramIndex++}`);
      values.push(paymentUpdate.notes);
    }
    if (updates.length === 0) {
      return this.getTherapistPayment(id);
    }
    values.push(id);
    const updateQuery = `
      UPDATE therapist_payments 
      SET ${updates.join(", ")} 
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    const result = await pool.query(updateQuery, values);
    if (result.rows.length === 0) {
      return void 0;
    }
    const row = result.rows[0];
    return {
      id: row.id,
      therapistId: row.therapistid,
      invoiceId: row.invoiceid,
      amount: Number(row.amount),
      paymentDate: row.paymentdate,
      paymentMethod: row.paymentmethod,
      paymentReference: row.paymentreference,
      notes: row.notes,
      createdAt: row.created_at
    };
  }
  async deleteTherapistPayment(id) {
    const result = await pool.query("DELETE FROM therapist_payments WHERE id = $1 RETURNING id", [id]);
    return result.rows.length > 0;
  }
  async getTherapistPaymentsByDateRange(startDate, endDate) {
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
    return result.rows.map((row) => ({
      id: row.id,
      therapistId: row.therapistid,
      invoiceId: row.invoiceid,
      amount: Number(row.amount),
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
  async createPaymentFromInvoice(invoiceId) {
    const invoiceResult = await pool.query("SELECT * FROM invoices WHERE id = $1", [invoiceId]);
    if (invoiceResult.rows.length === 0) {
      return void 0;
    }
    const invoice = invoiceResult.rows[0];
    if (invoice.status !== "Pay\xE9e") {
      return void 0;
    }
    const existingPaymentResult = await pool.query(
      "SELECT * FROM therapist_payments WHERE invoiceId = $1",
      [invoiceId]
    );
    if (existingPaymentResult.rows.length > 0) {
      const row = existingPaymentResult.rows[0];
      return {
        id: row.id,
        therapistId: row.therapistid,
        invoiceId: row.invoiceid,
        amount: Number(row.amount),
        paymentDate: row.paymentdate,
        paymentMethod: row.paymentmethod,
        paymentReference: row.paymentreference,
        notes: row.notes,
        createdAt: row.created_at
      };
    }
    const today = /* @__PURE__ */ new Date();
    const formattedToday = format(today, "yyyy-MM-dd");
    const invoiceAmount = invoice.amount ? parseFloat(String(invoice.amount)) : 0;
    const insertPayment = {
      therapistId: invoice.therapistid,
      invoiceId: invoice.id,
      amount: invoiceAmount,
      // Montant déjà converti en nombre
      paymentDate: formattedToday,
      paymentMethod: invoice.paymentmethod || "Virement bancaire",
      notes: `Paiement automatique pour la facture ${invoice.invoicenumber}`
    };
    return this.createTherapistPayment(insertPayment);
  }
  // Méthodes pour la signature administrative (Christian)
  async getSignatures() {
    try {
      const tableExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'admin_signature'
        );
      `);
      if (!tableExists.rows[0].exists) {
        await pool.query(`
          CREATE TABLE admin_signature (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL DEFAULT 'Christian',
            signature_data TEXT NOT NULL,
            paid_stamp_data TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
          );
        `);
        return [];
      }
      const result = await pool.query(`
        SELECT * FROM admin_signature 
        ORDER BY id
      `);
      return result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        signatureData: row.signature_data,
        paidStampData: row.paid_stamp_data || null,
        permanentStampData: row.permanent_stamp_data || null,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (error) {
      console.error("Erreur lors de la r\xE9cup\xE9ration des signatures:", error);
      return [];
    }
  }
  async getSignature(id) {
    try {
      const result = await pool.query("SELECT * FROM admin_signature WHERE id = $1", [id]);
      if (result.rows.length === 0) {
        return void 0;
      }
      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        signatureData: row.signature_data,
        paidStampData: row.paid_stamp_data || null,
        permanentStampData: row.permanent_stamp_data || null,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } catch (error) {
      console.error("Erreur lors de la r\xE9cup\xE9ration de la signature:", error);
      return void 0;
    }
  }
  // On garde cette méthode pour la compatibilité mais elle n'est plus utilisée
  async getSignatureForTherapist(therapistId) {
    const signatures2 = await this.getSignatures();
    return signatures2.length > 0 ? signatures2[0] : void 0;
  }
  async createSignature(signature) {
    try {
      await this.getSignatures();
      const now = /* @__PURE__ */ new Date();
      const result = await pool.query(
        "INSERT INTO admin_signature (name, signature_data, paid_stamp_data, permanent_stamp_data, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
        [signature.name || "Christian", signature.signatureData, signature.paidStampData || null, signature.permanentStampData || null, now, now]
      );
      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        signatureData: row.signature_data,
        paidStampData: row.paid_stamp_data || null,
        permanentStampData: row.permanent_stamp_data || null,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } catch (error) {
      console.error("Erreur lors de la cr\xE9ation de la signature:", error);
      throw error;
    }
  }
  async updateSignature(id, signature) {
    try {
      const now = /* @__PURE__ */ new Date();
      const result = await pool.query(
        "UPDATE admin_signature SET name = $1, signature_data = $2, paid_stamp_data = $3, permanent_stamp_data = $4, updated_at = $5 WHERE id = $6 RETURNING *",
        [signature.name || "Christian", signature.signatureData, signature.paidStampData || null, signature.permanentStampData || null, now, id]
      );
      if (result.rows.length === 0) {
        throw new Error("Signature non trouv\xE9e");
      }
      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        signatureData: row.signature_data,
        paidStampData: row.paid_stamp_data || null,
        permanentStampData: row.permanent_stamp_data || null,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } catch (error) {
      console.error("Erreur lors de la mise \xE0 jour de la signature:", error);
      throw error;
    }
  }
  async deleteSignature(id) {
    try {
      const result = await pool.query("DELETE FROM admin_signature WHERE id = $1 RETURNING id", [id]);
      return result.rows.length > 0;
    } catch (error) {
      console.error("Erreur lors de la suppression de la signature:", error);
      return false;
    }
  }
};
var pgStorage = new PgStorage();

// server/storage.ts
var storage = pgStorage;

// server/db.ts
import { Pool as Pool2, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  UserRole: () => UserRole,
  appointmentFormSchema: () => appointmentFormSchema,
  appointments: () => appointments,
  expenseFormSchema: () => expenseFormSchema,
  expenses: () => expenses,
  insertAppointmentSchema: () => insertAppointmentSchema,
  insertExpenseSchema: () => insertExpenseSchema,
  insertInvoiceSchema: () => insertInvoiceSchema,
  insertInvoiceTemplateSchema: () => insertInvoiceTemplateSchema,
  insertPatientSchema: () => insertPatientSchema,
  insertSignatureSchema: () => insertSignatureSchema,
  insertTherapistPaymentSchema: () => insertTherapistPaymentSchema,
  insertTherapistSchema: () => insertTherapistSchema,
  insertUserSchema: () => insertUserSchema,
  invoiceTemplateFormSchema: () => invoiceTemplateFormSchema,
  invoiceTemplates: () => invoiceTemplates,
  invoices: () => invoices,
  patientFormSchema: () => patientFormSchema,
  patients: () => patients,
  signatures: () => signatures,
  therapistPaymentFormSchema: () => therapistPaymentFormSchema,
  therapistPayments: () => therapistPayments,
  therapists: () => therapists,
  userFormSchema: () => userFormSchema,
  users: () => users
});
import { pgTable, text, serial, integer, boolean, timestamp, numeric, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  birthDate: text("birth_date"),
  notes: text("notes")
});
var insertPatientSchema = createInsertSchema(patients).pick({
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  address: true,
  birthDate: true,
  notes: true
});
var therapists = pgTable("therapists", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  specialty: text("specialty"),
  email: text("email"),
  phone: text("phone"),
  color: text("color"),
  availableDays: text("available_days"),
  workHours: text("work_hours")
});
var insertTherapistSchema = createInsertSchema(therapists).pick({
  name: true,
  specialty: true,
  email: true,
  phone: true,
  color: true,
  availableDays: true,
  workHours: true
});
var appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  therapistId: integer("therapist_id").notNull(),
  date: text("date").notNull(),
  time: text("time").notNull(),
  duration: integer("duration"),
  type: text("type"),
  notes: text("notes"),
  status: text("status").notNull().default("confirmed"),
  isRecurring: boolean("is_recurring").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  recurringFrequency: text("recurring_frequency"),
  recurringCount: integer("recurring_count"),
  parentAppointmentId: integer("parent_appointment_id")
});
var insertAppointmentSchema = createInsertSchema(appointments).pick({
  patientId: true,
  therapistId: true,
  date: true,
  time: true,
  duration: true,
  type: true,
  notes: true,
  status: true,
  isRecurring: true,
  recurringFrequency: true,
  recurringCount: true,
  parentAppointmentId: true
});
var patientFormSchema = insertPatientSchema.extend({
  firstName: z.string().min(2, "Le pr\xE9nom doit contenir au moins 2 caract\xE8res"),
  lastName: z.string().min(2, "Le nom doit contenir au moins 2 caract\xE8res"),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  phone: z.string().min(8, "Num\xE9ro de t\xE9l\xE9phone invalide").optional().or(z.literal(""))
});
var appointmentFormSchema = insertAppointmentSchema.extend({
  date: z.string().min(1, "La date est requise"),
  time: z.string().min(1, "L'heure est requise")
});
var invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull(),
  patientId: integer("patient_id").notNull(),
  therapistId: integer("therapist_id").notNull(),
  appointmentId: integer("appointment_id").notNull(),
  amount: numeric("amount").notNull(),
  taxRate: numeric("tax_rate").notNull().default("0"),
  totalAmount: numeric("total_amount").notNull(),
  status: text("status").notNull().default("pending"),
  issueDate: text("issue_date").notNull(),
  dueDate: text("due_date").notNull(),
  paymentMethod: text("payment_method"),
  notes: text("notes"),
  templateId: integer("template_id"),
  signatureUrl: text("signature_url")
});
var insertInvoiceSchema = createInsertSchema(invoices).pick({
  invoiceNumber: true,
  patientId: true,
  therapistId: true,
  appointmentId: true,
  amount: true,
  taxRate: true,
  totalAmount: true,
  status: true,
  issueDate: true,
  dueDate: true,
  paymentMethod: true,
  notes: true
});
var expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  date: text("date").notNull(),
  // Format YYYY-MM-DD
  category: text("category").notNull(),
  paymentMethod: text("payment_method").notNull(),
  notes: text("notes"),
  receiptUrl: text("receipt_url"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var therapistPayments = pgTable("therapist_payments", {
  id: serial("id").primaryKey(),
  therapistId: integer("therapist_id").notNull().references(() => therapists.id),
  invoiceId: integer("invoice_id").notNull().references(() => invoices.id),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  paymentDate: text("payment_date").notNull(),
  // Format YYYY-MM-DD
  paymentMethod: text("payment_method").notNull(),
  paymentReference: text("payment_reference"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var insertExpenseSchema = createInsertSchema(expenses).pick({
  description: true,
  amount: true,
  date: true,
  category: true,
  paymentMethod: true,
  notes: true,
  receiptUrl: true
});
var baseTherapistPaymentSchema = createInsertSchema(therapistPayments).pick({
  therapistId: true,
  invoiceId: true,
  amount: true,
  paymentDate: true,
  paymentMethod: true,
  paymentReference: true,
  notes: true
});
var insertTherapistPaymentSchema = baseTherapistPaymentSchema.extend({
  amount: z.coerce.number()
});
var expenseFormSchema = insertExpenseSchema.extend({
  description: z.string().min(3, "La description doit contenir au moins 3 caract\xE8res"),
  amount: z.coerce.number().positive("Le montant doit \xEAtre positif"),
  date: z.string().min(1, "La date est requise"),
  category: z.string().min(1, "La cat\xE9gorie est requise"),
  paymentMethod: z.string().min(1, "Le mode de paiement est requis")
});
var therapistPaymentFormSchema = insertTherapistPaymentSchema.extend({
  amount: z.coerce.number().positive("Le montant doit \xEAtre positif"),
  paymentDate: z.string().min(1, "La date de paiement est requise"),
  paymentMethod: z.string().min(1, "Le mode de paiement est requis")
});
var signatures = pgTable("admin_signature", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().default("Christian"),
  signatureData: text("signature_data").notNull(),
  paidStampData: text("paid_stamp_data"),
  // Tampon PAYÉ (optionnel)
  permanentStampData: text("permanent_stamp_data"),
  // Tampon permanent du cabinet (optionnel)
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
var insertSignatureSchema = createInsertSchema(signatures).pick({
  name: true,
  signatureData: true,
  paidStampData: true,
  permanentStampData: true
});
var UserRole = {
  ADMIN: "admin",
  SECRETARIAT: "secretariat",
  THERAPIST: "therapist"
};
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull().default(UserRole.SECRETARIAT),
  // Pour éviter les problèmes de type null/undefined avec therapistId
  therapistId: integer("therapist_id"),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  isActive: boolean("is_active").notNull().default(true)
});
var insertUserSchema = z.object({
  username: z.string().min(3, "Le nom d'utilisateur doit contenir au moins 3 caract\xE8res"),
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caract\xE8res"),
  confirmPassword: z.string(),
  role: z.enum([UserRole.ADMIN, UserRole.SECRETARIAT, UserRole.THERAPIST], {
    errorMap: () => ({ message: "R\xF4le invalide" })
  }).default(UserRole.SECRETARIAT),
  therapistId: z.number().optional(),
  isActive: z.boolean().default(true)
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"]
});
var userFormSchema = insertUserSchema;
var invoiceTemplates = pgTable("invoice_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  headerContent: text("header_content").notNull(),
  footerContent: text("footer_content").notNull(),
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color").notNull().default("#4f46e5"),
  secondaryColor: text("secondary_color").notNull().default("#6366f1"),
  fontFamily: text("font_family").notNull().default("Arial, sans-serif"),
  showTherapistSignature: boolean("show_therapist_signature").notNull().default(true),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
var insertInvoiceTemplateSchema = createInsertSchema(invoiceTemplates).pick({
  name: true,
  description: true,
  headerContent: true,
  footerContent: true,
  logoUrl: true,
  primaryColor: true,
  secondaryColor: true,
  fontFamily: true,
  showTherapistSignature: true,
  isDefault: true
});
var invoiceTemplateFormSchema = insertInvoiceTemplateSchema.extend({
  name: z.string().min(3, { message: "Le nom doit contenir au moins 3 caract\xE8res" }),
  headerContent: z.string().min(1, { message: "Le contenu de l'en-t\xEAte est requis" }),
  footerContent: z.string().min(1, { message: "Le contenu du pied de page est requis" })
});

// server/db.ts
neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool2 = new Pool2({ connectionString: process.env.DATABASE_URL });
var db = drizzle({ client: pool2, schema: schema_exports });

// server/routes.ts
import multer from "multer";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

// server/pdfGenerator.ts
import PDFDocument from "pdfkit";
import { PassThrough } from "stream";
import { format as format3 } from "date-fns";
import { fr } from "date-fns/locale";
var formatDate = (dateString) => {
  try {
    return format3(new Date(dateString), "dd MMMM yyyy", { locale: fr });
  } catch (err) {
    return dateString;
  }
};
var formatCurrency = (amount) => {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(numAmount);
};
async function generateTherapistPaymentsPDF(payments, title = "RELEV\xC9 DES PAIEMENTS AUX TH\xC9RAPEUTES", subtitle = "Document pour la comptabilit\xE9", startDate, endDate) {
  const doc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true });
  const stream = new PassThrough();
  doc.pipe(stream);
  doc.fontSize(18).text(title, { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(14).text(subtitle, { align: "center" });
  doc.moveDown();
  const today = format3(/* @__PURE__ */ new Date(), "dd MMMM yyyy", { locale: fr });
  doc.fontSize(10).text(`Document g\xE9n\xE9r\xE9 le ${today}`, { align: "right" });
  if (startDate && endDate) {
    doc.moveDown(0.5);
    doc.fontSize(12).text(`P\xE9riode: du ${formatDate(startDate)} au ${formatDate(endDate)}`, { align: "center" });
  }
  doc.moveDown();
  const totalAmount = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  doc.rect(50, doc.y, 495, 50).fillAndStroke("#f3f4f6", "#e5e7eb");
  doc.fillColor("#000");
  doc.fontSize(12).text("Montant total des paiements:", 70, doc.y - 40);
  doc.fontSize(16).text(formatCurrency(totalAmount), 350, doc.y - 40, { align: "right" });
  doc.moveDown(2.5);
  const startY = doc.y;
  const colWidths = [110, 140, 120, 120];
  const colPositions = [
    50,
    // Thérapeute
    50 + colWidths[0],
    // Facture/Patient
    50 + colWidths[0] + colWidths[1],
    // Date de paiement
    50 + colWidths[0] + colWidths[1] + colWidths[2]
    // Montant
  ];
  const rowHeight = 30;
  doc.font("Helvetica-Bold").fontSize(12);
  doc.text("Th\xE9rapeute", colPositions[0], startY, { width: colWidths[0] });
  doc.text("Facture / Patient", colPositions[1], startY, { width: colWidths[1] });
  doc.text("Date de paiement", colPositions[2], startY, { width: colWidths[2] });
  doc.text("Montant", colPositions[3], startY, { width: colWidths[3], align: "right" });
  doc.moveTo(50, startY + 20).lineTo(545, startY + 20).stroke();
  let currentY = startY + 25;
  const itemsPerPage = 20;
  let itemCount = 0;
  let pageCount = 1;
  const addPage = () => {
    doc.addPage();
    pageCount++;
    currentY = 50;
    doc.fontSize(14).text("RELEV\xC9 DES PAIEMENTS (suite)", { align: "center" });
    doc.moveDown();
    doc.font("Helvetica-Bold").fontSize(12);
    doc.text("Th\xE9rapeute", colPositions[0], currentY, { width: colWidths[0] });
    doc.text("Facture / Patient", colPositions[1], currentY, { width: colWidths[1] });
    doc.text("Date de paiement", colPositions[2], currentY, { width: colWidths[2] });
    doc.text("Montant", colPositions[3], currentY, { width: colWidths[3], align: "right" });
    doc.moveTo(50, currentY + 20).lineTo(545, currentY + 20).stroke();
    currentY += 25;
  };
  doc.font("Helvetica").fontSize(10);
  payments.forEach((payment, index) => {
    if (itemCount >= itemsPerPage) {
      addPage();
      itemCount = 0;
    }
    if (index % 2 === 0) {
      doc.rect(50, currentY - 5, 495, rowHeight).fill("#f9fafb");
      doc.fillColor("#000");
    }
    doc.text(payment.therapistName, colPositions[0], currentY, { width: colWidths[0] });
    const invoiceAndPatient = `N\xB0 ${payment.invoiceNumber}
${payment.patientName}`;
    doc.text(invoiceAndPatient, colPositions[1], currentY, { width: colWidths[1] });
    doc.text(formatDate(payment.paymentDate), colPositions[2], currentY, { width: colWidths[2] });
    doc.text(formatCurrency(payment.amount), colPositions[3], currentY, { width: colWidths[3], align: "right" });
    currentY += rowHeight;
    itemCount++;
  });
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    doc.fontSize(8).text(
      `Page ${i + 1} sur ${pages.count}`,
      50,
      doc.page.height - 50,
      { align: "center" }
    );
  }
  doc.fontSize(10).text(
    "Document g\xE9n\xE9r\xE9 automatiquement par le syst\xE8me de gestion du Cabinet Param\xE9dical de la Renaissance.",
    50,
    doc.page.height - 30,
    { align: "center" }
  );
  doc.end();
  return stream;
}
async function generateExpensesPDF(expenses2, title = "REGISTRE DES D\xC9PENSES", subtitle = "Document pour la comptabilit\xE9", startDate, endDate) {
  const doc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true });
  const stream = new PassThrough();
  doc.pipe(stream);
  doc.fontSize(18).text(title, { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(14).text(subtitle, { align: "center" });
  doc.moveDown();
  const today = format3(/* @__PURE__ */ new Date(), "dd MMMM yyyy", { locale: fr });
  doc.fontSize(10).text(`Document g\xE9n\xE9r\xE9 le ${today}`, { align: "right" });
  if (startDate && endDate) {
    doc.moveDown(0.5);
    doc.fontSize(12).text(`P\xE9riode: du ${formatDate(startDate)} au ${formatDate(endDate)}`, { align: "center" });
  }
  doc.moveDown();
  const totalAmount = expenses2.reduce((sum, expense) => sum + Number(expense.amount), 0);
  doc.rect(50, doc.y, 495, 50).fillAndStroke("#f3f4f6", "#e5e7eb");
  doc.fillColor("#000");
  doc.fontSize(12).text("Montant total des d\xE9penses:", 70, doc.y - 40);
  doc.fontSize(16).text(formatCurrency(totalAmount), 350, doc.y - 40, { align: "right" });
  doc.moveDown(2.5);
  const startY = doc.y;
  const colWidths = [150, 100, 90, 100];
  const colPositions = [
    50,
    // Description
    50 + colWidths[0],
    // Catégorie
    50 + colWidths[0] + colWidths[1],
    // Date
    50 + colWidths[0] + colWidths[1] + colWidths[2]
    // Montant
  ];
  const rowHeight = 30;
  doc.font("Helvetica-Bold").fontSize(12);
  doc.text("Description", colPositions[0], startY, { width: colWidths[0] });
  doc.text("Cat\xE9gorie", colPositions[1], startY, { width: colWidths[1] });
  doc.text("Date", colPositions[2], startY, { width: colWidths[2] });
  doc.text("Montant", colPositions[3], startY, { width: colWidths[3], align: "right" });
  doc.moveTo(50, startY + 20).lineTo(545, startY + 20).stroke();
  let currentY = startY + 25;
  const itemsPerPage = 20;
  let itemCount = 0;
  let pageCount = 1;
  const addPage = () => {
    doc.addPage();
    pageCount++;
    currentY = 50;
    doc.fontSize(14).text("REGISTRE DES D\xC9PENSES (suite)", { align: "center" });
    doc.moveDown();
    doc.font("Helvetica-Bold").fontSize(12);
    doc.text("Description", colPositions[0], currentY, { width: colWidths[0] });
    doc.text("Cat\xE9gorie", colPositions[1], currentY, { width: colWidths[1] });
    doc.text("Date", colPositions[2], currentY, { width: colWidths[2] });
    doc.text("Montant", colPositions[3], currentY, { width: colWidths[3], align: "right" });
    doc.moveTo(50, currentY + 20).lineTo(545, currentY + 20).stroke();
    currentY += 25;
  };
  doc.font("Helvetica").fontSize(10);
  expenses2.forEach((expense, index) => {
    if (itemCount >= itemsPerPage) {
      addPage();
      itemCount = 0;
    }
    if (index % 2 === 0) {
      doc.rect(50, currentY - 5, 495, rowHeight).fill("#f9fafb");
      doc.fillColor("#000");
    }
    doc.text(expense.description, colPositions[0], currentY, { width: colWidths[0] });
    doc.text(expense.category, colPositions[1], currentY, { width: colWidths[1] });
    doc.text(formatDate(expense.date), colPositions[2], currentY, { width: colWidths[2] });
    doc.text(formatCurrency(expense.amount), colPositions[3], currentY, { width: colWidths[3], align: "right" });
    currentY += rowHeight;
    itemCount++;
  });
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    doc.fontSize(8).text(
      `Page ${i + 1} sur ${pages.count}`,
      50,
      doc.page.height - 50,
      { align: "center" }
    );
  }
  doc.fontSize(10).text(
    "Document g\xE9n\xE9r\xE9 automatiquement par le syst\xE8me de gestion du Cabinet Param\xE9dical de la Renaissance.",
    50,
    doc.page.height - 30,
    { align: "center" }
  );
  doc.end();
  return stream;
}

// server/cprInvoiceTemplate.ts
import PDFDocument2 from "pdfkit";
import { PassThrough as PassThrough2 } from "stream";
import { format as format4 } from "date-fns";
import { fr as fr2 } from "date-fns/locale";
var formatDate2 = (dateString) => {
  try {
    return format4(new Date(dateString), "dd MMMM yyyy", { locale: fr2 });
  } catch (err) {
    return dateString;
  }
};
var formatCurrency2 = (amount) => {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(numAmount);
};
function formatInvoiceStatus(status) {
  switch (status.toLowerCase()) {
    case "paid":
    case "pay\xE9e":
      return "Pay\xE9e";
    case "cancelled":
    case "annul\xE9e":
      return "Annul\xE9e";
    case "pending":
    case "en attente":
    default:
      return "En attente";
  }
}
function generateInvoicePDF(invoice, adminSignature) {
  const doc = new PDFDocument2({
    size: "A4",
    margin: 50,
    bufferPages: true,
    info: {
      Title: `Facture ${invoice.invoiceNumber}`,
      Author: "Cabinet Param\xE9dical de la Renaissance",
      Subject: `Facture pour ${invoice.patientName}`,
      Keywords: "facture, sant\xE9, soins"
    }
  });
  const stream = new PassThrough2();
  doc.pipe(stream);
  const pageWidth = doc.page.width - 100;
  const primaryColor = "#3fb549";
  const darkGreen = "#266d2c";
  const headerGreen = "#266d2c";
  doc.rect(0, 0, doc.page.width, 110).fill(headerGreen);
  doc.font("Helvetica").fontSize(10).fillColor("white");
  doc.text("Mail: contact@cabinet-renaissance.com", 50, 20);
  doc.text("T\xE9l: +221 33 824 35 50", 50, 35);
  doc.text("Immeuble SAWA", 50, 50);
  doc.text("Bloc B - \xC9tage 2", 50, 65);
  doc.text("1763 Avenue Cheikh A. DIOP", 50, 80);
  doc.text("DAKAR", 50, 95);
  try {
    doc.image("public/logos/renaissance-logo-rev.jpg", doc.page.width - 180, 10, {
      width: 100,
      // Taille réduite
      align: "right"
    });
  } catch (error) {
    console.error("Erreur lors du chargement du logo:", error);
    doc.fontSize(18).fillColor("white");
    doc.text("La Renaissance", doc.page.width - 200, 40);
    doc.fontSize(10);
    doc.text("CABINET PARAM\xC9DICAL", doc.page.width - 200, 65);
  }
  doc.fillColor("black");
  doc.moveDown(4);
  doc.fontSize(14).font("Helvetica-Bold").text(`FACTURE N\xB0 ${invoice.invoiceNumber}`, { align: "center" });
  doc.moveDown(1);
  doc.fontSize(12).fillColor(primaryColor).font("Helvetica-Bold").text("STATUT:", 50, 150);
  doc.fillColor("black").font("Helvetica").text(formatInvoiceStatus(invoice.status), 120, 150);
  doc.fillColor(primaryColor).font("Helvetica-Bold").text("Date d'\xE9mission:", 50, 170);
  doc.fillColor("black").font("Helvetica").text(formatDate2(invoice.issueDate), 150, 170);
  doc.fontSize(12).font("Helvetica-Bold").text("THERAPEUTE", 50, 210);
  doc.fontSize(10).font("Helvetica").text(invoice.therapistName, 50, 230);
  doc.fontSize(12).font("Helvetica-Bold").text("PATIENT(E)", 400, 210);
  doc.fontSize(10).font("Helvetica").text(invoice.patientName, 400, 230);
  doc.moveDown(4);
  doc.fontSize(10).font("Helvetica-Bold").text("OBJET:", 50, 270);
  doc.font("Helvetica").text(
    "Facture relative aux prestations param\xE9dicales r\xE9alis\xE9es par le Cabinet Param\xE9dical de la Renaissance pour la p\xE9riode concern\xE9e.Nous restons \xE0 votre disposition pour toute information compl\xE9mentaire.",
    50,
    290,
    { width: pageWidth }
  );
  doc.text(
    "",
    50,
    320,
    { width: pageWidth }
  );
  doc.moveTo(50, 350).lineTo(doc.page.width - 50, 350).stroke();
  doc.fontSize(12).font("Helvetica-Bold").text("DATE(S) OU PERIODE CONCERNEE", { align: "center" });
  doc.moveDown(1.5);
  let dates = [];
  let isMultipleAppointments = false;
  if (invoice.appointmentDates && invoice.appointmentDates.length > 0) {
    dates = [...invoice.appointmentDates].map((dateTime) => {
      if (dateTime.includes(" \xE0 ")) {
        return dateTime.split(" \xE0 ")[0];
      }
      return dateTime;
    });
    isMultipleAppointments = dates.length > 1;
  } else {
    dates.push(formatDate2(invoice.appointmentDate));
    isMultipleAppointments = false;
  }
  try {
    dates.sort((a, b) => {
      const aDatePart = a.split(" \xE0 ")[0];
      const bDatePart = b.split(" \xE0 ")[0];
      const parseDate = (dateStr) => {
        const months = {
          "janvier": 0,
          "f\xE9vrier": 1,
          "mars": 2,
          "avril": 3,
          "mai": 4,
          "juin": 5,
          "juillet": 6,
          "ao\xFBt": 7,
          "septembre": 8,
          "octobre": 9,
          "novembre": 10,
          "d\xE9cembre": 11
        };
        const parts = dateStr.split(" ");
        if (parts.length === 3) {
          const day = parseInt(parts[0]);
          const month = months[parts[1]];
          const year = parseInt(parts[2]);
          if (!isNaN(day) && month !== void 0 && !isNaN(year)) {
            return new Date(year, month, day);
          }
        }
        return /* @__PURE__ */ new Date(0);
      };
      const dateA = parseDate(aDatePart);
      const dateB = parseDate(bDatePart);
      return dateA.getTime() - dateB.getTime();
    });
  } catch (e) {
    console.error("Erreur lors du tri des dates:", e);
  }
  if (isMultipleAppointments) {
    doc.fontSize(12).font("Helvetica-Bold").text(`S\xC9ANCES MULTIPLES (${dates.length})`, { align: "center" });
    doc.moveDown(1.5);
    const datesPerColumn = Math.ceil(dates.length / 2);
    const col1Dates = dates.slice(0, datesPerColumn);
    const col2Dates = dates.slice(datesPerColumn);
    const col1X = 100;
    const col2X = 370;
    let currentY = doc.y;
    const fontSize = 10;
    const lineSpacing = 20;
    const maxLines = Math.max(col1Dates.length, col2Dates.length);
    for (let i = 0; i < maxLines; i++) {
      if (i < col1Dates.length) {
        doc.fontSize(fontSize).font("Helvetica").text(`\u2022 ${col1Dates[i]}`, col1X, currentY, { width: 240 });
      }
      if (i < col2Dates.length) {
        doc.fontSize(fontSize).font("Helvetica").text(`\u2022 ${col2Dates[i]}`, col2X, currentY, { width: 240 });
      }
      currentY += lineSpacing;
    }
    doc.y = currentY + 10;
  } else {
    doc.fontSize(9).font("Helvetica").text(formatDate2(invoice.appointmentDate), { align: "center" });
  }
  doc.moveDown(1);
  const lineY = doc.y + 5;
  doc.moveTo(50, lineY).lineTo(doc.page.width - 50, lineY).stroke();
  doc.moveDown(2);
  doc.fontSize(10).font("Helvetica-Bold");
  doc.text("NATURE DES ACTES", 70, doc.y);
  doc.text("NOMBRE D'ACTES", 300, doc.y - 12);
  doc.text("TARIF UNITAIRE", 450, doc.y - 12);
  doc.moveDown(0.5);
  const headerLineY = doc.y + 5;
  doc.moveTo(50, headerLineY).lineTo(doc.page.width - 50, headerLineY).stroke();
  doc.moveDown(1.2);
  doc.fontSize(10).font("Helvetica");
  let descriptionText = "S\xE9ance d'orthophonie";
  let sessionCount = "1";
  if (isMultipleAppointments) {
    descriptionText = "S\xE9ances d'orthophonie";
    sessionCount = dates.length.toString();
  }
  doc.text(descriptionText, 70, doc.y);
  doc.text(sessionCount, 340, doc.y - 12);
  doc.text(formatCurrency2(50), 460, doc.y - 12);
  doc.moveDown(1.5);
  const notesLineY = doc.y + 5;
  doc.moveTo(50, notesLineY).lineTo(doc.page.width - 50, notesLineY).stroke();
  if (invoice.notes) {
    doc.moveDown(0.8);
    let displayNotes = invoice.notes;
    doc.fontSize(10).font("Helvetica-Bold").text("NOTE(S):", 70);
    doc.fontSize(9).font("Helvetica").text(displayNotes, 70, doc.y + 5, { width: pageWidth - 140 });
  } else {
    doc.moveDown(0.8);
  }
  doc.moveDown(0.3);
  const totalLineY = doc.y + 5;
  doc.moveTo(50, totalLineY).lineTo(doc.page.width - 50, totalLineY).stroke();
  doc.moveDown(0.5);
  doc.fontSize(11).font("Helvetica-Bold").fillColor(primaryColor).text("TOTAL:", 70);
  doc.fillColor("black").text(formatCurrency2(invoice.totalAmount), 130, doc.y - 12);
  const hasManyDates = dates.length > 8;
  doc.moveDown(hasManyDates ? 0.7 : 1);
  doc.fontSize(9).font("Helvetica-Bold").fillColor(primaryColor).text("ATTENTION:", 70);
  doc.fillColor("black").font("Helvetica").text("\u2022 Tout rendez-vous non annul\xE9 ou annul\xE9 moins de 24h \xE0 l'avance est d\xFB.", 90, doc.y + 5);
  doc.moveDown(0.5);
  doc.text("\u2022 Apr\xE8s trois paiements non r\xE9alis\xE9s ou en retard, le cabinet se r\xE9serve le droit d'interrompre le suivi.", 90);
  doc.moveDown(0.5);
  doc.text("Merci de votre compr\xE9hension", { align: "center" });
  if (adminSignature?.signatureData) {
    doc.image(
      Buffer.from(adminSignature.signatureData.replace(/^data:image\/\w+;base64,/, ""), "base64"),
      doc.page.width - 170,
      doc.y + 10,
      { width: 100 }
    );
    if (invoice.status.toLowerCase() === "pay\xE9e" && adminSignature.paidStampData) {
      doc.image(
        Buffer.from(adminSignature.paidStampData.replace(/^data:image\/\w+;base64,/, ""), "base64"),
        100,
        doc.y + 10,
        { width: 100 }
      );
    }
  }
  const footerY = doc.page.height - 30;
  doc.moveTo(50, footerY - 5).lineTo(doc.page.width - 50, footerY - 5).stroke();
  doc.fontSize(7).text(
    "Cabinet param\xE9dical de la renaissance SUARL - NINEA : 007795305 - Registre de Commerce : SN DKR 2020 B5204 - TVA non applicable",
    20,
    footerY,
    { align: "center", width: pageWidth }
  );
  doc.end();
  return stream;
}

// server/emailService.ts
import { MailService } from "@sendgrid/mail";
var initSendGrid = () => {
  if (!process.env.SENDGRID_API_KEY) {
    throw new Error("La variable d'environnement SENDGRID_API_KEY doit \xEAtre d\xE9finie");
  }
  const mailService = new MailService();
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
  return mailService;
};
async function sendInvoiceDownloadNotification(invoice) {
  try {
    const mailService = initSendGrid();
    const recipientEmail = "jarviswriting01@gmail.com";
    const senderEmail = "jarviswriting01@gmail.com";
    const emailContent = `
      <h1>Notification de t\xE9l\xE9chargement de facture</h1>
      <p>Une facture a \xE9t\xE9 t\xE9l\xE9charg\xE9e par un utilisateur du syst\xE8me.</p>
      <h2>D\xE9tails de la facture</h2>
      <ul>
        <li><strong>Num\xE9ro de facture:</strong> ${invoice.invoiceNumber}</li>
        <li><strong>Date d'\xE9mission:</strong> ${invoice.issueDate}</li>
        <li><strong>Patient:</strong> ${invoice.patientName}</li>
        <li><strong>Orthophoniste:</strong> ${invoice.therapistName}</li>
        <li><strong>Montant:</strong> ${invoice.totalAmount}\u20AC</li>
        <li><strong>Statut:</strong> ${invoice.status}</li>
      </ul>
      <p>Ce message est automatique, merci de ne pas y r\xE9pondre.</p>
    `;
    const msg = {
      to: recipientEmail,
      from: senderEmail,
      subject: `T\xE9l\xE9chargement de facture ${invoice.invoiceNumber}`,
      text: `Notification de t\xE9l\xE9chargement de facture: ${invoice.invoiceNumber} pour ${invoice.patientName}`,
      html: emailContent
    };
    await mailService.send(msg);
    console.log(`Notification d'email envoy\xE9e pour la facture ${invoice.invoiceNumber}`);
    console.log(`Email envoy\xE9 \xE0: ${recipientEmail}`);
    return {
      success: true
    };
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email de notification:", error);
    return {
      success: false,
      error
    };
  }
}

// server/auth.ts
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";

// server/authService.ts
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
var AuthService = class {
  /**
   * Crée un nouvel utilisateur
   * @param userData Données de l'utilisateur à créer
   * @returns L'utilisateur créé
   */
  async createUser(userData) {
    const { password, ...userDataWithoutPassword } = userData;
    const existingUser = await this.getUserByUsername(userData.username);
    if (existingUser) {
      throw new Error("Un utilisateur avec ce nom d'utilisateur existe d\xE9j\xE0");
    }
    if (userData.therapistId) {
      try {
        const [therapist] = await db.select().from(therapists).where(eq(therapists.id, userData.therapistId));
        if (!therapist) {
          throw new Error(`Aucun th\xE9rapeute trouv\xE9 avec l'ID ${userData.therapistId}`);
        }
      } catch (error) {
        console.error(`Erreur lors de la v\xE9rification du th\xE9rapeute ID ${userData.therapistId}:`, error);
        throw new Error(`Le th\xE9rapeute avec l'ID ${userData.therapistId} n'existe pas ou n'est pas accessible`);
      }
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const [newUser] = await db.insert(users).values({
      ...userDataWithoutPassword,
      passwordHash
    }).returning();
    return newUser;
  }
  /**
   * Récupère un utilisateur par son ID
   * @param id ID de l'utilisateur
   * @returns L'utilisateur ou undefined si non trouvé
   */
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  /**
   * Récupère un utilisateur par son nom d'utilisateur
   * @param username Nom d'utilisateur
   * @returns L'utilisateur ou undefined si non trouvé
   */
  async getUserByUsername(username) {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  /**
   * Vérifie les identifiants d'un utilisateur
   * @param username Nom d'utilisateur
   * @param password Mot de passe
   * @returns L'utilisateur si les identifiants sont valides, null sinon
   */
  async validateUser(username, password) {
    const user = await this.getUserByUsername(username);
    if (!user) {
      return null;
    }
    if (!user.isActive) {
      return null;
    }
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return null;
    }
    await db.update(users).set({ lastLogin: /* @__PURE__ */ new Date() }).where(eq(users.id, user.id));
    return user;
  }
  /**
   * Récupère tous les utilisateurs
   * @returns Liste des utilisateurs
   */
  async getAllUsers() {
    return db.select().from(users);
  }
  /**
   * Met à jour un utilisateur
   * @param id ID de l'utilisateur
   * @param userData Données à mettre à jour
   * @returns L'utilisateur mis à jour ou undefined si non trouvé
   */
  async updateUser(id, userData) {
    const { password, ...updateData } = userData;
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }
    const [updatedUser] = await db.update(users).set(updateData).where(eq(users.id, id)).returning();
    return updatedUser;
  }
  /**
   * Désactive un utilisateur (alternative à la suppression)
   * @param id ID de l'utilisateur
   * @returns true si l'utilisateur a été désactivé, false sinon
   */
  async deactivateUser(id) {
    const [updatedUser] = await db.update(users).set({ isActive: false }).where(eq(users.id, id)).returning();
    return !!updatedUser;
  }
  /**
   * Vérifie si un utilisateur a un rôle spécifique
   * @param userId ID de l'utilisateur
   * @param role Rôle à vérifier
   * @returns true si l'utilisateur a le rôle spécifié, false sinon
   */
  async hasRole(userId, role) {
    const user = await this.getUser(userId);
    return user?.role === role;
  }
};
var authService = new AuthService();

// server/authMiddleware.ts
function isAuthenticated(req, res, next) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: "Non autoris\xE9 - Veuillez vous connecter" });
  }
  next();
}
function hasRole(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Non autoris\xE9 - Veuillez vous connecter" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Acc\xE8s refus\xE9 - Droits insuffisants" });
    }
    next();
  };
}
var isAdmin = hasRole([UserRole.ADMIN]);
var isAdminStaff = hasRole([UserRole.ADMIN, UserRole.SECRETARIAT]);

// server/auth.ts
import { createId } from "@paralleldrive/cuid2";
import connectPgSimple from "connect-pg-simple";
import bcrypt2 from "bcrypt";
function setupAuth(app2) {
  const PgSession = connectPgSimple(session);
  const sessionSettings = {
    store: new PgSession({
      pool: pool2,
      // Conversion de type nécessaire pour la compatibilité
      tableName: "session",
      // Le nom de la table pour stocker les sessions
      createTableIfMissing: true
      // Créer la table si elle n'existe pas
    }),
    secret: process.env.SESSION_SECRET || createId(),
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      // Désactivé pour assurer la compatibilité avec l'environnement de déploiement
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1e3,
      // 1 jour
      sameSite: "lax"
      // Permettre les requêtes cross-site pour faciliter le développement
    }
  };
  app2.use(session(sessionSettings));
  app2.use(passport.initialize());
  app2.use(passport.session());
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log(`Tentative de connexion pour l'utilisateur: ${username}`);
        const user = await authService.validateUser(username, password);
        if (!user) {
          console.log(`\xC9chec d'authentification pour l'utilisateur: ${username}`);
          return done(null, false, { message: "Identifiants incorrects" });
        }
        const sessionUser = {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          therapistId: user.therapistId || void 0,
          isActive: user.isActive
        };
        console.log(`Authentification r\xE9ussie pour l'utilisateur: ${username}, ID: ${user.id}, R\xF4le: ${user.role}`);
        return done(null, sessionUser);
      } catch (error) {
        console.error(`Erreur lors de l'authentification:`, error);
        return done(error);
      }
    })
  );
  passport.serializeUser((user, done) => {
    console.log(`S\xE9rialisation de l'utilisateur ID:${user.id} pour la session`);
    done(null, user.id);
  });
  passport.deserializeUser(async (id, done) => {
    try {
      console.log(`Tentative de d\xE9s\xE9rialisation pour l'utilisateur ID:${id}`);
      const user = await authService.getUser(id);
      if (!user) {
        console.log(`Utilisateur ID:${id} non trouv\xE9 lors de la d\xE9s\xE9rialisation`);
        return done(null, false);
      }
      if (!user.isActive) {
        console.log(`Utilisateur ID:${id} inactif lors de la d\xE9s\xE9rialisation`);
        return done(null, false);
      }
      const sessionUser = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        therapistId: user.therapistId || void 0,
        isActive: user.isActive
      };
      console.log(`D\xE9s\xE9rialisation r\xE9ussie pour l'utilisateur ID:${id}, R\xF4le:${user.role}`);
      done(null, sessionUser);
    } catch (error) {
      console.error(`Erreur lors de la d\xE9s\xE9rialisation de l'utilisateur ID:${id}:`, error);
      done(error);
    }
  });
  app2.post("/api/auth/login", passport.authenticate("local"), (req, res) => {
    const user = req.user;
    console.log(`Login r\xE9ussi - r\xE9ponse \xE0 la requ\xEAte pour l'utilisateur ID:${user.id}, Cookie de session pr\xE9sent:`, !!req.cookies["connect.sid"]);
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      therapistId: user.therapistId
    });
  });
  app2.post("/api/auth/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) {
        return next(err);
      }
      res.json({ message: "D\xE9connect\xE9 avec succ\xE8s" });
    });
  });
  app2.get("/api/auth/users", isAdmin, async (req, res) => {
    try {
      const users2 = await authService.getAllUsers();
      const safeUsers = users2.map((user) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        therapistId: user.therapistId,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        isActive: user.isActive
      }));
      res.json(safeUsers);
    } catch (error) {
      console.error("Erreur lors de la r\xE9cup\xE9ration des utilisateurs:", error);
      res.status(500).json({ error: "Erreur lors de la r\xE9cup\xE9ration des utilisateurs" });
    }
  });
  app2.get("/api/auth/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Non authentifi\xE9" });
    }
    const user = req.user;
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      therapistId: user.therapistId
    });
  });
  app2.post("/api/auth/change-password", isAuthenticated, async (req, res) => {
    try {
      const { currentPassword, newPassword, confirmPassword } = req.body;
      const userId = req.user.id;
      if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({ error: "Tous les champs sont requis" });
      }
      if (newPassword !== confirmPassword) {
        return res.status(400).json({ error: "Les nouveaux mots de passe ne correspondent pas" });
      }
      const user = await authService.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "Utilisateur non trouv\xE9" });
      }
      const isPasswordValid = await bcrypt2.compare(currentPassword, user.passwordHash);
      if (!isPasswordValid) {
        return res.status(401).json({ error: "Mot de passe actuel incorrect" });
      }
      await authService.updateUser(userId, { password: newPassword });
      res.json({ success: true, message: "Mot de passe modifi\xE9 avec succ\xE8s" });
    } catch (error) {
      console.error("Erreur lors du changement de mot de passe:", error);
      res.status(500).json({ error: "Erreur lors du changement de mot de passe" });
    }
  });
  app2.post("/api/auth/deactivate-user/:id", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await authService.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "Utilisateur non trouv\xE9" });
      }
      if (userId === req.user.id) {
        return res.status(400).json({ error: "Vous ne pouvez pas d\xE9sactiver votre propre compte" });
      }
      const success = await authService.deactivateUser(userId);
      if (success) {
        res.json({ success: true, message: "Compte utilisateur d\xE9sactiv\xE9 avec succ\xE8s" });
      } else {
        res.status(500).json({ error: "Erreur lors de la d\xE9sactivation du compte" });
      }
    } catch (error) {
      console.error("Erreur lors de la d\xE9sactivation du compte:", error);
      res.status(500).json({ error: "Erreur lors de la d\xE9sactivation du compte" });
    }
  });
  app2.post("/api/auth/register", async (req, res, next) => {
    try {
      if (req.isAuthenticated() && req.user && req.user.role !== UserRole.ADMIN) {
        return res.status(403).json({ error: "Seuls les administrateurs peuvent cr\xE9er de nouveaux utilisateurs" });
      }
      const { username, password, email, role, therapistId } = req.body;
      const newUser = await authService.createUser({
        username,
        password,
        email,
        role,
        therapistId,
        isActive: true
      });
      res.status(201).json({
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        therapistId: newUser.therapistId
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        next(error);
      }
    }
  });
}

// server/routes.ts
async function registerRoutes(app2) {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024
      // Limite à 10 MB
    }
  });
  setupAuth(app2);
  app2.get("/api/patients", isAuthenticated, async (req, res) => {
    try {
      const patients2 = await storage.getPatients();
      res.json(patients2);
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la r\xE9cup\xE9ration des patients" });
    }
  });
  app2.get("/api/patients/search", isAuthenticated, async (req, res) => {
    try {
      const query = req.query.q || "";
      const patients2 = await storage.searchPatients(query);
      res.json(patients2);
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la recherche des patients" });
    }
  });
  app2.get("/api/patients/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID de patient invalide" });
      }
      const patient = await storage.getPatient(id);
      if (!patient) {
        return res.status(404).json({ error: "Patient non trouv\xE9" });
      }
      res.json(patient);
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la r\xE9cup\xE9ration du patient" });
    }
  });
  app2.post("/api/patients", async (req, res) => {
    try {
      const validatedData = patientFormSchema.parse(req.body);
      const patient = await storage.createPatient(validatedData);
      res.status(201).json(patient);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ error: validationError.message });
      } else {
        res.status(500).json({ error: "Erreur lors de la cr\xE9ation du patient" });
      }
    }
  });
  app2.get("/api/therapists", async (req, res) => {
    try {
      const therapists2 = await storage.getTherapists();
      res.json(therapists2);
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la r\xE9cup\xE9ration des th\xE9rapeutes" });
    }
  });
  app2.get("/api/therapists/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID de th\xE9rapeute invalide" });
      }
      const therapist = await storage.getTherapist(id);
      if (!therapist) {
        return res.status(404).json({ error: "Th\xE9rapeute non trouv\xE9" });
      }
      res.json(therapist);
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la r\xE9cup\xE9ration du th\xE9rapeute" });
    }
  });
  app2.get("/api/appointments", isAuthenticated, async (req, res) => {
    try {
      console.log("GET /api/appointments - User Info:", {
        id: req.user?.id,
        role: req.user?.role,
        therapistId: req.user?.therapistId
      });
      if (req.user && req.user.role === UserRole.THERAPIST && req.user.therapistId) {
        console.log(`R\xE9cup\xE9ration des RDV pour le th\xE9rapeute ID:${req.user.therapistId}`);
        const appointments3 = await storage.getAppointmentsForTherapist(req.user.therapistId);
        return res.json(appointments3);
      }
      console.log("R\xE9cup\xE9ration de tous les RDV (admin ou secr\xE9tariat)");
      const appointments2 = await storage.getAppointments();
      res.json(appointments2);
    } catch (error) {
      console.error("Erreur lors de la r\xE9cup\xE9ration des rendez-vous:", error);
      res.status(500).json({ error: "Erreur lors de la r\xE9cup\xE9ration des rendez-vous" });
    }
  });
  app2.post("/api/appointments/multiple", async (req, res) => {
    try {
      const { patientId, therapistId, slots } = req.body;
      if (!patientId || !therapistId || !Array.isArray(slots) || slots.length === 0) {
        return res.status(400).json({ error: "Donn\xE9es invalides pour la cr\xE9ation de rendez-vous multiples" });
      }
      for (const slot of slots) {
        const availabilityResult = await storage.checkAvailability(therapistId, slot.date, slot.time);
        if (!availabilityResult.available) {
          let errorMessage = `Le cr\xE9neau du ${slot.date} \xE0 ${slot.time} est d\xE9j\xE0 r\xE9serv\xE9`;
          if (availabilityResult.conflictInfo) {
            errorMessage = `Le cr\xE9neau du ${slot.date} \xE0 ${slot.time} est d\xE9j\xE0 r\xE9serv\xE9 pour ${availabilityResult.conflictInfo.patientName}`;
          }
          return res.status(409).json({ error: errorMessage });
        }
      }
      const appointments2 = [];
      for (const slot of slots) {
        const appointment = await storage.createAppointment({
          patientId,
          therapistId,
          date: slot.date,
          time: slot.time,
          status: "confirmed"
          // Ne pas générer de facture automatiquement
        }, true);
        appointments2.push(appointment);
      }
      if (appointments2.length > 0) {
        const unitPrice = 50;
        const totalAmount = (unitPrice * appointments2.length).toFixed(2);
        const today = /* @__PURE__ */ new Date();
        const formatDate3 = (date) => {
          return date.toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
          });
        };
        const addDays3 = (date, days) => {
          const result = new Date(date);
          result.setDate(result.getDate() + days);
          return result;
        };
        const issueDate = formatDate3(today);
        const dueDate = formatDate3(addDays3(today, 30));
        const invoices2 = await storage.getInvoices();
        const lastInvoiceId = invoices2.length > 0 ? Math.max(...invoices2.map((inv) => inv.id)) + 1 : 1;
        const invoiceNumber = `F-${today.getFullYear()}-${String(lastInvoiceId).padStart(4, "0")}`;
        const appointmentDetails = appointments2.map((app3) => {
          const appDate = new Date(app3.date);
          const formattedDate = appDate.toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric"
          });
          return `${formattedDate} \xE0 ${app3.time}`;
        }).join(", ");
        const invoice = await storage.createInvoice({
          invoiceNumber,
          patientId,
          therapistId,
          appointmentId: appointments2[0].id,
          // Lier à premier rendez-vous
          amount: totalAmount,
          taxRate: "0",
          // Pas de TVA sur les actes médicaux
          totalAmount,
          status: "En attente",
          issueDate,
          dueDate,
          paymentMethod: null,
          notes: `Facture group\xE9e pour ${appointments2.length} s\xE9ances d'orthophonie: ${appointmentDetails}`
        });
        for (const appointment of appointments2) {
          if (appointment.id !== appointments2[0].id) {
            await storage.updateAppointment(appointment.id, {
              notes: `Factur\xE9 avec le RDV #${appointments2[0].id} sur la facture ${invoiceNumber}`
            });
          }
        }
        res.status(201).json({
          appointments: appointments2,
          invoice
        });
      } else {
        res.status(500).json({ error: "Aucun rendez-vous n'a pu \xEAtre cr\xE9\xE9" });
      }
    } catch (error) {
      console.error("Erreur lors de la cr\xE9ation des rendez-vous multiples:", error);
      res.status(500).json({ error: "Erreur lors de la cr\xE9ation des rendez-vous multiples" });
    }
  });
  app2.get("/api/appointments/patient/:patientId", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      if (isNaN(patientId)) {
        return res.status(400).json({ error: "ID de patient invalide" });
      }
      const appointments2 = await storage.getAppointmentsForPatient(patientId);
      res.json(appointments2);
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la r\xE9cup\xE9ration des rendez-vous du patient" });
    }
  });
  app2.get("/api/appointments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID de rendez-vous invalide" });
      }
      const appointment = await storage.getAppointment(id);
      if (!appointment) {
        return res.status(404).json({ error: "Rendez-vous non trouv\xE9" });
      }
      res.json(appointment);
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la r\xE9cup\xE9ration du rendez-vous" });
    }
  });
  app2.post("/api/appointments", async (req, res) => {
    try {
      const validatedData = appointmentFormSchema.parse(req.body);
      const availabilityResult = await storage.checkAvailability(
        validatedData.therapistId,
        validatedData.date,
        validatedData.time
      );
      if (!availabilityResult.available) {
        let errorMessage = "Ce cr\xE9neau horaire est d\xE9j\xE0 r\xE9serv\xE9";
        if (availabilityResult.conflictInfo) {
          errorMessage = `Ce cr\xE9neau est d\xE9j\xE0 r\xE9serv\xE9 pour ${availabilityResult.conflictInfo.patientName}`;
        }
        return res.status(409).json({
          error: errorMessage,
          conflictInfo: availabilityResult.conflictInfo
        });
      }
      if (validatedData.isRecurring && validatedData.recurringFrequency && validatedData.recurringCount) {
        try {
          const appointments2 = await storage.createRecurringAppointments(
            validatedData,
            validatedData.recurringFrequency,
            validatedData.recurringCount,
            true
            // Toujours utiliser une facture unique et groupée
          );
          res.status(201).json(appointments2);
        } catch (recurringError) {
          console.error("Erreur lors de la cr\xE9ation des rendez-vous r\xE9currents:", recurringError);
          res.status(409).json({
            error: "Certains cr\xE9neaux r\xE9currents sont d\xE9j\xE0 r\xE9serv\xE9s. Veuillez choisir d'autres dates ou horaires."
          });
        }
      } else {
        const appointment = await storage.createAppointment(validatedData);
        res.status(201).json(appointment);
      }
    } catch (error) {
      console.error("Erreur lors de la cr\xE9ation du rendez-vous:", error);
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ error: validationError.message });
      } else {
        res.status(500).json({ error: "Erreur lors de la cr\xE9ation du rendez-vous" });
      }
    }
  });
  app2.put("/api/appointments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID de rendez-vous invalide" });
      }
      const validatedData = appointmentFormSchema.partial().parse(req.body);
      const updatedAppointment = await storage.updateAppointment(id, validatedData);
      if (!updatedAppointment) {
        return res.status(404).json({ error: "Rendez-vous non trouv\xE9" });
      }
      res.json(updatedAppointment);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ error: validationError.message });
      } else {
        res.status(500).json({ error: "Erreur lors de la mise \xE0 jour du rendez-vous" });
      }
    }
  });
  app2.delete("/api/appointments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID de rendez-vous invalide" });
      }
      console.log(`Tentative de suppression du rendez-vous ${id}`);
      const success = await storage.deleteAppointment(id);
      if (!success) {
        return res.status(404).json({ error: "Rendez-vous non trouv\xE9" });
      }
      console.log(`Rendez-vous ${id} supprim\xE9 avec succ\xE8s`);
      res.status(204).send();
    } catch (error) {
      console.error(`Erreur d\xE9taill\xE9e lors de la suppression du rendez-vous ${req.params.id}:`, error);
      res.status(500).json({ error: "Erreur lors de la suppression du rendez-vous" });
    }
  });
  app2.delete("/api/appointments", async (req, res) => {
    try {
      const ids = req.body.ids;
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "Liste d'IDs de rendez-vous invalide" });
      }
      console.log(`Tentative de suppression de ${ids.length} rendez-vous: ${ids.join(", ")}`);
      const results = [];
      const failures = [];
      for (const id of ids) {
        try {
          const success = await storage.deleteAppointment(id);
          if (success) {
            results.push({ id, success: true });
          } else {
            failures.push({ id, reason: "Rendez-vous non trouv\xE9" });
          }
        } catch (error) {
          console.error(`Erreur lors de la suppression du rendez-vous ${id}:`, error);
          failures.push({ id, reason: "Erreur interne" });
        }
      }
      if (failures.length === 0) {
        console.log(`${results.length} rendez-vous supprim\xE9s avec succ\xE8s`);
        res.status(204).send();
      } else {
        console.log(`${results.length} rendez-vous supprim\xE9s, ${failures.length} \xE9checs`);
        res.status(207).json({
          message: "Suppression partielle des rendez-vous",
          results,
          failures
        });
      }
    } catch (error) {
      console.error("Erreur lors de la suppression multiple de rendez-vous:", error);
      res.status(500).json({ error: "Erreur lors de la suppression des rendez-vous" });
    }
  });
  app2.get("/api/availability", async (req, res) => {
    try {
      const therapistId = parseInt(req.query.therapistId);
      const date = req.query.date;
      const time = req.query.time;
      if (isNaN(therapistId) || !date || !time) {
        return res.status(400).json({ error: "Param\xE8tres invalides" });
      }
      const availabilityResult = await storage.checkAvailability(therapistId, date, time);
      if (!availabilityResult.available && availabilityResult.conflictInfo) {
        res.json({
          available: false,
          conflictInfo: {
            message: `Ce cr\xE9neau est d\xE9j\xE0 r\xE9serv\xE9 pour ${availabilityResult.conflictInfo.patientName}`,
            patientId: availabilityResult.conflictInfo.patientId,
            patientName: availabilityResult.conflictInfo.patientName
          }
        });
      } else {
        res.json({ available: availabilityResult.available });
      }
    } catch (error) {
      console.error("Erreur lors de la v\xE9rification de disponibilit\xE9:", error);
      res.status(500).json({ error: "Erreur lors de la v\xE9rification de disponibilit\xE9" });
    }
  });
  app2.get("/api/invoices", async (req, res) => {
    try {
      const invoices2 = await storage.getInvoices();
      res.json(invoices2);
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la r\xE9cup\xE9ration des factures" });
    }
  });
  app2.get("/api/invoices/patient/:patientId", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      if (isNaN(patientId)) {
        return res.status(400).json({ error: "ID de patient invalide" });
      }
      const invoices2 = await storage.getInvoicesForPatient(patientId);
      res.json(invoices2);
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la r\xE9cup\xE9ration des factures du patient" });
    }
  });
  app2.get("/api/invoices/therapist/:therapistId", async (req, res) => {
    try {
      const therapistId = parseInt(req.params.therapistId);
      if (isNaN(therapistId)) {
        return res.status(400).json({ error: "ID de th\xE9rapeute invalide" });
      }
      const invoices2 = await storage.getInvoicesForTherapist(therapistId);
      res.json(invoices2);
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la r\xE9cup\xE9ration des factures du th\xE9rapeute" });
    }
  });
  app2.get("/api/invoices/appointment/:appointmentId", async (req, res) => {
    try {
      const appointmentId = parseInt(req.params.appointmentId);
      if (isNaN(appointmentId)) {
        return res.status(400).json({ error: "ID de rendez-vous invalide" });
      }
      const invoice = await storage.getInvoiceForAppointment(appointmentId);
      if (!invoice) {
        return res.status(404).json({ error: "Facture non trouv\xE9e pour ce rendez-vous" });
      }
      res.json(invoice);
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la r\xE9cup\xE9ration de la facture" });
    }
  });
  app2.get("/api/invoices/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID de facture invalide" });
      }
      const invoice = await storage.getInvoice(id);
      if (!invoice) {
        return res.status(404).json({ error: "Facture non trouv\xE9e" });
      }
      res.json(invoice);
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la r\xE9cup\xE9ration de la facture" });
    }
  });
  app2.get("/api/invoices/:id/pdf", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID de facture invalide" });
      }
      const isPreview = req.query.preview === "true";
      const invoicesWithDetails = await storage.getInvoices();
      let invoice = invoicesWithDetails.find((inv) => inv.id === id);
      if (!invoice) {
        return res.status(404).json({ error: "Facture non trouv\xE9e" });
      }
      if (invoice.notes && (invoice.notes.includes("r\xE9current") || invoice.notes.includes("Facture group\xE9e"))) {
        console.log(`Facture ${invoice.invoiceNumber} identifi\xE9e comme ayant des s\xE9ances multiples`);
        try {
          const allAppointments = await storage.getAppointments();
          let relatedAppointments = allAppointments.filter((app3) => {
            if (app3.id === invoice.appointmentId) return true;
            if (app3.parentAppointmentId !== null) {
              if (app3.parentAppointmentId === invoice.appointmentId) return true;
              const invoiceAppointment = allAppointments.find((a) => a.id === invoice.appointmentId);
              if (invoiceAppointment && invoiceAppointment.parentAppointmentId !== null) {
                return app3.parentAppointmentId === invoiceAppointment.parentAppointmentId;
              }
            }
            return false;
          });
          relatedAppointments.sort((a, b) => {
            const [dayA, monthA, yearA] = a.date.split("/").map((n) => parseInt(n));
            const [dayB, monthB, yearB] = b.date.split("/").map((n) => parseInt(n));
            const dateA = new Date(yearA, monthA - 1, dayA);
            const dateB = new Date(yearB, monthB - 1, dayB);
            if (dateA.getTime() !== dateB.getTime()) {
              return dateA.getTime() - dateB.getTime();
            }
            return a.time.localeCompare(b.time);
          });
          if (relatedAppointments.length > 1) {
            console.log(`Trouv\xE9 ${relatedAppointments.length} rendez-vous li\xE9s pour la facture ${invoice.invoiceNumber}`);
            const activeAppointments = relatedAppointments.filter((app3) => app3.status !== "cancelled");
            const allAppointmentDates = activeAppointments.map((app3) => {
              const [day, month, year] = app3.date.split("/").map((n) => parseInt(n));
              const appDate = new Date(year, month - 1, day);
              const formattedDate = appDate.toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric"
              });
              return `${formattedDate} \xE0 ${app3.time}`;
            });
            let notesBase = "";
            let userCustomNotes = "";
            if (invoice.notes) {
              if (invoice.notes.includes("Facture group\xE9e") || invoice.notes.includes("Rendez-vous r\xE9current")) {
                const notesLines = invoice.notes.split("\n");
                const nonDateLines = notesLines.filter(
                  (line) => !line.match(/^\d{2}\/\d{2}\/202\d/) && // Pas une date
                  !line.includes("Facture group\xE9e") && // Pas l'en-tête automatique
                  !line.includes("Rendez-vous r\xE9current") && // Pas l'en-tête automatique
                  line.trim() !== ""
                  // Pas une ligne vide
                );
                if (nonDateLines.length > 0) {
                  userCustomNotes = nonDateLines.join("\n");
                }
              } else {
                userCustomNotes = invoice.notes;
              }
            }
            notesBase = `Facture group\xE9e pour ${activeAppointments.length} s\xE9ances`;
            const frequencyMatch = invoice.notes.match(/\((.*?)\)/i);
            if (frequencyMatch && frequencyMatch[1]) {
              notesBase += ` (${frequencyMatch[1]})`;
            }
            const finalNotes = userCustomNotes ? `${notesBase}

${userCustomNotes}` : notesBase;
            invoice = {
              ...invoice,
              notes: finalNotes,
              // Ajouter un nouveau champ pour les dates de rendez-vous récurrents/groupés
              appointmentDates: allAppointmentDates
            };
          }
        } catch (err) {
          console.error("Erreur lors de la r\xE9cup\xE9ration des rendez-vous multiples:", err);
        }
      }
      res.setHeader("Content-Type", "application/pdf");
      if (isPreview) {
        res.setHeader("Content-Disposition", `inline; filename="facture-${invoice.invoiceNumber}.pdf"`);
      } else {
        res.setHeader("Content-Disposition", `attachment; filename="facture-${invoice.invoiceNumber}.pdf"`);
        sendInvoiceDownloadNotification(invoice).then((emailResult) => {
          if (emailResult.success) {
            console.log(`Notification d'email envoy\xE9e pour la facture ${invoice.invoiceNumber}`);
          } else {
            console.error(`\xC9chec de l'envoi de la notification pour la facture ${invoice.invoiceNumber}:`, emailResult.error);
          }
        }).catch((err) => {
          console.error(`Erreur lors de l'envoi de la notification par email:`, err);
        });
      }
      let adminSignature = void 0;
      if (!isPreview) {
        const signatures2 = await storage.getSignatures();
        adminSignature = signatures2.length > 0 ? signatures2[0] : void 0;
      }
      const pdfStream = generateInvoicePDF(invoice, adminSignature);
      pdfStream.pipe(res);
    } catch (error) {
      console.error("Erreur lors de la g\xE9n\xE9ration du PDF de la facture:", error);
      res.status(500).json({ error: "Erreur lors de la g\xE9n\xE9ration du PDF de la facture" });
    }
  });
  app2.post("/api/invoices", async (req, res) => {
    try {
      const validatedData = insertInvoiceSchema.parse(req.body);
      const invoice = await storage.createInvoice(validatedData);
      res.status(201).json(invoice);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ error: validationError.message });
      } else {
        res.status(500).json({ error: "Erreur lors de la cr\xE9ation de la facture" });
      }
    }
  });
  app2.put("/api/invoices/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID de facture invalide" });
      }
      const validatedData = insertInvoiceSchema.partial().parse(req.body);
      const updatedInvoice = await storage.updateInvoice(id, validatedData);
      if (!updatedInvoice) {
        return res.status(404).json({ error: "Facture non trouv\xE9e" });
      }
      res.json(updatedInvoice);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ error: validationError.message });
      } else {
        res.status(500).json({ error: "Erreur lors de la mise \xE0 jour de la facture" });
      }
    }
  });
  app2.delete("/api/invoices/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID de facture invalide" });
      }
      const success = await storage.deleteInvoice(id);
      if (!success) {
        return res.status(404).json({ error: "Facture non trouv\xE9e" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la suppression de la facture" });
    }
  });
  app2.get("/api/invoices/:id/send-email", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID de facture invalide" });
      }
      const invoicesWithDetails = await storage.getInvoices();
      const invoice = invoicesWithDetails.find((inv) => inv.id === id);
      if (!invoice) {
        return res.status(404).json({ error: "Facture non trouv\xE9e" });
      }
      const emailResult = await sendInvoiceDownloadNotification(invoice);
      if (emailResult.success) {
        res.status(200).json({ message: "Facture envoy\xE9e par email avec succ\xE8s" });
      } else {
        throw new Error(emailResult.error || "Erreur lors de l'envoi de l'email");
      }
    } catch (error) {
      console.error("Erreur lors de l'envoi de la facture par email:", error);
      res.status(500).json({ error: "Erreur lors de l'envoi de la facture par email" });
    }
  });
  app2.get("/api/therapist-payments", async (req, res) => {
    try {
      const payments = await storage.getTherapistPayments();
      res.json(payments);
    } catch (error) {
      console.error("Erreur lors de la r\xE9cup\xE9ration des paiements aux th\xE9rapeutes:", error);
      res.status(500).json({ error: "Erreur lors de la r\xE9cup\xE9ration des paiements aux th\xE9rapeutes" });
    }
  });
  app2.get("/api/therapist-payments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID de paiement invalide" });
      }
      const payment = await storage.getTherapistPayment(id);
      if (!payment) {
        return res.status(404).json({ error: "Paiement non trouv\xE9" });
      }
      res.json(payment);
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la r\xE9cup\xE9ration du paiement" });
    }
  });
  app2.get("/api/therapist-payments/therapist/:therapistId", async (req, res) => {
    try {
      const therapistId = parseInt(req.params.therapistId);
      if (isNaN(therapistId)) {
        return res.status(400).json({ error: "ID de th\xE9rapeute invalide" });
      }
      const payments = await storage.getTherapistPaymentsForTherapist(therapistId);
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la r\xE9cup\xE9ration des paiements du th\xE9rapeute" });
    }
  });
  app2.post("/api/therapist-payments", async (req, res) => {
    try {
      const validatedData = insertTherapistPaymentSchema.parse(req.body);
      const payment = await storage.createTherapistPayment(validatedData);
      res.status(201).json(payment);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ error: validationError.message });
      } else {
        console.error("Erreur lors de la cr\xE9ation du paiement:", error);
        res.status(500).json({ error: "Erreur lors de la cr\xE9ation du paiement" });
      }
    }
  });
  app2.post("/api/create-payment-from-invoice/:invoiceId", async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.invoiceId);
      if (isNaN(invoiceId)) {
        return res.status(400).json({ error: "ID de facture invalide" });
      }
      const payment = await storage.createPaymentFromInvoice(invoiceId);
      if (!payment) {
        return res.status(404).json({
          error: "Impossible de cr\xE9er un paiement. La facture n'existe pas ou n'est pas marqu\xE9e comme pay\xE9e."
        });
      }
      res.status(201).json(payment);
    } catch (error) {
      console.error("Erreur lors de la cr\xE9ation du paiement depuis la facture:", error);
      res.status(500).json({ error: "Erreur lors de la cr\xE9ation du paiement depuis la facture" });
    }
  });
  app2.get("/api/expenses", async (req, res) => {
    try {
      const expenses2 = await storage.getExpenses();
      res.json(expenses2);
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la r\xE9cup\xE9ration des d\xE9penses" });
    }
  });
  app2.get("/api/expenses/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID de d\xE9pense invalide" });
      }
      const expense = await storage.getExpense(id);
      if (!expense) {
        return res.status(404).json({ error: "D\xE9pense non trouv\xE9e" });
      }
      res.json(expense);
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la r\xE9cup\xE9ration de la d\xE9pense" });
    }
  });
  app2.get("/api/expenses/category/:category", async (req, res) => {
    try {
      const category = req.params.category;
      const expenses2 = await storage.getExpensesByCategory(category);
      res.json(expenses2);
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la r\xE9cup\xE9ration des d\xE9penses par cat\xE9gorie" });
    }
  });
  app2.get("/api/expenses/date-range", async (req, res) => {
    try {
      const startDate = req.query.startDate;
      const endDate = req.query.endDate;
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "Les dates de d\xE9but et de fin sont requises" });
      }
      const expenses2 = await storage.getExpensesByDateRange(startDate, endDate);
      res.json(expenses2);
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la r\xE9cup\xE9ration des d\xE9penses par plage de dates" });
    }
  });
  app2.post("/api/expenses", async (req, res) => {
    try {
      console.log("Requ\xEAte re\xE7ue pour cr\xE9er une d\xE9pense:", req.body);
      const validatedData = expenseFormSchema.parse(req.body);
      const adaptedData = {
        ...validatedData,
        amount: validatedData.amount.toString()
      };
      console.log("Donn\xE9es valid\xE9es:", adaptedData);
      const expense = await storage.createExpense(adaptedData);
      console.log("D\xE9pense cr\xE9\xE9e:", expense);
      res.status(201).json(expense);
    } catch (error) {
      console.error("Erreur lors de la cr\xE9ation de la d\xE9pense:", error);
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        console.error("Erreur de validation:", validationError);
        res.status(400).json({ error: validationError.message });
      } else {
        res.status(500).json({ error: "Erreur lors de la cr\xE9ation de la d\xE9pense" });
      }
    }
  });
  app2.put("/api/expenses/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID de d\xE9pense invalide" });
      }
      const validatedData = expenseFormSchema.partial().parse(req.body);
      const adaptedData = {
        ...validatedData,
        amount: validatedData.amount !== void 0 ? validatedData.amount.toString() : void 0
      };
      const updatedExpense = await storage.updateExpense(id, adaptedData);
      if (!updatedExpense) {
        return res.status(404).json({ error: "D\xE9pense non trouv\xE9e" });
      }
      res.json(updatedExpense);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ error: validationError.message });
      } else {
        res.status(500).json({ error: "Erreur lors de la mise \xE0 jour de la d\xE9pense" });
      }
    }
  });
  app2.post("/api/expenses/:id/receipt", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID de d\xE9pense invalide" });
      }
      const { fileUrl } = req.body;
      if (!fileUrl) {
        return res.status(400).json({ error: "URL du fichier requise" });
      }
      const updatedExpense = await storage.saveExpenseReceipt(id, fileUrl);
      if (!updatedExpense) {
        return res.status(404).json({ error: "D\xE9pense non trouv\xE9e" });
      }
      res.json(updatedExpense);
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de l'ajout du justificatif" });
    }
  });
  app2.delete("/api/expenses/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID de d\xE9pense invalide" });
      }
      const success = await storage.deleteExpense(id);
      if (!success) {
        return res.status(404).json({ error: "D\xE9pense non trouv\xE9e" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la suppression de la d\xE9pense" });
    }
  });
  async function prepareTherapistPaymentsData(req) {
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    let filteredPayments;
    if (startDate && endDate) {
      filteredPayments = await storage.getTherapistPaymentsByDateRange(startDate, endDate);
    } else {
      filteredPayments = await storage.getTherapistPayments();
    }
    const therapistId = req.query.therapistId;
    let therapistName = "";
    if (therapistId && !isNaN(parseInt(therapistId))) {
      const therapistIdNum = parseInt(therapistId);
      filteredPayments = filteredPayments.filter((payment) => payment.therapistId === therapistIdNum);
      const therapist = await storage.getTherapist(parseInt(therapistId));
      if (therapist) {
        therapistName = therapist.name;
      }
    }
    const customTitle = req.query.title || "RELEV\xC9 DES PAIEMENTS AUX TH\xC9RAPEUTES";
    let subtitle = "Document pour la comptabilit\xE9";
    if (startDate && endDate) {
      const formatDate3 = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString("fr-FR");
      };
      subtitle = `P\xE9riode du ${formatDate3(startDate)} au ${formatDate3(endDate)}`;
    }
    return {
      filteredPayments,
      customTitle,
      subtitle,
      startDate,
      endDate,
      therapistId,
      therapistName
    };
  }
  app2.get("/api/therapist-payments/export/pdf", async (req, res) => {
    try {
      const {
        filteredPayments,
        customTitle,
        subtitle,
        startDate,
        endDate,
        therapistId,
        therapistName
      } = await prepareTherapistPaymentsData(req);
      if (filteredPayments.length === 0) {
        return res.status(404).json({ error: "Aucun paiement trouv\xE9 pour ce th\xE9rapeute durant cette p\xE9riode" });
      }
      let filenameTherapist = therapistName ? `-${therapistName.replace(/\s+/g, "-")}` : "";
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="paiements-therapeutes${filenameTherapist}-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.pdf"`);
      const pdfStream = await generateTherapistPaymentsPDF(
        filteredPayments,
        customTitle,
        subtitle,
        startDate,
        endDate
      );
      pdfStream.pipe(res);
    } catch (error) {
      console.error("Erreur lors de la g\xE9n\xE9ration du PDF des paiements:", error);
      res.status(500).json({ error: "Erreur lors de la g\xE9n\xE9ration du PDF des paiements" });
    }
  });
  app2.get("/api/therapist-payments/preview/pdf", async (req, res) => {
    try {
      const {
        filteredPayments,
        customTitle,
        subtitle,
        startDate,
        endDate
      } = await prepareTherapistPaymentsData(req);
      if (filteredPayments.length === 0) {
        return res.status(404).json({ error: "Aucun paiement trouv\xE9 pour ce th\xE9rapeute durant cette p\xE9riode" });
      }
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "inline");
      const pdfStream = await generateTherapistPaymentsPDF(
        filteredPayments,
        customTitle,
        subtitle,
        startDate,
        endDate
      );
      pdfStream.pipe(res);
    } catch (error) {
      console.error("Erreur lors de la pr\xE9visualisation du PDF des paiements:", error);
      res.status(500).json({ error: "Erreur lors de la pr\xE9visualisation du PDF des paiements" });
    }
  });
  async function prepareExpensesData(req) {
    let expenses2 = await storage.getExpenses();
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    if (startDate && endDate) {
      expenses2 = await storage.getExpensesByDateRange(startDate, endDate);
    }
    const category = req.query.category;
    if (category) {
      expenses2 = await storage.getExpensesByCategory(category);
    }
    const customTitle = req.query.title || "REGISTRE DES D\xC9PENSES";
    let subtitle = "Document pour la comptabilit\xE9";
    if (startDate && endDate) {
      const formatDate3 = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString("fr-FR");
      };
      subtitle = `P\xE9riode du ${formatDate3(startDate)} au ${formatDate3(endDate)}`;
    }
    if (category) {
      subtitle += category ? ` - Cat\xE9gorie: ${category}` : "";
    }
    return {
      expenses: expenses2,
      customTitle,
      subtitle,
      startDate,
      endDate,
      category
    };
  }
  app2.get("/api/expenses/export/pdf", async (req, res) => {
    try {
      const {
        expenses: expenses2,
        customTitle,
        subtitle,
        startDate,
        endDate
      } = await prepareExpensesData(req);
      if (expenses2.length === 0) {
        return res.status(404).json({ error: "Aucune d\xE9pense trouv\xE9e pour les crit\xE8res s\xE9lectionn\xE9s" });
      }
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="depenses-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.pdf"`);
      const pdfStream = await generateExpensesPDF(
        expenses2,
        customTitle,
        subtitle,
        startDate,
        endDate
      );
      pdfStream.pipe(res);
    } catch (error) {
      console.error("Erreur lors de la g\xE9n\xE9ration du PDF des d\xE9penses:", error);
      res.status(500).json({ error: "Erreur lors de la g\xE9n\xE9ration du PDF des d\xE9penses" });
    }
  });
  app2.get("/api/expenses/preview/pdf", async (req, res) => {
    try {
      const {
        expenses: expenses2,
        customTitle,
        subtitle,
        startDate,
        endDate
      } = await prepareExpensesData(req);
      if (expenses2.length === 0) {
        return res.status(404).json({ error: "Aucune d\xE9pense trouv\xE9e pour les crit\xE8res s\xE9lectionn\xE9s" });
      }
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "inline");
      const pdfStream = await generateExpensesPDF(
        expenses2,
        customTitle,
        subtitle,
        startDate,
        endDate
      );
      pdfStream.pipe(res);
    } catch (error) {
      console.error("Erreur lors de la pr\xE9visualisation du PDF des d\xE9penses:", error);
      res.status(500).json({ error: "Erreur lors de la pr\xE9visualisation du PDF des d\xE9penses" });
    }
  });
  app2.post("/api/create-invoice-templates-table", isAdmin, async (req, res) => {
    try {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS invoice_templates (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          header_content TEXT NOT NULL,
          footer_content TEXT NOT NULL,
          logo_url TEXT,
          primary_color TEXT NOT NULL DEFAULT '#4f46e5',
          secondary_color TEXT NOT NULL DEFAULT '#6366f1',
          font_family TEXT NOT NULL DEFAULT 'Arial, sans-serif',
          show_therapist_signature BOOLEAN NOT NULL DEFAULT true,
          is_default BOOLEAN NOT NULL DEFAULT false,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);
      await db.execute(`
        ALTER TABLE invoices 
        ADD COLUMN IF NOT EXISTS template_id INTEGER REFERENCES invoice_templates(id),
        ADD COLUMN IF NOT EXISTS signature_image_url TEXT;
      `);
      await db.execute(`
        CREATE TABLE IF NOT EXISTS signatures (
          id SERIAL PRIMARY KEY,
          therapist_id INTEGER NOT NULL REFERENCES therapists(id) ON DELETE CASCADE,
          signature_data TEXT NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);
      const templateCount = await db.execute(`SELECT COUNT(*) FROM invoice_templates WHERE is_default = true`);
      if (templateCount.rows[0].count === "0") {
        await db.execute(`
          INSERT INTO invoice_templates (
            name, description, header_content, footer_content, primary_color, secondary_color, 
            font_family, show_therapist_signature, is_default
          ) VALUES (
            'Template standard', 
            'Template par d\xE9faut pour les factures',
            '<div style="text-align: center; margin-bottom: 20px;">
              <h1>Cabinet d''Orthophonie</h1>
              <p>123 Rue de la Sant\xE9, 75000 Paris</p>
              <p>T\xE9l: 01 23 45 67 89 - Email: contact@ortho-cabinet.fr</p>
            </div>',
            '<div style="text-align: center; font-size: 12px; margin-top: 30px; color: #666;">
              <p>SIRET: 123 456 789 00010 - N\xB0 ADELI: 759912345</p>
              <p>Paiement \xE0 r\xE9ception - TVA non applicable, article 293B du CGI</p>
            </div>',
            '#4f46e5',
            '#6366f1',
            'Arial, sans-serif',
            true,
            true
          );
        `);
      }
      res.status(200).json({ message: "Tables cr\xE9\xE9es avec succ\xE8s" });
    } catch (error) {
      console.error("Erreur lors de la cr\xE9ation des tables:", error);
      res.status(500).json({ error: "Erreur lors de la cr\xE9ation des tables" });
    }
  });
  app2.get("/api/invoice-templates", isAdminStaff, async (req, res) => {
    try {
      const templates = await db.execute("SELECT * FROM invoice_templates ORDER BY is_default DESC, name ASC");
      res.json(templates.rows);
    } catch (error) {
      console.error("Erreur lors de la r\xE9cup\xE9ration des templates:", error);
      res.status(500).json({ error: "Erreur lors de la r\xE9cup\xE9ration des templates" });
    }
  });
  app2.get("/api/invoice-templates/:id", isAdminStaff, async (req, res) => {
    try {
      const { id } = req.params;
      const templates = await db.execute("SELECT * FROM invoice_templates WHERE id = $1", [id]);
      if (templates.rows.length === 0) {
        return res.status(404).json({ error: "Template non trouv\xE9" });
      }
      res.json(templates.rows[0]);
    } catch (error) {
      console.error("Erreur lors de la r\xE9cup\xE9ration du template:", error);
      res.status(500).json({ error: "Erreur lors de la r\xE9cup\xE9ration du template" });
    }
  });
  app2.get("/api/invoice-templates/default", async (req, res) => {
    try {
      const templates = await db.execute("SELECT * FROM invoice_templates WHERE is_default = true");
      if (templates.rows.length === 0) {
        return res.status(404).json({ error: "Aucun template par d\xE9faut trouv\xE9" });
      }
      res.json(templates.rows[0]);
    } catch (error) {
      console.error("Erreur lors de la r\xE9cup\xE9ration du template par d\xE9faut:", error);
      res.status(500).json({ error: "Erreur lors de la r\xE9cup\xE9ration du template par d\xE9faut" });
    }
  });
  app2.post("/api/invoice-templates", isAdminStaff, async (req, res) => {
    try {
      const {
        name,
        description,
        headerContent,
        footerContent,
        logoUrl,
        primaryColor,
        secondaryColor,
        fontFamily,
        showTherapistSignature,
        isDefault
      } = req.body;
      if (isDefault) {
        await db.execute("UPDATE invoice_templates SET is_default = false");
      }
      const result = await db.execute(
        `INSERT INTO invoice_templates (
          name, description, header_content, footer_content, logo_url, primary_color, 
          secondary_color, font_family, show_therapist_signature, is_default
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [
          name,
          description,
          headerContent,
          footerContent,
          logoUrl,
          primaryColor,
          secondaryColor,
          fontFamily,
          showTherapistSignature,
          isDefault
        ]
      );
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error("Erreur lors de la cr\xE9ation du template:", error);
      res.status(500).json({ error: "Erreur lors de la cr\xE9ation du template" });
    }
  });
  app2.put("/api/invoice-templates/:id", isAdminStaff, async (req, res) => {
    try {
      const { id } = req.params;
      const {
        name,
        description,
        headerContent,
        footerContent,
        logoUrl,
        primaryColor,
        secondaryColor,
        fontFamily,
        showTherapistSignature,
        isDefault
      } = req.body;
      if (isDefault) {
        await db.execute("UPDATE invoice_templates SET is_default = false");
      }
      const result = await db.execute(
        `UPDATE invoice_templates SET 
          name = $1, 
          description = $2, 
          header_content = $3, 
          footer_content = $4, 
          logo_url = $5, 
          primary_color = $6, 
          secondary_color = $7, 
          font_family = $8, 
          show_therapist_signature = $9, 
          is_default = $10,
          updated_at = NOW()
        WHERE id = $11 RETURNING *`,
        [
          name,
          description,
          headerContent,
          footerContent,
          logoUrl,
          primaryColor,
          secondaryColor,
          fontFamily,
          showTherapistSignature,
          isDefault,
          id
        ]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Template non trouv\xE9" });
      }
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Erreur lors de la mise \xE0 jour du template:", error);
      res.status(500).json({ error: "Erreur lors de la mise \xE0 jour du template" });
    }
  });
  app2.put("/api/invoice-templates/:id/set-default", isAdminStaff, async (req, res) => {
    try {
      const { id } = req.params;
      await db.execute("UPDATE invoice_templates SET is_default = false");
      const result = await db.execute(
        "UPDATE invoice_templates SET is_default = true WHERE id = $1 RETURNING *",
        [id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Template non trouv\xE9" });
      }
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Erreur lors de la d\xE9finition du template par d\xE9faut:", error);
      res.status(500).json({ error: "Erreur lors de la d\xE9finition du template par d\xE9faut" });
    }
  });
  app2.delete("/api/invoice-templates/:id", isAdminStaff, async (req, res) => {
    try {
      const { id } = req.params;
      const checkDefault = await db.execute("SELECT is_default FROM invoice_templates WHERE id = $1", [id]);
      if (checkDefault.rows.length === 0) {
        return res.status(404).json({ error: "Template non trouv\xE9" });
      }
      if (checkDefault.rows[0].is_default) {
        return res.status(400).json({ error: "Impossible de supprimer le template par d\xE9faut" });
      }
      await db.execute("DELETE FROM invoice_templates WHERE id = $1", [id]);
      res.status(204).end();
    } catch (error) {
      console.error("Erreur lors de la suppression du template:", error);
      res.status(500).json({ error: "Erreur lors de la suppression du template" });
    }
  });
  app2.post("/api/invoice-templates/import", isAdminStaff, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Aucun fichier fourni" });
      }
      const fileType = req.file.originalname.split(".").pop()?.toLowerCase();
      if (fileType === "json") {
        const fileContent = req.file.buffer.toString("utf8");
        const templateData = JSON.parse(fileContent);
        if (!templateData.name || !templateData.headerContent || !templateData.footerContent) {
          return res.status(400).json({ error: "Donn\xE9es du template invalides" });
        }
        if (templateData.isDefault) {
          await db.execute("UPDATE invoice_templates SET is_default = false");
        }
        const result = await db.execute(
          `INSERT INTO invoice_templates (
            name, description, header_content, footer_content, logo_url, primary_color, 
            secondary_color, font_family, show_therapist_signature, is_default
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
          [
            templateData.name,
            templateData.description || "",
            templateData.headerContent,
            templateData.footerContent,
            templateData.logoUrl || null,
            templateData.primaryColor || "#4f46e5",
            templateData.secondaryColor || "#6366f1",
            templateData.fontFamily || "Arial, sans-serif",
            templateData.showTherapistSignature !== void 0 ? templateData.showTherapistSignature : true,
            templateData.isDefault || false
          ]
        );
        res.status(201).json(result.rows[0]);
      } else if (fileType === "png") {
        try {
          console.log("Traitement d'un fichier PNG comme template");
          const imageBase64 = req.file.buffer.toString("base64");
          const fileName = req.file.originalname.replace(/\.[^/.]+$/, "");
          const templateName = `Template ${fileName}`;
          console.log("Template name:", templateName);
          const headerContent = `<div style="text-align: center; margin-bottom: 20px;"><img src="data:image/png;base64,${imageBase64}" style="max-width: 100%; margin: 0 auto;" alt="Template de facture" /></div>`;
          const footerContent = `<div style="margin-top: 20px; font-size: 12px; color: #666; text-align: center;"><p>Paiement \xE0 r\xE9ception - TVA non applicable, article 293B du CGI</p></div>`;
          console.log("Insertion du template PNG...");
          const resultSQL = await db.execute(
            `INSERT INTO "invoice_templates" (
              "name", "description", "header_content", "footer_content", "logo_url", "primary_color", 
              "secondary_color", "font_family", "show_therapist_signature", "is_default", "created_at", "updated_at"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
            [
              templateName,
              `Template import\xE9 depuis ${req.file.originalname}`,
              headerContent,
              footerContent,
              null,
              // Pas besoin de logo séparé car l'image est déjà intégrée
              "#3fb549",
              // Couleur principale du cabinet
              "#266d2c",
              // Couleur secondaire
              "Arial, sans-serif",
              true,
              false,
              /* @__PURE__ */ new Date(),
              /* @__PURE__ */ new Date()
            ]
          );
          console.log("Template PNG import\xE9 avec succ\xE8s");
          res.status(201).json(resultSQL.rows[0]);
        } catch (error) {
          console.error("Erreur d\xE9taill\xE9e lors de l'importation PNG:", error);
          res.status(500).json({ error: `Erreur lors de l'importation PNG: ${error.message}` });
        }
      } else {
        return res.status(400).json({ error: "Format de fichier non support\xE9. Utilisez JSON ou PNG." });
      }
    } catch (error) {
      console.error("Erreur lors de l'importation du template:", error);
      res.status(500).json({ error: "Erreur lors de l'importation du template" });
    }
  });
  app2.get("/api/admin-signature", isAuthenticated, async (req, res) => {
    try {
      const signatures2 = await storage.getSignatures();
      if (signatures2.length > 0) {
        res.json(signatures2[0]);
      } else {
        res.status(404).json({ error: "Signature non trouv\xE9e" });
      }
    } catch (error) {
      console.error("Erreur lors de la r\xE9cup\xE9ration de la signature administrative:", error);
      res.status(500).json({ error: "Erreur lors de la r\xE9cup\xE9ration de la signature administrative" });
    }
  });
  app2.post("/api/admin-signature", isAdmin, async (req, res) => {
    try {
      const { signatureData, paidStampData } = req.body;
      if (!signatureData) {
        return res.status(400).json({ error: "Donn\xE9es de signature manquantes" });
      }
      const signatures2 = await storage.getSignatures();
      let signature;
      if (signatures2.length > 0) {
        signature = await storage.updateSignature(signatures2[0].id, {
          name: "Christian",
          // Nom fixe pour la signature administrative
          signatureData,
          paidStampData
          // Peut être undefined si non fourni
        });
      } else {
        signature = await storage.createSignature({
          name: "Christian",
          // Nom fixe pour la signature administrative
          signatureData,
          paidStampData
          // Peut être undefined si non fourni
        });
      }
      res.status(201).json(signature);
    } catch (error) {
      console.error("Erreur lors de l'enregistrement de la signature:", error);
      res.status(500).json({ error: "Erreur lors de l'enregistrement de la signature" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2, { dirname as dirname2 } from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path, { dirname } from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    themePlugin(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared")
    }
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = dirname2(__filename2);
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        __dirname2,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(__dirname2, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
import cookieParser from "cookie-parser";
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use(cookieParser());
app.use("/images", express2.static("public/images"));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5e3;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
