import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { 
  insertPatientSchema, 
  patientFormSchema, 
  appointmentFormSchema, 
  insertInvoiceSchema,
  insertExpenseSchema,
  expenseFormSchema,
  insertTherapistPaymentSchema,
  UserRole
} from "@shared/schema";
import { z } from "zod";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { 
  generateInvoicePDF,
  generateTherapistPaymentsPDF,
  generateExpensesPDF
} from "./pdfGenerator";
import { sendInvoiceDownloadNotification } from "./emailService";
import { setupAuth } from "./auth";
import { 
  isAuthenticated, 
  isAdmin, 
  isAdminStaff,
  isTherapistOwner,
  AuthenticatedRequest
} from "./authMiddleware";

export async function registerRoutes(app: Express): Promise<Server> {
  // Configurer l'authentification
  setupAuth(app);
  
  // API routes with prefix /api
  
  // Patient routes
  app.get("/api/patients", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const patients = await storage.getPatients();
      res.json(patients);
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la récupération des patients" });
    }
  });

  app.get("/api/patients/search", isAuthenticated, async (req: Request, res: Response) => {
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
      
      console.log(`Tentative de suppression du rendez-vous ${id}`);
      const success = await storage.deleteAppointment(id);
      if (!success) {
        return res.status(404).json({ error: "Rendez-vous non trouvé" });
      }
      
      console.log(`Rendez-vous ${id} supprimé avec succès`);
      res.status(204).send();
    } catch (error) {
      console.error(`Erreur détaillée lors de la suppression du rendez-vous ${req.params.id}:`, error);
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
  
  // Endpoint pour télécharger ou prévisualiser la facture au format PDF
  app.get("/api/invoices/:id/pdf", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID de facture invalide" });
      }
      
      // Vérifier si c'est une prévisualisation ou un téléchargement
      const isPreview = req.query.preview === 'true';
      
      // Récupérer la facture avec tous les détails nécessaires pour le PDF
      const invoicesWithDetails = await storage.getInvoices();
      const invoice = invoicesWithDetails.find(inv => inv.id === id);
      
      if (!invoice) {
        return res.status(404).json({ error: "Facture non trouvée" });
      }
      
      // Définir les en-têtes de réponse en fonction du mode (prévisualisation ou téléchargement)
      res.setHeader('Content-Type', 'application/pdf');
      
      if (isPreview) {
        // Pour la prévisualisation, afficher dans le navigateur
        res.setHeader('Content-Disposition', `inline; filename="facture-${invoice.invoiceNumber}.pdf"`);
      } else {
        // Pour le téléchargement, forcer le téléchargement
        res.setHeader('Content-Disposition', `attachment; filename="facture-${invoice.invoiceNumber}.pdf"`);
        
        // Envoyer une notification par email seulement pour les téléchargements (pas les prévisualisations)
        sendInvoiceDownloadNotification(invoice)
          .then(emailResult => {
            if (emailResult.success) {
              console.log(`Notification d'email envoyée pour la facture ${invoice.invoiceNumber}`);
            } else {
              console.error(`Échec de l'envoi de la notification pour la facture ${invoice.invoiceNumber}:`, emailResult.error);
            }
          })
          .catch(err => {
            console.error(`Erreur lors de l'envoi de la notification par email:`, err);
          });
      }
      
      // Générer le PDF et le transmettre directement au client
      const pdfStream = await generateInvoicePDF(invoice);
      pdfStream.pipe(res);
      
    } catch (error) {
      console.error("Erreur lors de la génération du PDF de la facture:", error);
      res.status(500).json({ error: "Erreur lors de la génération du PDF de la facture" });
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
  
  // Endpoint pour envoyer une facture par email
  app.get("/api/invoices/:id/send-email", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID de facture invalide" });
      }
      
      // Récupérer la facture avec tous les détails nécessaires
      const invoicesWithDetails = await storage.getInvoices();
      const invoice = invoicesWithDetails.find(inv => inv.id === id);
      
      if (!invoice) {
        return res.status(404).json({ error: "Facture non trouvée" });
      }
      
      // Envoyer la facture par email
      const emailResult = await sendInvoiceDownloadNotification(invoice);
      
      if (emailResult.success) {
        res.status(200).json({ message: "Facture envoyée par email avec succès" });
      } else {
        throw new Error(emailResult.error || "Erreur lors de l'envoi de l'email");
      }
    } catch (error) {
      console.error("Erreur lors de l'envoi de la facture par email:", error);
      res.status(500).json({ error: "Erreur lors de l'envoi de la facture par email" });
    }
  });

  // Therapist Payment routes
  app.get("/api/therapist-payments", async (req, res) => {
    try {
      const payments = await storage.getTherapistPayments();
      res.json(payments);
    } catch (error) {
      console.error("Erreur lors de la récupération des paiements aux thérapeutes:", error);
      res.status(500).json({ error: "Erreur lors de la récupération des paiements aux thérapeutes" });
    }
  });

  app.get("/api/therapist-payments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID de paiement invalide" });
      }
      
      const payment = await storage.getTherapistPayment(id);
      if (!payment) {
        return res.status(404).json({ error: "Paiement non trouvé" });
      }
      
      res.json(payment);
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la récupération du paiement" });
    }
  });

  app.get("/api/therapist-payments/therapist/:therapistId", async (req, res) => {
    try {
      const therapistId = parseInt(req.params.therapistId);
      if (isNaN(therapistId)) {
        return res.status(400).json({ error: "ID de thérapeute invalide" });
      }
      
      const payments = await storage.getTherapistPaymentsForTherapist(therapistId);
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la récupération des paiements du thérapeute" });
    }
  });

  app.post("/api/therapist-payments", async (req, res) => {
    try {
      // Validation des données
      const validatedData = insertTherapistPaymentSchema.parse(req.body);
      const payment = await storage.createTherapistPayment(validatedData);
      res.status(201).json(payment);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ error: validationError.message });
      } else {
        console.error("Erreur lors de la création du paiement:", error);
        res.status(500).json({ error: "Erreur lors de la création du paiement" });
      }
    }
  });

  app.post("/api/create-payment-from-invoice/:invoiceId", async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.invoiceId);
      if (isNaN(invoiceId)) {
        return res.status(400).json({ error: "ID de facture invalide" });
      }
      
      const payment = await storage.createPaymentFromInvoice(invoiceId);
      if (!payment) {
        return res.status(404).json({ 
          error: "Impossible de créer un paiement. La facture n'existe pas ou n'est pas marquée comme payée." 
        });
      }
      
      res.status(201).json(payment);
    } catch (error) {
      console.error("Erreur lors de la création du paiement depuis la facture:", error);
      res.status(500).json({ error: "Erreur lors de la création du paiement depuis la facture" });
    }
  });

  // Expense routes
  app.get("/api/expenses", async (req, res) => {
    try {
      const expenses = await storage.getExpenses();
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la récupération des dépenses" });
    }
  });

  app.get("/api/expenses/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID de dépense invalide" });
      }
      
      const expense = await storage.getExpense(id);
      if (!expense) {
        return res.status(404).json({ error: "Dépense non trouvée" });
      }
      
      res.json(expense);
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la récupération de la dépense" });
    }
  });

  app.get("/api/expenses/category/:category", async (req, res) => {
    try {
      const category = req.params.category;
      const expenses = await storage.getExpensesByCategory(category);
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la récupération des dépenses par catégorie" });
    }
  });

  app.get("/api/expenses/date-range", async (req, res) => {
    try {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "Les dates de début et de fin sont requises" });
      }
      
      const expenses = await storage.getExpensesByDateRange(startDate, endDate);
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la récupération des dépenses par plage de dates" });
    }
  });

  app.post("/api/expenses", async (req, res) => {
    try {
      console.log("Requête reçue pour créer une dépense:", req.body);
      const validatedData = expenseFormSchema.parse(req.body);
      
      // Convertir le montant en string pour satisfaire le schema
      const adaptedData = {
        ...validatedData,
        amount: validatedData.amount.toString()
      };
      
      console.log("Données validées:", adaptedData);
      const expense = await storage.createExpense(adaptedData);
      console.log("Dépense créée:", expense);
      res.status(201).json(expense);
    } catch (error) {
      console.error("Erreur lors de la création de la dépense:", error);
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        console.error("Erreur de validation:", validationError);
        res.status(400).json({ error: validationError.message });
      } else {
        res.status(500).json({ error: "Erreur lors de la création de la dépense" });
      }
    }
  });

  app.put("/api/expenses/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID de dépense invalide" });
      }
      
      const validatedData = expenseFormSchema.partial().parse(req.body);
      
      // Convertir le montant en string pour satisfaire le schema si présent
      const adaptedData = {
        ...validatedData,
        amount: validatedData.amount !== undefined ? validatedData.amount.toString() : undefined
      };
      
      const updatedExpense = await storage.updateExpense(id, adaptedData);
      
      if (!updatedExpense) {
        return res.status(404).json({ error: "Dépense non trouvée" });
      }
      
      res.json(updatedExpense);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ error: validationError.message });
      } else {
        res.status(500).json({ error: "Erreur lors de la mise à jour de la dépense" });
      }
    }
  });

  app.post("/api/expenses/:id/receipt", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID de dépense invalide" });
      }
      
      const { fileUrl } = req.body;
      if (!fileUrl) {
        return res.status(400).json({ error: "URL du fichier requise" });
      }
      
      const updatedExpense = await storage.saveExpenseReceipt(id, fileUrl);
      
      if (!updatedExpense) {
        return res.status(404).json({ error: "Dépense non trouvée" });
      }
      
      res.json(updatedExpense);
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de l'ajout du justificatif" });
    }
  });

  app.delete("/api/expenses/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID de dépense invalide" });
      }
      
      const success = await storage.deleteExpense(id);
      if (!success) {
        return res.status(404).json({ error: "Dépense non trouvée" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la suppression de la dépense" });
    }
  });

  // Endpoints pour l'exportation PDF pour la comptabilité
  
  // Exportation des paiements aux thérapeutes en PDF
  app.get("/api/therapist-payments/export/pdf", async (req, res) => {
    try {
      // Extraire les dates de début et fin pour filtrer si elles sont spécifiées
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      
      // Récupérer tous les paiements ou filtrer par date si spécifié
      let filteredPayments;
      if (startDate && endDate) {
        filteredPayments = await storage.getTherapistPaymentsByDateRange(startDate, endDate);
      } else {
        filteredPayments = await storage.getTherapistPayments();
      }
      
      // Filtrer par thérapeute si spécifié
      const therapistId = req.query.therapistId as string;
      if (therapistId && !isNaN(parseInt(therapistId))) {
        const therapistIdNum = parseInt(therapistId);
        filteredPayments = filteredPayments.filter(payment => payment.therapistId === therapistIdNum);
        
        // Si après filtrage il n'y a pas de paiements, on renvoie un message
        if (filteredPayments.length === 0) {
          return res.status(404).json({ error: "Aucun paiement trouvé pour ce thérapeute durant cette période" });
        }
      }
      
      // Définir le titre personnalisé si spécifié
      const customTitle = req.query.title as string || 'RELEVÉ DES PAIEMENTS AUX THÉRAPEUTES';
      
      // Récupérer le nom du thérapeute pour le nom du fichier si spécifié
      let filenameTherapist = '';
      if (therapistId && !isNaN(parseInt(therapistId))) {
        const therapist = await storage.getTherapist(parseInt(therapistId));
        if (therapist) {
          filenameTherapist = `-${therapist.name.replace(/\s+/g, '-')}`;
        }
      }
      
      // Définir les en-têtes de réponse pour le téléchargement du PDF
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="paiements-therapeutes${filenameTherapist}-${new Date().toISOString().slice(0, 10)}.pdf"`);
      
      // Générer un sous-titre avec la période ou le thérapeute
      let subtitle = 'Document pour la comptabilité';
      if (startDate && endDate) {
        const formatDate = (dateStr: string) => {
          const date = new Date(dateStr);
          return date.toLocaleDateString('fr-FR');
        };
        subtitle = `Période du ${formatDate(startDate)} au ${formatDate(endDate)}`;
      }
      
      // Générer le PDF et le transmettre directement au client
      const pdfStream = await generateTherapistPaymentsPDF(
        filteredPayments,
        customTitle,
        subtitle,
        startDate,
        endDate
      );
      
      pdfStream.pipe(res);
    } catch (error) {
      console.error("Erreur lors de la génération du PDF des paiements:", error);
      res.status(500).json({ error: "Erreur lors de la génération du PDF des paiements" });
    }
  });
  
  // Exportation des dépenses en PDF
  app.get("/api/expenses/export/pdf", async (req, res) => {
    try {
      // Récupérer toutes les dépenses
      let expenses = await storage.getExpenses();
      
      // Extraire les dates de début et fin pour filtrer si elles sont spécifiées
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      
      // Filtrer par date si les dates sont spécifiées
      if (startDate && endDate) {
        expenses = await storage.getExpensesByDateRange(startDate, endDate);
      }
      
      // Filtrer par catégorie si spécifié
      const category = req.query.category as string;
      if (category) {
        expenses = await storage.getExpensesByCategory(category);
      }
      
      // Définir le titre personnalisé si spécifié
      const customTitle = req.query.title as string || 'REGISTRE DES DÉPENSES';
      
      // Définir les en-têtes de réponse pour le téléchargement du PDF
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="depenses-${new Date().toISOString().slice(0, 10)}.pdf"`);
      
      // Générer le PDF et le transmettre directement au client
      const pdfStream = await generateExpensesPDF(
        expenses,
        customTitle,
        'Document pour la comptabilité',
        startDate,
        endDate
      );
      
      pdfStream.pipe(res);
    } catch (error) {
      console.error("Erreur lors de la génération du PDF des dépenses:", error);
      res.status(500).json({ error: "Erreur lors de la génération du PDF des dépenses" });
    }
  });

  // Gestion des templates de facture
  app.post("/api/create-invoice-templates-table", isAdmin, async (req, res) => {
    try {
      // Création de la table des templates de facture
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
      
      // Ajout d'une colonne template_id à la table invoices
      await db.execute(`
        ALTER TABLE invoices 
        ADD COLUMN IF NOT EXISTS template_id INTEGER REFERENCES invoice_templates(id),
        ADD COLUMN IF NOT EXISTS signature_image_url TEXT;
      `);
      
      // Création de la table des signatures
      await db.execute(`
        CREATE TABLE IF NOT EXISTS signatures (
          id SERIAL PRIMARY KEY,
          therapist_id INTEGER NOT NULL REFERENCES therapists(id) ON DELETE CASCADE,
          signature_data TEXT NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);
      
      // Création d'un template par défaut
      const templateCount = await db.execute(`SELECT COUNT(*) FROM invoice_templates WHERE is_default = true`);
      
      if (templateCount.rows[0].count === '0') {
        await db.execute(`
          INSERT INTO invoice_templates (
            name, description, header_content, footer_content, primary_color, secondary_color, 
            font_family, show_therapist_signature, is_default
          ) VALUES (
            'Template standard', 
            'Template par défaut pour les factures',
            '<div style="text-align: center; margin-bottom: 20px;">
              <h1>Cabinet d''Orthophonie</h1>
              <p>123 Rue de la Santé, 75000 Paris</p>
              <p>Tél: 01 23 45 67 89 - Email: contact@ortho-cabinet.fr</p>
            </div>',
            '<div style="text-align: center; font-size: 12px; margin-top: 30px; color: #666;">
              <p>SIRET: 123 456 789 00010 - N° ADELI: 759912345</p>
              <p>Paiement à réception - TVA non applicable, article 293B du CGI</p>
            </div>',
            '#4f46e5',
            '#6366f1',
            'Arial, sans-serif',
            true,
            true
          );
        `);
      }
      
      res.status(200).json({ message: 'Tables créées avec succès' });
    } catch (error) {
      console.error('Erreur lors de la création des tables:', error);
      res.status(500).json({ error: 'Erreur lors de la création des tables' });
    }
  });
  
  // Récupération de tous les templates
  app.get("/api/invoice-templates", isAdminStaff, async (req, res) => {
    try {
      const templates = await db.execute('SELECT * FROM invoice_templates ORDER BY is_default DESC, name ASC');
      res.json(templates.rows);
    } catch (error) {
      console.error('Erreur lors de la récupération des templates:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération des templates' });
    }
  });
  
  // Récupération d'un template par ID
  app.get("/api/invoice-templates/:id", isAdminStaff, async (req, res) => {
    try {
      const { id } = req.params;
      const templates = await db.execute('SELECT * FROM invoice_templates WHERE id = $1', [id]);
      
      if (templates.rows.length === 0) {
        return res.status(404).json({ error: 'Template non trouvé' });
      }
      
      res.json(templates.rows[0]);
    } catch (error) {
      console.error('Erreur lors de la récupération du template:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération du template' });
    }
  });
  
  // Récupération du template par défaut
  app.get("/api/invoice-templates/default", async (req, res) => {
    try {
      const templates = await db.execute('SELECT * FROM invoice_templates WHERE is_default = true');
      
      if (templates.rows.length === 0) {
        return res.status(404).json({ error: 'Aucun template par défaut trouvé' });
      }
      
      res.json(templates.rows[0]);
    } catch (error) {
      console.error('Erreur lors de la récupération du template par défaut:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération du template par défaut' });
    }
  });
  
  // Création d'un nouveau template
  app.post("/api/invoice-templates", isAdminStaff, async (req, res) => {
    try {
      const { 
        name, description, headerContent, footerContent, logoUrl, primaryColor, 
        secondaryColor, fontFamily, showTherapistSignature, isDefault 
      } = req.body;
      
      // Si le template est défini comme par défaut, mettre à jour les autres templates
      if (isDefault) {
        await db.execute('UPDATE invoice_templates SET is_default = false');
      }
      
      const result = await db.execute(
        `INSERT INTO invoice_templates (
          name, description, header_content, footer_content, logo_url, primary_color, 
          secondary_color, font_family, show_therapist_signature, is_default
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [
          name, description, headerContent, footerContent, logoUrl, primaryColor, 
          secondaryColor, fontFamily, showTherapistSignature, isDefault
        ]
      );
      
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Erreur lors de la création du template:', error);
      res.status(500).json({ error: 'Erreur lors de la création du template' });
    }
  });
  
  // Mise à jour d'un template
  app.put("/api/invoice-templates/:id", isAdminStaff, async (req, res) => {
    try {
      const { id } = req.params;
      const { 
        name, description, headerContent, footerContent, logoUrl, primaryColor, 
        secondaryColor, fontFamily, showTherapistSignature, isDefault 
      } = req.body;
      
      // Si le template est défini comme par défaut, mettre à jour les autres templates
      if (isDefault) {
        await db.execute('UPDATE invoice_templates SET is_default = false');
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
          name, description, headerContent, footerContent, logoUrl, primaryColor, 
          secondaryColor, fontFamily, showTherapistSignature, isDefault, id
        ]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Template non trouvé' });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Erreur lors de la mise à jour du template:', error);
      res.status(500).json({ error: 'Erreur lors de la mise à jour du template' });
    }
  });
  
  // Définition d'un template comme template par défaut
  app.put("/api/invoice-templates/:id/set-default", isAdminStaff, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Mettre à jour tous les templates pour désactiver le statut par défaut
      await db.execute('UPDATE invoice_templates SET is_default = false');
      
      // Définir le template spécifié comme par défaut
      const result = await db.execute(
        'UPDATE invoice_templates SET is_default = true WHERE id = $1 RETURNING *',
        [id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Template non trouvé' });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Erreur lors de la définition du template par défaut:', error);
      res.status(500).json({ error: 'Erreur lors de la définition du template par défaut' });
    }
  });
  
  // Suppression d'un template
  app.delete("/api/invoice-templates/:id", isAdminStaff, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Vérifier si le template est par défaut
      const checkDefault = await db.execute('SELECT is_default FROM invoice_templates WHERE id = $1', [id]);
      
      if (checkDefault.rows.length === 0) {
        return res.status(404).json({ error: 'Template non trouvé' });
      }
      
      if (checkDefault.rows[0].is_default) {
        return res.status(400).json({ error: 'Impossible de supprimer le template par défaut' });
      }
      
      await db.execute('DELETE FROM invoice_templates WHERE id = $1', [id]);
      
      res.status(204).end();
    } catch (error) {
      console.error('Erreur lors de la suppression du template:', error);
      res.status(500).json({ error: 'Erreur lors de la suppression du template' });
    }
  });
  
  // Routes pour les signatures électroniques
  
  // Enregistrement d'une signature
  app.post("/api/signatures", async (req, res) => {
    try {
      const { therapistId, signatureData } = req.body;
      
      // Vérifier si une signature existe déjà pour ce thérapeute
      const existingSignature = await db.execute(
        'SELECT * FROM signatures WHERE therapist_id = $1',
        [therapistId]
      );
      
      let result;
      
      if (existingSignature.rows.length > 0) {
        // Mettre à jour la signature existante
        result = await db.execute(
          `UPDATE signatures SET 
            signature_data = $1, 
            updated_at = NOW()
          WHERE therapist_id = $2 RETURNING *`,
          [signatureData, therapistId]
        );
      } else {
        // Créer une nouvelle signature
        result = await db.execute(
          `INSERT INTO signatures (
            therapist_id, signature_data
          ) VALUES ($1, $2) RETURNING *`,
          [therapistId, signatureData]
        );
      }
      
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement de la signature:', error);
      res.status(500).json({ error: 'Erreur lors de l\'enregistrement de la signature' });
    }
  });
  
  // Récupération de la signature d'un thérapeute
  app.get("/api/signatures/:therapistId", async (req, res) => {
    try {
      const { therapistId } = req.params;
      
      const signatures = await db.execute(
        'SELECT * FROM signatures WHERE therapist_id = $1',
        [therapistId]
      );
      
      if (signatures.rows.length === 0) {
        return res.status(404).json({ error: 'Signature non trouvée' });
      }
      
      res.json(signatures.rows[0]);
    } catch (error) {
      console.error('Erreur lors de la récupération de la signature:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération de la signature' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
