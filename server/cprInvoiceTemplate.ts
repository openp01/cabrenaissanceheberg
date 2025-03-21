import PDFDocument from 'pdfkit';
import { Readable, PassThrough } from 'stream';
import { InvoiceWithDetails, Signature } from '@shared/schema';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * Formatte une date au format français
 * @param dateString Date à formater
 * @returns Date formatée
 */
const formatDate = (dateString: string): string => {
  try {
    return format(new Date(dateString), 'dd MMMM yyyy', { locale: fr });
  } catch (err) {
    return dateString;
  }
};

/**
 * Formatte un montant en euros
 * @param amount Montant à formater
 * @returns Montant formaté
 */
const formatCurrency = (amount: number | string): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(numAmount);
};

/**
 * Formate le statut d'une facture en français
 * @param status Statut de la facture
 * @returns Statut formaté
 */
export function formatInvoiceStatus(status: string): string {
  switch (status.toLowerCase()) {
    case 'paid':
    case 'payée':
      return 'Payée';
    case 'cancelled':
    case 'annulée':
      return 'Annulée';
    case 'pending':
    case 'en attente':
    default:
      return 'En attente';
  }
}

/**
 * Génère un PDF pour une facture selon le template officiel du Cabinet Paramédical de la Renaissance
 * @param invoice Facture avec les détails (patient, thérapeute, rendez-vous)
 * @param adminSignature Signature administrative (optionnel)
 * @returns Stream du PDF généré
 */
export function generateInvoicePDF(
  invoice: InvoiceWithDetails, 
  adminSignature?: Signature | undefined
): PassThrough {
  // Créer un nouveau document PDF
  const doc = new PDFDocument({ 
    size: 'A4', 
    margin: 50,
    bufferPages: true,
    info: {
      Title: `Facture ${invoice.invoiceNumber}`,
      Author: 'Cabinet Paramédical de la Renaissance',
      Subject: `Facture pour ${invoice.patientName}`,
      Keywords: 'facture, santé, soins'
    }
  });
  
  // Utiliser PassThrough au lieu de Readable direct
  const stream = new PassThrough();
  
  // Pipe le PDF dans le stream
  doc.pipe(stream);
  
  // Définir constantes
  const pageWidth = doc.page.width - 100; // Marge de 50 de chaque côté
  const primaryColor = '#3fb549'; // Vert principal
  const darkGreen = '#266d2c'; // Vert foncé
  
  // ==== EN-TÊTE ====
  // Bande verte supérieure
  doc.rect(0, 0, doc.page.width, 110).fill(primaryColor);
  
  // Informations de contact à gauche
  doc.font('Helvetica').fontSize(10).fillColor('white');
  doc.text('Mail: contact@cabinet-renaissance.com', 50, 20);
  doc.text('Tél: +221 33 824 35 50', 50, 35);
  doc.text('Immeuble SAWA', 50, 50);
  doc.text('Bloc B - Étage 2', 50, 65);
  doc.text('1763 Avenue Cheikh A. DIOP', 50, 80);
  doc.text('DAKAR', 50, 95);
  
  // Logo à droite - nous utilisons du texte stylisé pour simuler le logo
  doc.fontSize(18).fillColor('white');
  doc.text('La Renaissance', doc.page.width - 200, 40);
  doc.fontSize(10);
  doc.text('CABINET PARAMÉDICAL', doc.page.width - 200, 65);
  
  // ==== SECTION NUMÉRO DE FACTURE ====
  doc.fillColor('black');
  doc.moveDown(4);
  doc.fontSize(14).font('Helvetica-Bold').text(`FACTURE N° ${invoice.invoiceNumber}`, { align: 'center' });
  
  // ==== SECTION STATUT ET DATE ====
  doc.moveDown(1);
  // Statut
  doc.fontSize(12).fillColor(primaryColor).font('Helvetica-Bold')
    .text('STATUT:', 50, 150);
  doc.fillColor('black').font('Helvetica')
    .text(formatInvoiceStatus(invoice.status), 120, 150);
    
  // Date d'émission  
  doc.fillColor(primaryColor).font('Helvetica-Bold')
    .text('Date d\'émission:', 50, 170);
  doc.fillColor('black').font('Helvetica')
    .text(formatDate(invoice.issueDate), 150, 170);
  
  // ==== SECTION THÉRAPEUTE ET PATIENT ====
  // Afficher le nom du thérapeute à gauche
  doc.fontSize(12).font('Helvetica-Bold')
    .text('THERAPEUTE', 50, 210);
  doc.fontSize(10).font('Helvetica')
    .text(invoice.therapistName, 50, 230);
  
  // Afficher le nom du patient à droite
  doc.fontSize(12).font('Helvetica-Bold')
    .text('PATIENT(E)', 400, 210);
  doc.fontSize(10).font('Helvetica')
    .text(invoice.patientName, 400, 230);
  
  // ==== SECTION OBJET ====
  doc.moveDown(4);
  doc.fontSize(10).font('Helvetica-Bold')
    .text('OBJET:', 50, 270);
  doc.font('Helvetica')
    .text('Facture relative aux prestations paramédicales réalisées par le Cabinet Paramédical de la Renaissance pour la période concernée.', 
      50, 290, { width: pageWidth });
  doc.text('Nous restons à votre disposition pour toute information complémentaire.', 
    50, 320, { width: pageWidth });
  
  // Ligne horizontale
  doc.moveTo(50, 350).lineTo(doc.page.width - 50, 350).stroke();
  
  // ==== SECTION PÉRIODE CONCERNÉE ====
  doc.fontSize(12).font('Helvetica-Bold')
    .text('DATE(S) OU PERIODE CONCERNEE', { align: 'center' });
  
  doc.moveDown(0.5);
  doc.fontSize(10).font('Helvetica')
    .text(`${formatDate(invoice.appointmentDate)} à ${invoice.appointmentTime}`, { align: 'center' });
  
  // Ligne horizontale
  doc.moveDown(1);
  const lineY = doc.y + 10;
  doc.moveTo(50, lineY).lineTo(doc.page.width - 50, lineY).stroke();
  
  // ==== TABLEAU DES ACTES ====
  doc.moveDown(2);
  // En-têtes des colonnes
  doc.fontSize(10).font('Helvetica-Bold');
  doc.text('NATURE DES ACTES', 70, doc.y);
  doc.text('NOMBRE D\'ACTES', 300, doc.y - 12);
  doc.text('TARIF UNITAIRE', 450, doc.y - 12);
  
  // Ligne après les en-têtes
  doc.moveDown(0.5);
  const headerLineY = doc.y + 10;
  doc.moveTo(50, headerLineY).lineTo(doc.page.width - 50, headerLineY).stroke();
  
  // Contenu de la ligne principale (séance)
  doc.moveDown(2);
  doc.fontSize(10).font('Helvetica');
  doc.text('Séance d\'orthophonie', 70, doc.y);
  doc.text('1', 340, doc.y - 12);
  doc.text(formatCurrency(invoice.amount), 460, doc.y - 12);
  
  // Ligne pour les notes
  doc.moveDown(2);
  const notesLineY = doc.y + 10;
  doc.moveTo(50, notesLineY).lineTo(doc.page.width - 50, notesLineY).stroke();
  
  // Notes complémentaires si présentes
  if (invoice.notes) {
    doc.moveDown(1);
    doc.fontSize(10).font('Helvetica-Bold')
      .text('NOTE(S) COMPLEMENTAIRE(S):', 70);
    doc.font('Helvetica')
      .text(invoice.notes, 70, doc.y + 10, { width: pageWidth - 40 });
  } else {
    doc.moveDown(2);
  }
  
  // Ligne avant le total
  doc.moveDown(1);
  const totalLineY = doc.y + 10;
  doc.moveTo(50, totalLineY).lineTo(doc.page.width - 50, totalLineY).stroke();
  
  // ==== SECTION TOTAL ====
  doc.moveDown(2);
  doc.fontSize(12).font('Helvetica-Bold')
    .fillColor(primaryColor)
    .text('TOTAL:', 70);
  doc.fillColor('black')
    .text(formatCurrency(invoice.totalAmount), 130, doc.y - 14);
  
  // ==== SECTION ATTENTION ====
  doc.moveDown(3);
  doc.fontSize(10).font('Helvetica-Bold')
    .fillColor(primaryColor)
    .text('ATTENTION:', 70);
    
  doc.fillColor('black').font('Helvetica')
    .text('• Tout rendez-vous non annulé ou annulé moins de 24h à l\'avance est dû.', 90, doc.y + 10);
  doc.moveDown(0.5);
  doc.text('• Après trois paiements non réalisés ou en retard, le cabinet se réserve le droit d\'interrompre le suivi.', 90);
  
  doc.moveDown(1);
  doc.text('Merci de votre compréhension', { align: 'center' });
  
  // ==== SIGNATURE ====
  // Signature électronique si disponible
  if (adminSignature?.signatureData) {
    // Ajouter la signature
    doc.image(Buffer.from(adminSignature.signatureData.replace(/^data:image\/\w+;base64,/, ''), 'base64'), 
      doc.page.width - 180, doc.y + 20, { width: 120 });
      
    // Tampon "PAYÉ" si la facture est marquée comme payée et qu'un tampon est disponible
    if (invoice.status.toLowerCase() === 'payée' && adminSignature.paidStampData) {
      doc.image(Buffer.from(adminSignature.paidStampData.replace(/^data:image\/\w+;base64,/, ''), 'base64'),
        100, doc.y + 20, { width: 120 });
    }
  }
  
  // ==== PIED DE PAGE ====
  // Position Y pour le pied de page (en bas de la page)
  const footerY = doc.page.height - 50;
  
  // Ligne horizontale pour séparer le pied de page
  doc.moveTo(50, footerY - 10).lineTo(doc.page.width - 50, footerY - 10).stroke();
  
  // Informations légales
  doc.fontSize(8).text(
    'Cabinet paramédical de la renaissance SUARL - NINEA : 007795305 - Registre de Commerce : SN DKR 2020 B5204 - TVA non applicable',
    50, footerY, { align: 'center', width: pageWidth }
  );
  
  // Finaliser le document
  doc.end();
  
  return stream;
}