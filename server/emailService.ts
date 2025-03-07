import nodemailer from 'nodemailer';
import { InvoiceWithDetails } from '@shared/schema';

// Création d'un transporteur pour l'envoi d'emails avec Gmail SMTP
export async function getEmailTransporter() {
  // Vérifier que les identifiants Gmail sont disponibles
  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
    throw new Error('Les variables d\'environnement GMAIL_USER et GMAIL_PASS doivent être définies');
  }

  // Créer un transporteur réutilisable utilisant le service Gmail
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });

  return {
    transporter,
    // Pas de prévisualisation URL pour Gmail réel
    previewUrl: (_messageId: string) => undefined,
  };
}

/**
 * Envoie une notification par email lorsqu'une facture est téléchargée
 * @param invoice Détails de la facture téléchargée
 * @returns Informations sur l'email envoyé
 */
export async function sendInvoiceDownloadNotification(invoice: InvoiceWithDetails): Promise<{ success: boolean; messageUrl?: string; error?: any }> {
  try {
    // Créer le transporteur d'email
    const { transporter } = await getEmailTransporter();

    // L'adresse destinataire - à configurer selon vos besoins
    const recipientEmail = 'jarviswriting01@gmail.com';

    // Préparer le contenu de l'email
    const emailContent = `
      <h1>Notification de téléchargement de facture</h1>
      <p>Une facture a été téléchargée par un utilisateur du système.</p>
      <h2>Détails de la facture</h2>
      <ul>
        <li><strong>Numéro de facture:</strong> ${invoice.invoiceNumber}</li>
        <li><strong>Date d'émission:</strong> ${invoice.issueDate}</li>
        <li><strong>Patient:</strong> ${invoice.patientName}</li>
        <li><strong>Orthophoniste:</strong> ${invoice.therapistName}</li>
        <li><strong>Montant:</strong> ${invoice.totalAmount}€</li>
        <li><strong>Statut:</strong> ${invoice.status}</li>
      </ul>
      <p>Ce message est automatique, merci de ne pas y répondre.</p>
    `;

    // Envoyer l'email
    const info = await transporter.sendMail({
      from: `"Cabinet Orthophonie" <${process.env.GMAIL_USER}>`,
      to: recipientEmail,
      subject: `Téléchargement de facture ${invoice.invoiceNumber}`,
      text: `Notification de téléchargement de facture: ${invoice.invoiceNumber} pour ${invoice.patientName}`,
      html: emailContent,
    });

    console.log('Message envoyé: %s', info.messageId);
    console.log(`Notification d'email envoyée pour la facture ${invoice.invoiceNumber}`);
    console.log(`Email envoyé à: ${recipientEmail}`);

    return {
      success: true
    };
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email de notification:', error);
    return {
      success: false,
      error
    };
  }
}