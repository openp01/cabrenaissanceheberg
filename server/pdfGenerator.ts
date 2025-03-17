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
  
  // Récupérer le template de facture
  let template: any = null;
  
  try {
    // Si la facture a un templateId, utiliser ce template
    if (invoice.templateId) {
      // Utiliser la méthode de stockage pour récupérer le template
      const invoiceTemplate = await fetch(`/api/invoice-templates/${invoice.templateId}`)
        .then(res => res.json())
        .catch(() => null);
        
      if (invoiceTemplate) {
        template = invoiceTemplate;
      }
    }
    
    // Si pas de template trouvé, chercher le template par défaut
    if (!template) {
      // Récupérer tous les templates et filtrer pour trouver celui par défaut
      const templates = await fetch('/api/invoice-templates')
        .then(res => res.json())
        .catch(() => []);
        
      const defaultTemplate = templates.find((t: any) => t.is_default === true);
      if (defaultTemplate) {
        template = defaultTemplate;
      }
    }
    
    // Si toujours pas de template, utiliser des valeurs par défaut
    if (!template) {
      template = {
        name: 'Template par défaut',
        primary_color: '#266d2c',
        secondary_color: '#3fb549',
        font_family: 'Helvetica',
        header_content: '<div>Cabinet Paramédical de la Renaissance</div>',
        footer_content: '<div>Cabinet paramédical de la renaissance SUARL - NINEA : 007795305</div>',
        logo_url: '/images/LaR_LOGO-Rev.jpg',
        show_therapist_signature: true
      };
    }
  } catch (error) {
    console.error('Erreur lors de la récupération du template:', error);
    // Utiliser un template par défaut si erreur
    template = {
      name: 'Template par défaut',
      primary_color: '#266d2c',
      secondary_color: '#3fb549',
      font_family: 'Helvetica',
      header_content: '<div>Cabinet Paramédical de la Renaissance</div>',
      footer_content: '<div>Cabinet paramédical de la renaissance SUARL - NINEA : 007795305</div>',
      logo_url: '/images/LaR_LOGO-Rev.jpg',
      show_therapist_signature: true
    };
  }
  
  // Pipe le PDF dans le stream
  doc.pipe(stream);
  
  // Définir des positions et dimensions constantes
  const pageWidth = doc.page.width - 100; // Marge de 50 de chaque côté
  
  // Définir les couleurs à partir du template
  const primaryColor = template.primary_color || '#266d2c';
  const secondaryColor = template.secondary_color || '#3fb549';
  
  // Ajouter l'en-tête avec la couleur du thème
  // Créer un arrière-plan coloré pour l'en-tête
  doc.rect(0, 0, doc.page.width, 120).fill(primaryColor);
  
  // Ajouter le logo si disponible
  try {
    if (template.logo_url && template.logo_url.startsWith('/images/')) {
      const logoPath = './public' + template.logo_url;
      doc.image(logoPath, doc.page.width - 150, 20, { width: 100 });
    }
  } catch (error) {
    console.error('Erreur lors du chargement du logo:', error);
  }
  
  // Ajouter les informations de contact
  doc.fillColor('white')
     .fontSize(12)
     .text('Mail: contact@cabinet-renaissance.com', 50, 30)
     .text('Tél: +221 33 824 35 50', 50, 45)
     .text('Immeuble SAWA', 50, 60)
     .text('Bloc B - Étage 2', 50, 75)
     .text('1763, Avenue Cheikh A. DIOP', 50, 90)
     .text('DAKAR', 50, 105);
  
  // Information de la facture avec espacement après l'en-tête
  const infoY = 140;
  doc.fillColor('black')
     .fontSize(18)
     .text('FACTURE N° ' + invoice.invoiceNumber, 50, infoY, { align: 'center' });
  
  // Statut de la facture
  doc.fontSize(14)
     .fillColor(secondaryColor)
     .text('STATUT: ' + formatInvoiceStatus(invoice.status), 50, infoY + 30, { align: 'center' });
  
  // Date de la facture
  doc.fillColor('black')
     .fontSize(12)
     .text('Date : ' + formatDate(invoice.issueDate), 50, infoY + 50, { align: 'center' });
  
  // Ajout des informations du thérapeute et du patient avec style moderne
  const sectionY = infoY + 80;
  doc.fontSize(16)
     .fillColor(primaryColor)
     .text('THERAPEUTE', 50, sectionY, { underline: true });
  
  doc.fontSize(12)
     .fillColor('black')
     .text(invoice.therapistName, 50, sectionY + 25);
  
  doc.fontSize(16)
     .fillColor(primaryColor)
     .text('PATIENT(E)', pageWidth + 50 - 100, sectionY, { underline: true });
  
  doc.fontSize(12)
     .fillColor('black')
     .text(invoice.patientName, pageWidth + 50 - 100, sectionY + 25);
  
  // Ajouter le texte explicatif
  const objectY = sectionY + 70;
  doc.fontSize(12)
     .fillColor('black')
     .text('OBJET :', 50, objectY, { underline: true });
     
  // Utiliser l'option width pour limiter la largeur du texte et permettre le passage à la ligne
  doc.text('Facture relative aux prestations paramédicales réalisées par le Cabinet Paramédical de la Renaissance pour la période concernée.', 
      50, objectY + 20, 
      { width: pageWidth, align: 'left' });
  
  // Ajouter plus d'espace entre les lignes
  doc.text('Nous restons à votre disposition pour toute information complémentaire.', 
      50, objectY + 50, 
      { width: pageWidth, align: 'left' });
  
  // Ajouter une ligne de séparation (ajuster la position en fonction du nouveau texte)
  doc.strokeColor(primaryColor)
     .lineWidth(1)
     .moveTo(50, objectY + 75)
     .lineTo(pageWidth + 50, objectY + 75)
     .stroke();
  
  // Ajouter le titre pour la période concernée (ajuster la position en fonction du nouveau texte)
  doc.fontSize(14)
     .fillColor(primaryColor)
     .text('DATE(S) OU PERIODE CONCERNEE', 50, objectY + 85, { align: 'center' });
  
  // Ajouter une ligne de séparation (ajuster la position en fonction du nouveau texte)
  doc.strokeColor(primaryColor)
     .lineWidth(1)
     .moveTo(50, objectY + 110)
     .lineTo(pageWidth + 50, objectY + 110)
     .stroke();
  
  // Afficher la date de l'appointment (ajuster la position en fonction du nouveau texte)
  doc.fontSize(12)
     .fillColor('black')
     .text(formatDate(invoice.appointmentDate), 50, objectY + 120, { align: 'center' });
  
  // Ajouter le tableau pour les prestations (ajuster la position en fonction des modifications précédentes)
  const tableY = objectY + 150;
  
  // Créer les en-têtes du tableau
  const colWidths = [pageWidth * 0.5, pageWidth * 0.25, pageWidth * 0.25];
  
  // En-têtes
  doc.strokeColor(primaryColor)
     .lineWidth(1)
     .rect(50, tableY, colWidths[0], 30).stroke()
     .rect(50 + colWidths[0], tableY, colWidths[1], 30).stroke()
     .rect(50 + colWidths[0] + colWidths[1], tableY, colWidths[2], 30).stroke();
  
  doc.fontSize(12)
     .fillColor('black')
     .text('NATURE DES ACTES', 50 + 5, tableY + 10)
     .text('NOMBRE D\'ACTES', 50 + colWidths[0] + 5, tableY + 10)
     .text('TARIF UNITAIRE', 50 + colWidths[0] + colWidths[1] + 5, tableY + 10);
  
  // Ligne de données
  const rowY = tableY + 30;
  doc.strokeColor(primaryColor)
     .lineWidth(1)
     .rect(50, rowY, colWidths[0], 30).stroke()
     .rect(50 + colWidths[0], rowY, colWidths[1], 30).stroke()
     .rect(50 + colWidths[0] + colWidths[1], rowY, colWidths[2], 30).stroke();
  
  // Déterminer le texte de description
  const descriptionText = invoice.notes && invoice.notes.includes('Facture groupée') 
    ? 'Séances thérapeutiques (facturation groupée)' 
    : 'Séance thérapeutique';
  
  doc.fontSize(12)
     .fillColor('black')
     .text(descriptionText, 50 + 5, rowY + 10)
     .text('1', 50 + colWidths[0] + 5, rowY + 10)
     .text(formatCurrency(invoice.amount), 50 + colWidths[0] + colWidths[1] + 5, rowY + 10);
  
  // Affichage des notes spéciales
  let notesY = rowY + 40;
  if (invoice.notes) {
    // Pour les factures groupées avec notes supplémentaires
    if (invoice.notes.includes('Facture groupée') && invoice.notes.includes(' - ')) {
      const additionalNotes = invoice.notes.split(' - ').slice(1).join(' - ');
      if (additionalNotes.trim()) {
        doc.strokeColor(primaryColor)
          .lineWidth(1)
          .rect(50, notesY, pageWidth, 50).stroke();
        
        doc.fontSize(10)
          .fillColor(secondaryColor)
          .text('NOTE(S) COMPLEMENTAIRE(S):', 50 + 5, notesY + 5);
        
        doc.fontSize(10)
          .fillColor('black')
          .text(additionalNotes, 50 + 5, notesY + 20, { width: pageWidth - 10 });
        
        notesY += 60;
      }
    }
    // Pour les notes d'assurance normales
    else if (!invoice.notes.includes('Facture groupée')) {
      doc.strokeColor(primaryColor)
        .lineWidth(1)
        .rect(50, notesY, pageWidth, 50).stroke();
      
      doc.fontSize(10)
        .fillColor(secondaryColor)
        .text('NOTE(S) COMPLEMENTAIRE(S):', 50 + 5, notesY + 5);
      
      doc.fontSize(10)
        .fillColor('black')
        .text(invoice.notes, 50 + 5, notesY + 20, { width: pageWidth - 10 });
      
      notesY += 60;
    }
  }
  
  // Ajouter le total
  const totalY = notesY + 10;
  doc.fontSize(16)
     .fillColor(secondaryColor)
     .text('TOTAL:', 50, totalY);
  
  // Utiliser le montant réel (amount) au lieu du montant total (totalAmount) pour les factures qui ont été ajustées
  const displayAmount = invoice.status === 'paid' || invoice.notes?.includes('Facture groupée') 
    ? invoice.amount 
    : invoice.totalAmount;
  
  doc.fontSize(16)
     .fillColor('black')
     .text(formatCurrency(displayAmount), 50 + 100, totalY);
  
  // Ajouter la section d'attention
  const attentionY = totalY + 40;
  doc.fontSize(12)
     .fillColor(secondaryColor)
     .text('ATTENTION:', 50, attentionY);
  
  doc.fontSize(11)
     .fillColor('black')
     .text('• Tout rendez-vous non annulé ou annulé moins de 24h à l\'avance est dû.', 50, attentionY + 20)
     .text('• Après trois paiements non réalisés ou en retard, le cabinet se réserve le droit d\'interrompre le suivi.', 50, attentionY + 35);
  
  doc.fontSize(11)
     .fillColor(secondaryColor)
     .text('Merci de votre compréhension', 50, attentionY + 60, { align: 'center' });
  
  // Ajouter la signature si nécessaire
  if (template.show_therapist_signature) {
    const signatureY = totalY + 10;
    
    // Si une signature administrative est fournie, l'utiliser (téléchargement)
    if (adminSignature && adminSignature.signatureData) {
      doc.font('Helvetica').fontSize(12).text('Signature:', doc.page.width - 170, signatureY);
      try {
        doc.image(
          Buffer.from(adminSignature.signatureData.split(',')[1], 'base64'),
          doc.page.width - 150,
          signatureY + 20,
          { width: 100, height: 50 }
        );
      } catch (error) {
        console.error("Erreur lors du chargement de la signature administrative:", error);
        doc.text("(Signature non disponible)", doc.page.width - 150, signatureY + 20);
      }
    }
    // Sinon, utiliser la signature de la facture si disponible (prévisualisation)
    else if (invoice.signatureUrl) {
      doc.font('Helvetica').fontSize(12).text('Signature:', doc.page.width - 170, signatureY);
      try {
        doc.image(
          invoice.signatureUrl,
          doc.page.width - 150,
          signatureY + 20,
          { width: 100, height: 50 }
        );
      } catch (error) {
        console.error("Erreur lors du chargement de la signature:", error);
        doc.text("(Signature non disponible)", doc.page.width - 150, signatureY + 20);
      }
    }
  }
  
  // Ajouter le tampon permanent du cabinet sur toutes les factures s'il est disponible
  if (adminSignature && adminSignature.permanentStampData) {
    try {
      // Afficher le tampon permanent en bas à droite de la facture
      const permanentStampWidth = 150; // taille du tampon
      const permanentStampX = doc.page.width - permanentStampWidth - 50; // position x (50 pour la marge)
      const permanentStampY = doc.page.height - 200; // position y (200 du bas pour laisser de l'espace pour le pied de page)
      
      // Réduire l'opacité pour ne pas cacher le contenu
      doc.opacity(0.8);
      
      // Ajouter l'image du tampon
      doc.image(
        Buffer.from(adminSignature.permanentStampData.split(',')[1], 'base64'),
        permanentStampX, 
        permanentStampY, 
        { width: permanentStampWidth }
      );
      
      // Rétablir l'opacité normale
      doc.opacity(1);
    } catch (error) {
      console.error("Erreur lors de l'ajout du tampon permanent:", error);
    }
  }
  
  // Ajouter le tampon "PAYÉ" si le statut de la facture est "paid" et qu'un tampon est disponible
  if (invoice.status === 'paid' && adminSignature && adminSignature.paidStampData) {
    try {
      // Afficher le tampon en diagonale sur la facture avec une rotation de 30 degrés
      doc.save(); // Sauvegarder l'état actuel
      
      // Positionner au centre de la page et appliquer une rotation
      const centerX = doc.page.width / 2;
      const centerY = doc.page.height / 2;
      
      // Translater au centre, pivoter, puis translater en arrière
      doc.translate(centerX, centerY)
         .rotate(30, { origin: [0, 0] });
      doc.opacity(0.5); // Réduire l'opacité pour ne pas cacher le contenu
      
      // Dessiner le tampon avec une taille appropriée
      doc.image(
        Buffer.from(adminSignature.paidStampData.split(',')[1], 'base64'),
        -100, 
        -100, 
        { width: 200 }
      );
      
      // Restaurer l'état original
      doc.restore();
    } catch (error) {
      console.error("Erreur lors de l'ajout du tampon PAYÉ:", error);
    }
  }
  
  // Ajouter le pied de page avec les informations légales
  const footerY = doc.page.height - 30;
  doc.fontSize(8)
     .fillColor('black')
     .text('Cabinet paramédical de la renaissance SUARL - NINEA : 007795305 - Registre de Commerce : SN DKR 2020 B5204 - TVA non applicable', 
           50, footerY, { align: 'center' });
  
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
    'Document généré automatiquement par le système de gestion du Cabinet Paramédical de la Renaissance.',
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
    'Document généré automatiquement par le système de gestion du Cabinet Paramédical de la Renaissance.',
    50,
    doc.page.height - 30,
    { align: 'center' }
  );
  
  // Finaliser le document
  doc.end();
  
  return stream;
}