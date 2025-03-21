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
  
  // Préparer les dates à afficher
  let dates: string[] = [];
  let isMultipleAppointments = false;
  
  // Déterminer quelles dates afficher
  if (invoice.appointmentDates && invoice.appointmentDates.length > 0) {
    // Utiliser directement les dates fournies dans le champ appointmentDates
    dates = [...invoice.appointmentDates];
    isMultipleAppointments = dates.length > 1;
  } else {
    // Cas standard d'un seul rendez-vous
    dates.push(`${formatDate(invoice.appointmentDate)} à ${invoice.appointmentTime}`);
    isMultipleAppointments = false;
  }
  
  // Trier les dates chronologiquement si possible
  try {
    dates.sort((a, b) => {
      // Essayer d'extraire et de comparer les dates
      const aDatePart = a.split(' à ')[0];
      const bDatePart = b.split(' à ')[0];
      
      // Format français: convertir "12 mars 2025" en Date
      const parseDate = (dateStr: string) => {
        const months = {
          "janvier": 0, "février": 1, "mars": 2, "avril": 3, "mai": 4, "juin": 5,
          "juillet": 6, "août": 7, "septembre": 8, "octobre": 9, "novembre": 10, "décembre": 11
        };
        
        const parts = dateStr.split(' ');
        if (parts.length === 3) {
          const day = parseInt(parts[0]);
          const month = months[parts[1] as keyof typeof months];
          const year = parseInt(parts[2]);
          
          if (!isNaN(day) && month !== undefined && !isNaN(year)) {
            return new Date(year, month, day);
          }
        }
        return new Date(0); // date invalide en cas d'erreur
      };
      
      const dateA = parseDate(aDatePart);
      const dateB = parseDate(bDatePart);
      
      return dateA.getTime() - dateB.getTime();
    });
  } catch (e) {
    console.error("Erreur lors du tri des dates:", e);
    // Ignorer les erreurs de tri, garder l'ordre original
  }
  
  // Afficher les dates selon qu'il s'agit d'un rendez-vous unique ou multiple
  if (isMultipleAppointments) {
    // SÉANCES MULTIPLES
    doc.fontSize(11).font('Helvetica-Bold')
      .text(`SÉANCES MULTIPLES (${dates.length})`, { align: 'center' });
    
    doc.moveDown(0.3);
    
    // OPTIMISATION DE L'AFFICHAGE POUR TENIR SUR UNE SEULE PAGE
    // Toujours utiliser l'affichage en 3 colonnes pour économiser de l'espace vertical
    const datesPerColumn = Math.ceil(dates.length / 3);
    const col1Dates = dates.slice(0, datesPerColumn);
    const col2Dates = dates.slice(datesPerColumn, datesPerColumn * 2);
    const col3Dates = dates.slice(datesPerColumn * 2);
    
    // Position de départ pour les colonnes
    const col1X = 60;
    const col2X = 270;
    const col3X = 480;
    let currentY = doc.y;
    
    // Ajuster la taille de la police selon le nombre de dates
    const fontSize = dates.length > 9 ? 8 : 9;
    
    // Espacement réduit pour les factures avec beaucoup de dates
    const lineSpacing = dates.length > 9 ? 15 : 18;
    
    // Tracer les lignes une par une
    const maxLines = Math.max(col1Dates.length, col2Dates.length, col3Dates.length);
    
    for (let i = 0; i < maxLines; i++) {
      if (i < col1Dates.length) {
        doc.fontSize(fontSize).font('Helvetica')
          .text(`• ${col1Dates[i]}`, col1X, currentY, { width: 210 });
      }
      
      if (i < col2Dates.length) {
        doc.fontSize(fontSize).font('Helvetica')
          .text(`• ${col2Dates[i]}`, col2X, currentY, { width: 210 });
      }
      
      if (i < col3Dates.length) {
        doc.fontSize(fontSize).font('Helvetica')
          .text(`• ${col3Dates[i]}`, col3X, currentY, { width: 210 });
      }
      
      currentY += lineSpacing;
    }
    
    // Mettre à jour la position Y du document
    doc.y = currentY + 5;
  } else {
    // Cas standard d'un seul rendez-vous
    doc.fontSize(10).font('Helvetica')
      .text(`${formatDate(invoice.appointmentDate)} à ${invoice.appointmentTime}`, { align: 'center' });
  }
  
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
  
  // Déterminer le texte descriptif et le nombre de séances
  let descriptionText = 'Séance d\'orthophonie';
  let sessionCount = '1';
  
  // Si c'est une facture pour rendez-vous récurrents ou groupés
  if (isMultipleAppointments) {
    descriptionText = 'Séances d\'orthophonie';
    sessionCount = dates.length.toString();
  }
  
  doc.text(descriptionText, 70, doc.y);
  doc.text(sessionCount, 340, doc.y - 12);
  doc.text(formatCurrency(50), 460, doc.y - 12); // Prix unitaire fixe de 50€
  
  // Ligne pour les notes
  doc.moveDown(2);
  const notesLineY = doc.y + 10;
  doc.moveTo(50, notesLineY).lineTo(doc.page.width - 50, notesLineY).stroke();
  
  // Notes complémentaires si présentes - optimisé pour tenir sur une page
  if (invoice.notes) {
    doc.moveDown(0.5); // Réduit l'espacement
    
    // Complètement supprimer l'affichage des dates dans les notes car elles sont affichées
    // uniquement dans la section "DATE(S) OU PERIODE CONCERNEE"
    let displayNotes = "";
    
    if (invoice.notes.includes('Facture groupée')) {
      // Extraire juste l'information sur le type de séances sans les dates
      const frequencyMatch = invoice.notes.match(/\((.*?)\)/i);
      
      displayNotes = `Facture groupée pour séances`;
      if (frequencyMatch && frequencyMatch[1]) {
        displayNotes += ` (${frequencyMatch[1]})`;
      }
    } 
    else if (invoice.notes.includes('récurrent')) {
      // Extraire juste l'information sur le type de rendez-vous sans les dates
      const frequencyMatch = invoice.notes.match(/\((.*?)\)/i);
      
      displayNotes = `Rendez-vous récurrent`;
      if (frequencyMatch && frequencyMatch[1]) {
        displayNotes += ` (${frequencyMatch[1]})`;
      }
    }
    else {
      // Pour les autres notes sans dates, les afficher normalement
      displayNotes = invoice.notes;
    }
    
    // Afficher les notes avec une taille de police réduite si elles sont longues
    const fontSize = displayNotes.length > 100 ? 9 : 10;
    
    doc.fontSize(10).font('Helvetica-Bold')
      .text('NOTE(S):', 70);
    doc.fontSize(fontSize).font('Helvetica')
      .text(displayNotes, 70, doc.y + 5, { width: pageWidth - 40 });
  } else {
    doc.moveDown(1); // Réduit l'espacement quand il n'y a pas de notes
  }
  
  // Ligne avant le total
  doc.moveDown(0.5); // Réduit l'espacement
  const totalLineY = doc.y + 10;
  doc.moveTo(50, totalLineY).lineTo(doc.page.width - 50, totalLineY).stroke();
  
  // ==== SECTION TOTAL ====
  doc.moveDown(1); // Réduit l'espacement
  doc.fontSize(12).font('Helvetica-Bold')
    .fillColor(primaryColor)
    .text('TOTAL:', 70);
  doc.fillColor('black')
    .text(formatCurrency(invoice.totalAmount), 130, doc.y - 14);
  
  // ==== SECTION ATTENTION ====
  // Vérifier si on a beaucoup de dates (pour les factures avec beaucoup de rendez-vous)
  // Si c'est le cas, optimiser davantage l'espace
  const hasManyDates = dates.length > 6;
    
  // Ajuster l'espacement en fonction du nombre de dates
  doc.moveDown(hasManyDates ? 1 : 1.5);
  
  // On réduit encore l'espace si on a beaucoup de dates
  if (hasManyDates) {
    // Afficher la section d'attention de manière plus compacte pour économiser de l'espace
    doc.fontSize(9).font('Helvetica-Bold')
      .fillColor(primaryColor)
      .text('ATTENTION:', 70);
      
    doc.fillColor('black').font('Helvetica')
      .text('• Tout rendez-vous non annulé ou annulé moins de 24h à l\'avance est dû.', 90, doc.y + 5);
    doc.moveDown(0.3);
    doc.text('• Après trois paiements non réalisés ou en retard, le cabinet se réserve le droit d\'interrompre le suivi.', 90);
    
    doc.moveDown(0.5);
    doc.text('Merci de votre compréhension', { align: 'center' });
  } else {
    // Format standard pour les factures avec peu de dates
    doc.fontSize(10).font('Helvetica-Bold')
      .fillColor(primaryColor)
      .text('ATTENTION:', 70);
      
    doc.fillColor('black').font('Helvetica')
      .text('• Tout rendez-vous non annulé ou annulé moins de 24h à l\'avance est dû.', 90, doc.y + 7);
    doc.moveDown(0.4);
    doc.text('• Après trois paiements non réalisés ou en retard, le cabinet se réserve le droit d\'interrompre le suivi.', 90);
    
    doc.moveDown(0.7);
    doc.text('Merci de votre compréhension', { align: 'center' });
  }
  
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
    20, footerY, { align: 'center', width: pageWidth }
  );
  
  // Finaliser le document
  doc.end();
  
  return stream;
}