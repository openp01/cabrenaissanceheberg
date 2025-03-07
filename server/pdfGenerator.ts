import PDFDocument from 'pdfkit';
import { Readable, PassThrough } from 'stream';
import { Invoice, InvoiceWithDetails } from '@shared/schema';
import { format } from 'date-fns';

/**
 * Génère un PDF pour une facture
 * @param invoice Facture avec les détails (patient, thérapeute, rendez-vous)
 * @returns Stream du PDF généré
 */
export async function generateInvoicePDF(invoice: InvoiceWithDetails): Promise<PassThrough> {
  // Créer un nouveau document PDF
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  
  // Utiliser PassThrough au lieu de Readable direct
  const stream = new PassThrough();
  
  // Pipe le PDF dans le stream
  doc.pipe(stream);
  
  // Ajouter l'en-tête
  doc.fontSize(25).text('CABINET D\'ORTHOPHONIE', { align: 'center' });
  doc.moveDown();
  doc.fontSize(18).text('FACTURE', { align: 'center' });
  doc.moveDown();
  
  // Informations de la facture
  doc.fontSize(12).text(`Numéro de facture: ${invoice.invoiceNumber}`);
  doc.text(`Date d'émission: ${invoice.issueDate}`);
  doc.text(`Date d'échéance: ${invoice.dueDate}`);
  doc.text(`Statut: ${invoice.status}`);
  doc.moveDown();
  
  // Information du patient
  doc.fontSize(14).text('Patient:');
  doc.fontSize(12).text(`Nom: ${invoice.patientName}`);
  doc.moveDown();
  
  // Information du thérapeute
  doc.fontSize(14).text('Orthophoniste:');
  doc.fontSize(12).text(`Nom: ${invoice.therapistName}`);
  doc.moveDown();
  
  // Détails du rendez-vous
  doc.fontSize(14).text('Détails de la prestation:');
  
  if (invoice.appointmentDate !== 'N/A') {
    doc.fontSize(12).text(`Date du rendez-vous: ${invoice.appointmentDate}`);
    doc.text(`Heure du rendez-vous: ${invoice.appointmentTime}`);
  }
  
  // Si des notes sont présentes, les afficher (notamment pour les factures groupées)
  if (invoice.notes) {
    doc.text(`Notes: ${invoice.notes}`);
  }
  
  doc.moveDown();
  
  // Tableau des prestations
  const tableTop = 350;
  const tableLeft = 50;
  const tableRight = 550;
  const rowHeight = 30;
  
  // En-têtes du tableau
  doc.font('Helvetica-Bold');
  doc.text('Description', tableLeft, tableTop);
  doc.text('Montant', tableRight - 100, tableTop, { width: 100, align: 'right' });
  doc.moveTo(tableLeft, tableTop + 20).lineTo(tableRight, tableTop + 20).stroke();
  
  // Ligne avec la prestation
  const descriptionText = invoice.notes && invoice.notes.includes('Facture groupée') 
    ? 'Séances d\'orthophonie (facturation groupée)' 
    : 'Séance d\'orthophonie';
  
  doc.font('Helvetica');
  doc.text(descriptionText, tableLeft, tableTop + 30);
  doc.text(`${invoice.amount} €`, tableRight - 100, tableTop + 30, { width: 100, align: 'right' });
  
  // TVA si applicable (généralement pas de TVA pour les actes médicaux)
  if (parseFloat(invoice.taxRate) > 0) {
    doc.text(`TVA (${invoice.taxRate}%)`, tableLeft, tableTop + 60);
    const taxAmount = (parseFloat(invoice.amount) * parseFloat(invoice.taxRate) / 100).toFixed(2);
    doc.text(`${taxAmount} €`, tableRight - 100, tableTop + 60, { width: 100, align: 'right' });
  }
  
  // Ligne de séparation avant le total
  doc.moveTo(tableLeft, tableTop + 90).lineTo(tableRight, tableTop + 90).stroke();
  
  // Total
  doc.font('Helvetica-Bold');
  doc.text('TOTAL', tableLeft, tableTop + 100);
  doc.text(`${invoice.totalAmount} €`, tableRight - 100, tableTop + 100, { width: 100, align: 'right' });
  
  // Pied de page
  const footerY = 700;
  doc.font('Helvetica');
  doc.fontSize(10).text('Merci pour votre confiance.', { align: 'center' });
  doc.moveDown();
  doc.text('Cette facture est générée par le système de gestion du cabinet d\'orthophonie.', { align: 'center' });
  doc.text('Pour toute question, veuillez contacter le secrétariat.', { align: 'center' });
  
  // Finaliser le document
  doc.end();
  
  return stream;
}