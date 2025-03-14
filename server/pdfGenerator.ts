import PDFDocument from 'pdfkit';
import { Readable, PassThrough } from 'stream';
import { 
  Invoice, 
  InvoiceWithDetails, 
  TherapistPaymentWithDetails,
  Expense,
  Signature
} from '@shared/schema';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { storage } from './storage';

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
 * @param includeAdminSignature Si true, inclut la signature administrative (par défaut: false)
 * @returns Stream du PDF généré
 */
export async function generateInvoicePDF(
  invoice: InvoiceWithDetails, 
  includeAdminSignature: boolean = false
): Promise<PassThrough> {
  // Créer un nouveau document PDF avec buffering pour la pagination
  const doc = new PDFDocument({ 
    size: 'A4', 
    margin: 50,
    bufferPages: true 
  });
  
  // Utiliser PassThrough au lieu de Readable direct
  const stream = new PassThrough();
  
  // Récupérer la signature administrative si nécessaire
  let adminSignature: Signature | undefined = undefined;
  if (includeAdminSignature) {
    const signatures = await storage.getSignatures();
    adminSignature = signatures.length > 0 ? signatures[0] : undefined;
  }
  
  // Pipe le PDF dans le stream
  doc.pipe(stream);
  
  // Définir des positions et dimensions constantes
  const pageWidth = doc.page.width - 100; // Marge de 50 de chaque côté
  
  // Ajouter l'en-tête
  doc.fontSize(25).text('CABINET D\'ORTHOPHONIE', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(18).text('FACTURE', { align: 'center' });
  doc.moveDown(1);
  
  // Ajout d'un encadré pour les informations de facture
  const infoBoxTop = doc.y;
  doc.rect(50, infoBoxTop, pageWidth, 90).fillAndStroke('#f9fafb', '#e5e7eb');
  doc.fillColor('#000');
  
  // Informations de la facture - colonne gauche
  doc.fontSize(12).text(`Numéro de facture: ${invoice.invoiceNumber}`, 60, infoBoxTop + 10);
  doc.text(`Date d'émission: ${formatDate(invoice.issueDate)}`, 60, infoBoxTop + 30);
  doc.text(`Date d'échéance: ${formatDate(invoice.dueDate)}`, 60, infoBoxTop + 50);
  doc.text(`Statut: ${formatInvoiceStatus(invoice.status)}`, 60, infoBoxTop + 70);
  
  // Avancer après la zone d'informations
  doc.y = infoBoxTop + 110;
  
  // Création de sections pour patient et thérapeute côte à côte
  const sectionY = doc.y;
  const sectionWidth = pageWidth / 2 - 10;
  
  // Information du patient (section gauche)
  doc.fontSize(14).font('Helvetica-Bold').text('Patient:', 50, sectionY);
  doc.fontSize(12).font('Helvetica').text(`Nom: ${invoice.patientName}`, 50, sectionY + 25);
  
  // Information du thérapeute (section droite)
  doc.fontSize(14).font('Helvetica-Bold').text('Orthophoniste:', 50 + sectionWidth + 20, sectionY);
  doc.fontSize(12).font('Helvetica').text(`Nom: ${invoice.therapistName}`, 50 + sectionWidth + 20, sectionY + 25);
  
  // Positionner à la fin des sections
  doc.y = sectionY + 50;
  
  // Détails du rendez-vous
  doc.fontSize(14).font('Helvetica-Bold').text('Détails de la prestation:');
  doc.fontSize(12).font('Helvetica');
  
  let detailsY = doc.y;
  if (invoice.appointmentDate !== 'N/A') {
    doc.text(`Date du rendez-vous: ${formatDate(invoice.appointmentDate)}`, 50, detailsY);
    doc.text(`Heure du rendez-vous: ${invoice.appointmentTime}`, 50, detailsY + 20);
    detailsY += 40;
  } else {
    detailsY += 20;
  }
  
  // Vérifier si des notes sont présentes, mais ne pas les afficher ici
  // Les notes d'assurance seront affichées sous le motif de consultation plus bas
  
  // Tableau des prestations avec positionnement dynamique
  const tableTop = detailsY + 30; // Espace après les détails
  const tableLeft = 50;
  const tableRight = 550;
  const rowHeight = 30;
  
  // En-têtes du tableau avec style amélioré
  doc.rect(tableLeft, tableTop, tableRight - tableLeft, 25).fill('#f3f4f6');
  doc.fillColor('#000');
  doc.font('Helvetica-Bold').fontSize(12);
  doc.text('Description', tableLeft + 10, tableTop + 7);
  doc.text('Montant', tableRight - 110, tableTop + 7, { width: 100, align: 'right' });
  
  // Ligne de séparation après entête
  doc.moveTo(tableLeft, tableTop + 25).lineTo(tableRight, tableTop + 25).stroke();
  
  // Ligne avec la prestation
  const descriptionText = invoice.notes && invoice.notes.includes('Facture groupée') 
    ? 'Séances d\'orthophonie (facturation groupée)' 
    : 'Séance d\'orthophonie';
  
  doc.font('Helvetica').fontSize(12);
  doc.text(descriptionText, tableLeft + 10, tableTop + 35);
  
  // Affichage des notes spéciales sous le motif de consultation
  if (invoice.notes) {
    // Pour les factures groupées avec notes supplémentaires (format: "Facture groupée - Notes supplémentaires")
    if (invoice.notes.includes('Facture groupée') && invoice.notes.includes(' - ')) {
      const additionalNotes = invoice.notes.split(' - ').slice(1).join(' - ');
      if (additionalNotes.trim()) {
        doc.font('Helvetica-Oblique').fontSize(10);
        doc.fillColor('#1e3a8a'); // Couleur bleue pour différencier des autres textes
        doc.text(`Information supplémentaire: ${additionalNotes}`, tableLeft + 15, tableTop + 55);
        doc.fillColor('#000'); // Remettre la couleur par défaut
        doc.font('Helvetica').fontSize(12);
      }
    }
    // Pour les notes d'assurance normales (qui ne contiennent pas "Facture groupée")
    else if (!invoice.notes.includes('Facture groupée')) {
      doc.font('Helvetica-Oblique').fontSize(10);
      doc.fillColor('#1e3a8a'); // Couleur bleue pour différencier des autres textes
      doc.text(`Note assurance: ${invoice.notes}`, tableLeft + 15, tableTop + 55);
      doc.fillColor('#000'); // Remettre la couleur par défaut
      doc.font('Helvetica').fontSize(12);
    }
  }
  doc.text(formatCurrency(invoice.amount), tableRight - 110, tableTop + 35, { width: 100, align: 'right' });
  
  // TVA si applicable (généralement pas de TVA pour les actes médicaux)
  let taxLineY = tableTop + 65;
  if (parseFloat(invoice.taxRate) > 0) {
    doc.text(`TVA (${invoice.taxRate}%)`, tableLeft + 10, taxLineY);
    const taxAmount = (parseFloat(invoice.amount) * parseFloat(invoice.taxRate) / 100).toFixed(2);
    doc.text(formatCurrency(taxAmount), tableRight - 110, taxLineY, { width: 100, align: 'right' });
    taxLineY += 30;
  }
  
  // Ligne de séparation avant le total
  doc.moveTo(tableLeft, taxLineY).lineTo(tableRight, taxLineY).stroke();
  
  // Total avec mise en évidence
  doc.rect(tableLeft, taxLineY + 10, tableRight - tableLeft, 30).fillAndStroke('#f9fafb', '#e5e7eb');
  doc.fillColor('#000');
  doc.font('Helvetica-Bold').fontSize(14);
  doc.text('TOTAL', tableLeft + 10, taxLineY + 20);
  doc.text(formatCurrency(invoice.totalAmount), tableRight - 110, taxLineY + 20, { width: 100, align: 'right' });
  
  // Espace pour signature
  const signatureY = taxLineY + 60;
  
  // Si une signature administrative est fournie, l'utiliser (téléchargement)
  if (adminSignature && adminSignature.signatureData) {
    doc.font('Helvetica').fontSize(12).text('Signature administrative:', 50, signatureY);
    try {
      doc.image(adminSignature.signatureData, 230, signatureY, { width: 150 });
    } catch (error) {
      console.error("Erreur lors du chargement de la signature administrative:", error);
      doc.text("(Signature non disponible)", 230, signatureY);
    }
  } 
  // Sinon, utiliser la signature de la facture si disponible (prévisualisation)
  else if (invoice.signatureUrl) {
    doc.font('Helvetica').fontSize(12).text('Signature:', 50, signatureY);
    try {
      doc.image(invoice.signatureUrl, 150, signatureY, { width: 150 });
    } catch (error) {
      console.error("Erreur lors du chargement de la signature:", error);
      doc.text("(Signature non disponible)", 150, signatureY);
    }
  }
  
  // Pied de page en bas de la page
  const footerTop = doc.page.height - 100;
  doc.font('Helvetica').fontSize(10);
  doc.text('Merci pour votre confiance.', 50, footerTop, { align: 'center', width: pageWidth });
  doc.moveDown(0.5);
  doc.text('Cette facture est générée par le système de gestion du cabinet d\'orthophonie.', 
    50, doc.y, { align: 'center', width: pageWidth });
  doc.moveDown(0.5);
  doc.text('Pour toute question, veuillez contacter le secrétariat.', 
    50, doc.y, { align: 'center', width: pageWidth });
  
  // Finaliser le document
  doc.end();
  
  return stream;
}

/**
 * Formate le statut d'une facture en français
 * @param status Statut de la facture
 * @returns Statut formaté
 */
function formatInvoiceStatus(status: string): string {
  const statusMap: {[key: string]: string} = {
    'pending': 'En attente',
    'paid': 'Payée',
    'cancelled': 'Annulée',
    'overdue': 'En retard'
  };
  
  return statusMap[status] || status;
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