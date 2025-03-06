import type { Express } from "express";
import { createServer, type Server } from "http";
import { pgStorage as storage } from "./dbStorage"; // Utilisation du stockage PostgreSQL
import { insertPatientSchema, patientFormSchema, appointmentFormSchema, insertInvoiceSchema } from "@shared/schema";
import { z } from "zod";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes with prefix /api
  
  // Patient routes
  app.get("/api/patients", async (req, res) => {
    try {
      const patients = await storage.getPatients();
      res.json(patients);
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la récupération des patients" });
    }
  });

  app.get("/api/patients/search", async (req, res) => {
    try {
      const query = req.query.q as string || "";
      const patients = await storage.searchPatients(query);
      res.json(patients);
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la recherche des patients" });
    }
  });

  app.get("/api/patients/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID de patient invalide" });
      }
      
      const patient = await storage.getPatient(id);
      if (!patient) {
        return res.status(404).json({ error: "Patient non trouvé" });
      }
      
      res.json(patient);
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la récupération du patient" });
    }
  });

  app.post("/api/patients", async (req, res) => {
    try {
      const validatedData = patientFormSchema.parse(req.body);
      const patient = await storage.createPatient(validatedData);
      res.status(201).json(patient);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ error: validationError.message });
      } else {
        res.status(500).json({ error: "Erreur lors de la création du patient" });
      }
    }
  });

  // Therapist routes
  app.get("/api/therapists", async (req, res) => {
    try {
      const therapists = await storage.getTherapists();
      res.json(therapists);
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la récupération des thérapeutes" });
    }
  });

  app.get("/api/therapists/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID de thérapeute invalide" });
      }
      
      const therapist = await storage.getTherapist(id);
      if (!therapist) {
        return res.status(404).json({ error: "Thérapeute non trouvé" });
      }
      
      res.json(therapist);
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la récupération du thérapeute" });
    }
  });

  // Appointment routes
  app.get("/api/appointments", async (req, res) => {
    try {
      const appointments = await storage.getAppointments();
      res.json(appointments);
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la récupération des rendez-vous" });
    }
  });

  app.get("/api/appointments/patient/:patientId", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      if (isNaN(patientId)) {
        return res.status(400).json({ error: "ID de patient invalide" });
      }
      
      const appointments = await storage.getAppointmentsForPatient(patientId);
      res.json(appointments);
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la récupération des rendez-vous du patient" });
    }
  });

  app.get("/api/appointments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID de rendez-vous invalide" });
      }
      
      const appointment = await storage.getAppointment(id);
      if (!appointment) {
        return res.status(404).json({ error: "Rendez-vous non trouvé" });
      }
      
      res.json(appointment);
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la récupération du rendez-vous" });
    }
  });

  app.post("/api/appointments", async (req, res) => {
    try {
      const validatedData = appointmentFormSchema.parse(req.body);
      
      // Check availability for first appointment
      const isAvailable = await storage.checkAvailability(
        validatedData.therapistId,
        validatedData.date,
        validatedData.time
      );
      
      if (!isAvailable) {
        return res.status(409).json({ error: "Ce créneau horaire est déjà réservé" });
      }
      
      // Handle recurring appointments
      if (validatedData.isRecurring && validatedData.recurringFrequency && validatedData.recurringCount) {
        try {
          const appointments = await storage.createRecurringAppointments(
            validatedData,
            validatedData.recurringFrequency,
            validatedData.recurringCount
          );
          res.status(201).json(appointments);
        } catch (recurringError) {
          console.error("Erreur lors de la création des rendez-vous récurrents:", recurringError);
          res.status(409).json({ 
            error: "Certains créneaux récurrents sont déjà réservés. Veuillez choisir d'autres dates ou horaires." 
          });
        }
      } else {
        // Create single appointment
        const appointment = await storage.createAppointment(validatedData);
        res.status(201).json(appointment);
      }
    } catch (error) {
      console.error("Erreur lors de la création du rendez-vous:", error);
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ error: validationError.message });
      } else {
        res.status(500).json({ error: "Erreur lors de la création du rendez-vous" });
      }
    }
  });

  app.put("/api/appointments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID de rendez-vous invalide" });
      }
      
      const validatedData = appointmentFormSchema.partial().parse(req.body);
      const updatedAppointment = await storage.updateAppointment(id, validatedData);
      
      if (!updatedAppointment) {
        return res.status(404).json({ error: "Rendez-vous non trouvé" });
      }
      
      res.json(updatedAppointment);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ error: validationError.message });
      } else {
        res.status(500).json({ error: "Erreur lors de la mise à jour du rendez-vous" });
      }
    }
  });

  app.delete("/api/appointments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID de rendez-vous invalide" });
      }
      
      const success = await storage.deleteAppointment(id);
      if (!success) {
        return res.status(404).json({ error: "Rendez-vous non trouvé" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la suppression du rendez-vous" });
    }
  });

  // Availability check
  app.get("/api/availability", async (req, res) => {
    try {
      const therapistId = parseInt(req.query.therapistId as string);
      const date = req.query.date as string;
      const time = req.query.time as string;
      
      if (isNaN(therapistId) || !date || !time) {
        return res.status(400).json({ error: "Paramètres invalides" });
      }
      
      const isAvailable = await storage.checkAvailability(therapistId, date, time);
      res.json({ available: isAvailable });
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la vérification de disponibilité" });
    }
  });

  // Invoice routes
  app.get("/api/invoices", async (req, res) => {
    try {
      const invoices = await storage.getInvoices();
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la récupération des factures" });
    }
  });

  app.get("/api/invoices/patient/:patientId", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      if (isNaN(patientId)) {
        return res.status(400).json({ error: "ID de patient invalide" });
      }
      
      const invoices = await storage.getInvoicesForPatient(patientId);
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la récupération des factures du patient" });
    }
  });

  app.get("/api/invoices/therapist/:therapistId", async (req, res) => {
    try {
      const therapistId = parseInt(req.params.therapistId);
      if (isNaN(therapistId)) {
        return res.status(400).json({ error: "ID de thérapeute invalide" });
      }
      
      const invoices = await storage.getInvoicesForTherapist(therapistId);
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la récupération des factures du thérapeute" });
    }
  });

  app.get("/api/invoices/appointment/:appointmentId", async (req, res) => {
    try {
      const appointmentId = parseInt(req.params.appointmentId);
      if (isNaN(appointmentId)) {
        return res.status(400).json({ error: "ID de rendez-vous invalide" });
      }
      
      const invoice = await storage.getInvoiceForAppointment(appointmentId);
      if (!invoice) {
        return res.status(404).json({ error: "Facture non trouvée pour ce rendez-vous" });
      }
      
      res.json(invoice);
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la récupération de la facture" });
    }
  });

  app.get("/api/invoices/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID de facture invalide" });
      }
      
      const invoice = await storage.getInvoice(id);
      if (!invoice) {
        return res.status(404).json({ error: "Facture non trouvée" });
      }
      
      res.json(invoice);
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la récupération de la facture" });
    }
  });

  app.post("/api/invoices", async (req, res) => {
    try {
      const validatedData = insertInvoiceSchema.parse(req.body);
      const invoice = await storage.createInvoice(validatedData);
      res.status(201).json(invoice);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ error: validationError.message });
      } else {
        res.status(500).json({ error: "Erreur lors de la création de la facture" });
      }
    }
  });

  app.put("/api/invoices/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID de facture invalide" });
      }
      
      const validatedData = insertInvoiceSchema.partial().parse(req.body);
      const updatedInvoice = await storage.updateInvoice(id, validatedData);
      
      if (!updatedInvoice) {
        return res.status(404).json({ error: "Facture non trouvée" });
      }
      
      res.json(updatedInvoice);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ error: validationError.message });
      } else {
        res.status(500).json({ error: "Erreur lors de la mise à jour de la facture" });
      }
    }
  });

  app.delete("/api/invoices/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID de facture invalide" });
      }
      
      const success = await storage.deleteInvoice(id);
      if (!success) {
        return res.status(404).json({ error: "Facture non trouvée" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la suppression de la facture" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
