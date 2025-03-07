import nodemailer from 'nodemailer';
import { Appointment, AppointmentWithDetails, Patient, Therapist } from '@shared/schema';
import { format } from 'date-fns';

// Configurer le transporteur d'emails
// Pour l'environnement de développement, nous utilisons Ethereal Email
// https://ethereal.email/ - un service de test pour le développement
let transporter: nodemailer.Transporter;

// Initialisation du transporteur d'emails
export async function initializeEmailService() {
  try {
    // Créer un compte de test
    const testAccount = await nodemailer.createTestAccount();

    // Créer un transporteur réutilisable qui utilisera SMTP
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false, // true pour 465, false pour les autres ports
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    console.log('Service d\'email initialisé avec succès');
    console.log(`URL de prévisualisation des emails: https://ethereal.email/login`);
    console.log(`Identifiants: ${testAccount.user} / ${testAccount.pass}`);
    
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'initialisation du service d\'email:', error);
    return false;
  }
}

/**
 * Envoie un email de confirmation de rendez-vous au patient
 * @param appointment Rendez-vous avec les détails
 * @param patient Données du patient
 * @param therapist Données du thérapeute
 */
export async function sendAppointmentConfirmationEmail(
  appointment: Appointment,
  patient: Patient,
  therapist: Therapist
): Promise<boolean> {
  if (!transporter) {
    console.error('Le service d\'email n\'est pas initialisé');
    return false;
  }

  const appointmentDate = format(new Date(appointment.date), 'dd/MM/yyyy');
  const patientFullName = `${patient.firstName} ${patient.lastName}`;
  
  try {
    // Vérifier si l'email du patient existe
    const patientEmail = patient.email || 'patient@example.com'; // Fallback pour les tests
    
    // Envoyer l'email
    const info = await transporter.sendMail({
      from: '"Cabinet d\'Orthophonie" <contact@orthophonie-cabinet.fr>',
      to: patientEmail,
      subject: `Confirmation de votre rendez-vous du ${appointmentDate}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
          <h2 style="color: #4a6da7;">Confirmation de Rendez-vous</h2>
          <p>Bonjour ${patientFullName},</p>
          <p>Nous confirmons votre rendez-vous avec ${therapist.name} :</p>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0;">
            <p><strong>Date :</strong> ${appointmentDate}</p>
            <p><strong>Heure :</strong> ${appointment.time}</p>
            <p><strong>Orthophoniste :</strong> ${therapist.name}</p>
            <p><strong>Lieu :</strong> Cabinet d'Orthophonie, 123 Avenue des Soins, 75000 Paris</p>
          </div>
          <p>Si vous avez besoin d'annuler ou de reporter ce rendez-vous, veuillez nous contacter au 01 23 45 67 89 au moins 24 heures à l'avance.</p>
          <p>Nous vous remercions de votre confiance.</p>
          <p>Cordialement,<br>L'équipe du Cabinet d'Orthophonie</p>
        </div>
      `,
    });

    if (info) {
      console.log('Email de confirmation envoyé');
      // Vérifiez si info a messageId avant de l'utiliser
      if (info.messageId) {
        console.log('ID du message:', info.messageId);
      }
      
      // Vérifiez que getTestMessageUrl peut être utilisé avec info
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log('URL de prévisualisation:', previewUrl);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email de confirmation:', error);
    return false;
  }
}

/**
 * Envoie un email de rappel de rendez-vous
 * @param appointmentWithDetails Rendez-vous avec les détails du patient et du thérapeute
 */
export async function sendAppointmentReminderEmail(
  appointmentWithDetails: AppointmentWithDetails
): Promise<boolean> {
  if (!transporter) {
    console.error('Le service d\'email n\'est pas initialisé');
    return false;
  }

  const appointmentDate = format(new Date(appointmentWithDetails.date), 'dd/MM/yyyy');
  
  try {
    // Envoyer l'email
    const info = await transporter.sendMail({
      from: '"Cabinet d\'Orthophonie" <contact@orthophonie-cabinet.fr>',
      to: appointmentWithDetails.patientEmail || 'patient@example.com', // Fallback pour les tests
      subject: `Rappel : Votre rendez-vous du ${appointmentDate}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
          <h2 style="color: #4a6da7;">Rappel de Rendez-vous</h2>
          <p>Bonjour ${appointmentWithDetails.patientName},</p>
          <p>Nous vous rappelons votre rendez-vous avec ${appointmentWithDetails.therapistName} :</p>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0;">
            <p><strong>Date :</strong> ${appointmentDate}</p>
            <p><strong>Heure :</strong> ${appointmentWithDetails.time}</p>
            <p><strong>Orthophoniste :</strong> ${appointmentWithDetails.therapistName}</p>
            <p><strong>Lieu :</strong> Cabinet d'Orthophonie, 123 Avenue des Soins, 75000 Paris</p>
          </div>
          <p>Si vous avez besoin d'annuler ou de reporter ce rendez-vous, veuillez nous contacter au 01 23 45 67 89 dès que possible.</p>
          <p>Nous vous remercions de votre confiance.</p>
          <p>Cordialement,<br>L'équipe du Cabinet d'Orthophonie</p>
        </div>
      `,
    });

    if (info) {
      console.log('Email de rappel envoyé');
      // Vérifiez si info a messageId avant de l'utiliser
      if (info.messageId) {
        console.log('ID du message:', info.messageId);
      }
      
      // Vérifiez que getTestMessageUrl peut être utilisé avec info
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log('URL de prévisualisation:', previewUrl);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email de rappel:', error);
    return false;
  }
}

/**
 * Envoie un email d'annulation de rendez-vous
 * @param appointmentWithDetails Rendez-vous avec les détails du patient et du thérapeute
 */
export async function sendAppointmentCancellationEmail(
  appointmentWithDetails: AppointmentWithDetails
): Promise<boolean> {
  if (!transporter) {
    console.error('Le service d\'email n\'est pas initialisé');
    return false;
  }

  const appointmentDate = format(new Date(appointmentWithDetails.date), 'dd/MM/yyyy');
  
  try {
    // Envoyer l'email
    const info = await transporter.sendMail({
      from: '"Cabinet d\'Orthophonie" <contact@orthophonie-cabinet.fr>',
      to: appointmentWithDetails.patientEmail || 'patient@example.com', // Fallback pour les tests
      subject: `Annulation de votre rendez-vous du ${appointmentDate}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
          <h2 style="color: #e74c3c;">Annulation de Rendez-vous</h2>
          <p>Bonjour ${appointmentWithDetails.patientName},</p>
          <p>Nous vous informons que votre rendez-vous a été annulé :</p>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0;">
            <p><strong>Date :</strong> ${appointmentDate}</p>
            <p><strong>Heure :</strong> ${appointmentWithDetails.time}</p>
            <p><strong>Orthophoniste :</strong> ${appointmentWithDetails.therapistName}</p>
          </div>
          <p>Pour reprogrammer un rendez-vous, veuillez nous contacter au 01 23 45 67 89.</p>
          <p>Nous vous prions de nous excuser pour tout inconvénient que cela pourrait causer.</p>
          <p>Cordialement,<br>L'équipe du Cabinet d'Orthophonie</p>
        </div>
      `,
    });

    if (info) {
      console.log('Email d\'annulation envoyé');
      // Vérifiez si info a messageId avant de l'utiliser
      if (info.messageId) {
        console.log('ID du message:', info.messageId);
      }
      
      // Vérifiez que getTestMessageUrl peut être utilisé avec info
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log('URL de prévisualisation:', previewUrl);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email d\'annulation:', error);
    return false;
  }
}