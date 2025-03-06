import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Patient table
export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  notes: text("notes"),
});

export const insertPatientSchema = createInsertSchema(patients).pick({
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  notes: true,
});

// Therapist table
export const therapists = pgTable("therapists", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  specialty: text("specialty"),
  availableDays: text("available_days"),
  workHours: text("work_hours"),
});

export const insertTherapistSchema = createInsertSchema(therapists).pick({
  name: true,
  specialty: true,
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
