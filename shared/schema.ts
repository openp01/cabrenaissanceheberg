import { pgTable, text, serial, integer, boolean, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Patient table
export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  birthDate: text("birth_date"),
  notes: text("notes"),
});

export const insertPatientSchema = createInsertSchema(patients).pick({
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  address: true,
  birthDate: true,
  notes: true,
});

// Therapist table
export const therapists = pgTable("therapists", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  specialty: text("specialty"),
  email: text("email"),
  phone: text("phone"),
  color: text("color"),
  availableDays: text("available_days"),
  workHours: text("work_hours"),
});

export const insertTherapistSchema = createInsertSchema(therapists).pick({
  name: true,
  specialty: true,
  email: true,
  phone: true,
  color: true,
  availableDays: true,
  workHours: true,
});

// Appointment table
export const appointments = pgTable("appointments", {
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
  recurringFrequency: text("recurring_frequency"),
  recurringCount: integer("recurring_count"),
  parentAppointmentId: integer("parent_appointment_id"),
});

export const insertAppointmentSchema = createInsertSchema(appointments).pick({
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
  parentAppointmentId: true,
});

// Types
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Patient = typeof patients.$inferSelect;

export type InsertTherapist = z.infer<typeof insertTherapistSchema>;
export type Therapist = typeof therapists.$inferSelect;

export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointments.$inferSelect;

// Extended schemas with validation
export const patientFormSchema = insertPatientSchema.extend({
  firstName: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
  lastName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  phone: z.string().min(8, "Numéro de téléphone invalide").optional().or(z.literal("")),
});

export const appointmentFormSchema = insertAppointmentSchema.extend({
  date: z.string().min(1, "La date est requise"),
  time: z.string().min(1, "L'heure est requise"),
});

// For passing selected patient/therapist data in the booking flow
export interface BookingFormData {
  patient?: Patient;
  therapist?: Therapist;
  date?: string;
  time?: string;
  isRecurring?: boolean;
  recurringFrequency?: string;
  recurringCount?: number;
  recurringDates?: string[];
}

// For displaying appointments with related data
export interface AppointmentWithDetails extends Appointment {
  patientName: string;
  therapistName: string;
}

// Invoice table
export const invoices = pgTable("invoices", {
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
});

export const insertInvoiceSchema = createInsertSchema(invoices).pick({
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
  notes: true,
});

export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;

// For displaying invoices with related data
export interface InvoiceWithDetails extends Invoice {
  patientName: string;
  therapistName: string;
  appointmentDate: string;
  appointmentTime: string;
}
