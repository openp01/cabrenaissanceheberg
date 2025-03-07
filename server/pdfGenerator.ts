import PDFDocument from 'pdfkit';
import { Readable, PassThrough } from 'stream';
import { 
  Invoice, 
  InvoiceWithDetails, 
  TherapistPaymentWithDetails,
  Expense
} from '@shared/schema';
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

/**
 * Génère un PDF pour la liste des paiements aux thérapeutes
 * @param payments Liste des paiements 
 * @param title Titre du document
 * @param subtitle Sous-titre
 * @param startDate Date de début de la période (optionnel)
 * @param endDate Date de fin de la période (optionnel)
 * @returns Stream du PDF généré
 */
export async function generateTherapistPaymentsPDF(
  payments: TherapistPaymentWithDetails[], 
  title: string = 'RELEVÉ DES PAIEMENTS AUX THÉRAPEUTES',
  subtitle: string = 'Document pour la comptabilité',
  startDate?: string,
  endDate?: string
): Promise<PassThrough> {
  // Créer un nouveau document PDF
  const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
  
  // Utiliser PassThrough
  const stream = new PassThrough();
  
  // Pipe le PDF dans le stream
  doc.pipe(stream);
  
  // Ajouter l'en-tête
  doc.fontSize(18).text(title, { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(14).text(subtitle, { align: 'center' });
  doc.moveDown();
  
  // Ajouter la date de génération
  const today = format(new Date(), 'dd MMMM yyyy', { locale: fr });
  doc.fontSize(10).text(`Document généré le ${today}`, { align: 'right' });
  
  // Période si fournie
  if (startDate && endDate) {
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Période: du ${formatDate(startDate)} au ${formatDate(endDate)}`, { align: 'center' });
  }
  doc.moveDown();
  
  // Calculer le montant total
  const totalAmount = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  
  // Ajouter une boîte avec le montant total
  doc.rect(50, doc.y, 495, 50).fillAndStroke('#f3f4f6', '#e5e7eb');
  doc.fillColor('#000');
  doc.fontSize(12).text('Montant total des paiements:', 70, doc.y - 40);
  doc.fontSize(16).text(formatCurrency(totalAmount), 350, doc.y - 40, { align: 'right' });
  doc.moveDown(2.5);
  
  // Préparer le tableau
  const startY = doc.y;
  const colWidths = [110, 140, 120, 120];
  const colPositions = [
    50, // Thérapeute
    50 + colWidths[0], // Facture/Patient
    50 + colWidths[0] + colWidths[1], // Date de paiement
    50 + colWidths[0] + colWidths[1] + colWidths[2], // Montant
  ];
  const rowHeight = 30;
  
  // En-têtes du tableau
  doc.font('Helvetica-Bold').fontSize(12);
  doc.text('Thérapeute', colPositions[0], startY, { width: colWidths[0] });
  doc.text('Facture / Patient', colPositions[1], startY, { width: colWidths[1] });
  doc.text('Date de paiement', colPositions[2], startY, { width: colWidths[2] });
  doc.text('Montant', colPositions[3], startY, { width: colWidths[3], align: 'right' });
  
  // Ligne de séparation après les en-têtes
  doc.moveTo(50, startY + 20).lineTo(545, startY + 20).stroke();
  
  // Paramètres pour la pagination
  let currentY = startY + 25;
  const itemsPerPage = 20;
  let itemCount = 0;
  let pageCount = 1;
  
  // Fonction pour ajouter une page
  const addPage = () => {
    doc.addPage();
    pageCount++;
    currentY = 50; // Reset Y position for new page
    
    // Ajouter en-tête de continuation
    doc.fontSize(14).text('RELEVÉ DES PAIEMENTS (suite)', { align: 'center' });
    doc.moveDown();
    
    // Répéter les en-têtes de colonnes
    doc.font('Helvetica-Bold').fontSize(12);
    doc.text('Thérapeute', colPositions[0], currentY, { width: colWidths[0] });
    doc.text('Facture / Patient', colPositions[1], currentY, { width: colWidths[1] });
    doc.text('Date de paiement', colPositions[2], currentY, { width: colWidths[2] });
    doc.text('Montant', colPositions[3], currentY, { width: colWidths[3], align: 'right' });
    
    // Ligne de séparation après les en-têtes
    doc.moveTo(50, currentY + 20).lineTo(545, currentY + 20).stroke();
    
    currentY += 25;
  };
  
  // Ajouter les données
  doc.font('Helvetica').fontSize(10);
  
  payments.forEach((payment, index) => {
    // Vérifier si nous avons besoin d'une nouvelle page
    if (itemCount >= itemsPerPage) {
      addPage();
      itemCount = 0;
    }
    
    // Ajouter une ombre de ligne alternée
    if (index % 2 === 0) {
      doc.rect(50, currentY - 5, 495, rowHeight).fill('#f9fafb');
      doc.fillColor('#000');
    }
    
    // Nom du thérapeute
    doc.text(payment.therapistName, colPositions[0], currentY, { width: colWidths[0] });
    
    // Facture et patient
    const invoiceAndPatient = `N° ${payment.invoiceNumber}\n${payment.patientName}`;
    doc.text(invoiceAndPatient, colPositions[1], currentY, { width: colWidths[1] });
    
    // Date de paiement
    doc.text(formatDate(payment.paymentDate), colPositions[2], currentY, { width: colWidths[2] });
    
    // Montant
    doc.text(formatCurrency(payment.amount), colPositions[3], currentY, { width: colWidths[3], align: 'right' });
    
    currentY += rowHeight;
    itemCount++;
  });
  
  // Ajouter la numérotation des pages
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    doc.fontSize(8).text(
      `Page ${i + 1} sur ${pages.count}`,
      50,
      doc.page.height - 50,
      { align: 'center' }
    );
  }
  
  // Pied de page
  doc.fontSize(10).text(
    'Document généré automatiquement par le système de gestion du cabinet d\'orthophonie.',
    50,
    doc.page.height - 30,
    { align: 'center' }
  );
  
  // Finaliser le document
  doc.end();
  
  return stream;
}

/**
 * Génère un PDF pour la liste des dépenses
 * @param expenses Liste des dépenses
 * @param title Titre du document
 * @param subtitle Sous-titre
 * @param startDate Date de début de la période (optionnel)
 * @param endDate Date de fin de la période (optionnel)
 * @returns Stream du PDF généré
 */
export async function generateExpensesPDF(
  expenses: Expense[], 
  title: string = 'REGISTRE DES DÉPENSES',
  subtitle: string = 'Document pour la comptabilité',
  startDate?: string,
  endDate?: string
): Promise<PassThrough> {
  // Créer un nouveau document PDF
  const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
  
  // Utiliser PassThrough
  const stream = new PassThrough();
  
  // Pipe le PDF dans le stream
  doc.pipe(stream);
  
  // Ajouter l'en-tête
  doc.fontSize(18).text(title, { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(14).text(subtitle, { align: 'center' });
  doc.moveDown();
  
  // Ajouter la date de génération
  const today = format(new Date(), 'dd MMMM yyyy', { locale: fr });
  doc.fontSize(10).text(`Document généré le ${today}`, { align: 'right' });
  
  // Période si fournie
  if (startDate && endDate) {
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Période: du ${formatDate(startDate)} au ${formatDate(endDate)}`, { align: 'center' });
  }
  doc.moveDown();
  
  // Calculer le montant total
  const totalAmount = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  
  // Ajouter une boîte avec le montant total
  doc.rect(50, doc.y, 495, 50).fillAndStroke('#f3f4f6', '#e5e7eb');
  doc.fillColor('#000');
  doc.fontSize(12).text('Montant total des dépenses:', 70, doc.y - 40);
  doc.fontSize(16).text(formatCurrency(totalAmount), 350, doc.y - 40, { align: 'right' });
  doc.moveDown(2.5);
  
  // Préparer le tableau
  const startY = doc.y;
  const colWidths = [150, 100, 90, 100];
  const colPositions = [
    50, // Description
    50 + colWidths[0], // Catégorie
    50 + colWidths[0] + colWidths[1], // Date
    50 + colWidths[0] + colWidths[1] + colWidths[2], // Montant
  ];
  const rowHeight = 30;
  
  // En-têtes du tableau
  doc.font('Helvetica-Bold').fontSize(12);
  doc.text('Description', colPositions[0], startY, { width: colWidths[0] });
  doc.text('Catégorie', colPositions[1], startY, { width: colWidths[1] });
  doc.text('Date', colPositions[2], startY, { width: colWidths[2] });
  doc.text('Montant', colPositions[3], startY, { width: colWidths[3], align: 'right' });
  
  // Ligne de séparation après les en-têtes
  doc.moveTo(50, startY + 20).lineTo(545, startY + 20).stroke();
  
  // Paramètres pour la pagination
  let currentY = startY + 25;
  const itemsPerPage = 20;
  let itemCount = 0;
  let pageCount = 1;
  
  // Fonction pour ajouter une page
  const addPage = () => {
    doc.addPage();
    pageCount++;
    currentY = 50; // Reset Y position for new page
    
    // Ajouter en-tête de continuation
    doc.fontSize(14).text('REGISTRE DES DÉPENSES (suite)', { align: 'center' });
    doc.moveDown();
    
    // Répéter les en-têtes de colonnes
    doc.font('Helvetica-Bold').fontSize(12);
    doc.text('Description', colPositions[0], currentY, { width: colWidths[0] });
    doc.text('Catégorie', colPositions[1], currentY, { width: colWidths[1] });
    doc.text('Date', colPositions[2], currentY, { width: colWidths[2] });
    doc.text('Montant', colPositions[3], currentY, { width: colWidths[3], align: 'right' });
    
    // Ligne de séparation après les en-têtes
    doc.moveTo(50, currentY + 20).lineTo(545, currentY + 20).stroke();
    
    currentY += 25;
  };
  
  // Ajouter les données
  doc.font('Helvetica').fontSize(10);
  
  expenses.forEach((expense, index) => {
    // Vérifier si nous avons besoin d'une nouvelle page
    if (itemCount >= itemsPerPage) {
      addPage();
      itemCount = 0;
    }
    
    // Ajouter une ombre de ligne alternée
    if (index % 2 === 0) {
      doc.rect(50, currentY - 5, 495, rowHeight).fill('#f9fafb');
      doc.fillColor('#000');
    }
    
    // Description
    doc.text(expense.description, colPositions[0], currentY, { width: colWidths[0] });
    
    // Catégorie
    doc.text(expense.category, colPositions[1], currentY, { width: colWidths[1] });
    
    // Date
    doc.text(formatDate(expense.date), colPositions[2], currentY, { width: colWidths[2] });
    
    // Montant
    doc.text(formatCurrency(expense.amount), colPositions[3], currentY, { width: colWidths[3], align: 'right' });
    
    currentY += rowHeight;
    itemCount++;
  });
  
  // Ajouter la numérotation des pages
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    doc.fontSize(8).text(
      `Page ${i + 1} sur ${pages.count}`,
      50,
      doc.page.height - 50,
      { align: 'center' }
    );
  }
  
  // Pied de page
  doc.fontSize(10).text(
    'Document généré automatiquement par le système de gestion du cabinet d\'orthophonie.',
    50,
    doc.page.height - 30,
    { align: 'center' }
  );
  
  // Finaliser le document
  doc.end();
  
  return stream;
}