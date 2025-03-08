import { pgTable, text, serial, integer, boolean, timestamp, numeric, varchar } from "drizzle-orm/pg-core";
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

// Modèle pour les dépenses du cabinet
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  date: text("date").notNull(), // Format YYYY-MM-DD
  category: text("category").notNull(),
  paymentMethod: text("payment_method").notNull(),
  notes: text("notes"),
  receiptUrl: text("receipt_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Modèle pour les paiements aux thérapeutes
export const therapistPayments = pgTable("therapist_payments", {
  id: serial("id").primaryKey(),
  therapistId: integer("therapist_id").notNull().references(() => therapists.id),
  invoiceId: integer("invoice_id").notNull().references(() => invoices.id),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  paymentDate: text("payment_date").notNull(), // Format YYYY-MM-DD
  paymentMethod: text("payment_method").notNull(),
  paymentReference: text("payment_reference"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertExpenseSchema = createInsertSchema(expenses).pick({
  description: true,
  amount: true,
  date: true,
  category: true,
  paymentMethod: true,
  notes: true,
  receiptUrl: true,
});

// Schéma de base généré par Drizzle-Zod
const baseTherapistPaymentSchema = createInsertSchema(therapistPayments).pick({
  therapistId: true,
  invoiceId: true,
  amount: true,
  paymentDate: true,
  paymentMethod: true,
  paymentReference: true,
  notes: true,
});

// Schéma d'insertion étendu pour forcer le type number pour amount
export const insertTherapistPaymentSchema = baseTherapistPaymentSchema.extend({
  amount: z.coerce.number(),
});

export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;

export type InsertTherapistPayment = z.infer<typeof insertTherapistPaymentSchema>;
// Pour débogage: Logger le type
// console.log("Type of InsertTherapistPayment amount:", typeof insertTherapistPaymentSchema.shape.amount);
// Définition d'une interface personnalisée pour TherapistPayment pour corriger le type de 'amount'
export interface TherapistPayment {
  id: number;
  therapistId: number;
  invoiceId: number;
  amount: number; // Assurez-vous que c'est un nombre, pas une chaîne
  paymentDate: string;
  paymentMethod: string;
  paymentReference: string | null;
  notes: string | null;
  createdAt: Date;
}

export const expenseFormSchema = insertExpenseSchema.extend({
  description: z.string().min(3, "La description doit contenir au moins 3 caractères"),
  amount: z.coerce.number().positive("Le montant doit être positif"),
  date: z.string().min(1, "La date est requise"),
  category: z.string().min(1, "La catégorie est requise"),
  paymentMethod: z.string().min(1, "Le mode de paiement est requis"),
});

export interface ExpenseFormData {
  description?: string;
  amount?: number;
  date?: string;
  category?: string;
  paymentMethod?: string;
  notes?: string;
  receiptFile?: File | null;
}

export const therapistPaymentFormSchema = insertTherapistPaymentSchema.extend({
  amount: z.coerce.number().positive("Le montant doit être positif"),
  paymentDate: z.string().min(1, "La date de paiement est requise"),
  paymentMethod: z.string().min(1, "Le mode de paiement est requis"),
});

export interface TherapistPaymentFormData {
  therapistId?: number;
  invoiceId?: number;
  amount?: number;
  paymentDate?: string;
  paymentMethod?: string;
  paymentReference?: string;
  notes?: string;
}

// Correction : spécifier que amount est un nombre dans l'interface
export interface TherapistPaymentWithDetails extends Omit<TherapistPayment, 'amount'> {
  therapistName: string;
  invoiceNumber: string;
  patientName: string;
  amount: number;
}

// User roles
export const UserRole = {
  ADMIN: "admin",
  SECRETARIAT: "secretariat",
  THERAPIST: "therapist"
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole];

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull().default(UserRole.SECRETARIAT),
  // Pour éviter les problèmes de type null/undefined avec therapistId
  therapistId: integer("therapist_id"),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  isActive: boolean("is_active").notNull().default(true),
});

// Schéma d'insertion d'utilisateur
export const insertUserSchema = z.object({
  username: z.string().min(3, "Le nom d'utilisateur doit contenir au moins 3 caractères"),
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  confirmPassword: z.string(),
  role: z.enum([UserRole.ADMIN, UserRole.SECRETARIAT, UserRole.THERAPIST], {
    errorMap: () => ({ message: "Rôle invalide" })
  }).default(UserRole.SECRETARIAT),
  therapistId: z.number().optional(),
  isActive: z.boolean().default(true)
}).refine(data => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"]
});

export type InsertUser = Omit<z.infer<typeof insertUserSchema>, "confirmPassword">;
export type User = typeof users.$inferSelect;

// Schéma pour le formulaire utilisateur (même que insertUserSchema)
export const userFormSchema = insertUserSchema;

export interface UserWithTherapistDetails extends User {
  therapistName?: string;
}
