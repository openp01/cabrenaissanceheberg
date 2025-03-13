import React from 'react';
import { InvoiceTemplate } from '@shared/schema';

interface InvoiceTemplatePreviewProps {
  template: InvoiceTemplate;
}

export default function InvoiceTemplatePreview({ template }: InvoiceTemplatePreviewProps) {
  // Données factices pour la prévisualisation
  const previewData = {
    invoiceNumber: 'F-2025-0001',
    issueDate: '01/01/2025',
    patientName: 'Patient Exemple',
    therapistName: 'Dr. Sophie Martin',
    appointmentDate: '01/01/2025',
    appointmentTime: '10:00',
    totalAmount: '50,00',
    status: 'En attente',
  };
  
  const containerStyle = {
    fontFamily: template.fontFamily || 'Arial, sans-serif',
    fontSize: '10px',
    lineHeight: '1.5',
    color: '#333',
    backgroundColor: '#fff',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    position: 'relative' as const,
    height: '100%',
    overflow: 'hidden',
  };
  
  const headerStyle = {
    marginBottom: '20px',
  };
  
  const contentStyle = {
    marginBottom: '20px',
  };
  
  const footerStyle = {
    marginTop: '20px',
    borderTop: `1px solid ${template.secondaryColor || '#eaeaea'}`,
    paddingTop: '10px',
  };
  
  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse' as const,
    marginBottom: '20px',
    fontSize: '10px',
  };
  
  const thStyle = {
    backgroundColor: template.primaryColor || '#f3f4f6',
    color: '#fff',
    padding: '8px',
    textAlign: 'left' as const,
    fontWeight: 'bold' as const,
  };
  
  const tdStyle = {
    padding: '8px',
    borderBottom: '1px solid #eaeaea',
  };
  
  const signatureStyle = {
    marginTop: '30px',
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
  };
  
  const signatureBoxStyle = {
    border: '1px dashed #ccc',
    padding: '10px',
    width: '200px',
    height: '80px',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'space-between',
  };
  
  return (
    <div style={containerStyle}>
      {/* En-tête */}
      <div 
        style={headerStyle}
        dangerouslySetInnerHTML={{ __html: template.headerContent || '' }}
      />
      
      {/* Informations principales */}
      <div style={contentStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h2 style={{ color: template.primaryColor, marginBottom: '5px' }}>Facture #{previewData.invoiceNumber}</h2>
            <p>Date d'émission: {previewData.issueDate}</p>
          </div>
          {template.logoUrl && (
            <div>
              <img 
                src={template.logoUrl} 
                alt="Logo" 
                style={{ maxHeight: '60px', maxWidth: '150px' }} 
              />
            </div>
          )}
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h3 style={{ color: template.primaryColor, marginBottom: '5px' }}>Patient</h3>
            <p>{previewData.patientName}</p>
          </div>
          <div>
            <h3 style={{ color: template.primaryColor, marginBottom: '5px' }}>Orthophoniste</h3>
            <p>{previewData.therapistName}</p>
          </div>
        </div>
        
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Description</th>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Heure</th>
              <th style={thStyle}>Montant</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tdStyle}>Séance d'orthophonie</td>
              <td style={tdStyle}>{previewData.appointmentDate}</td>
              <td style={tdStyle}>{previewData.appointmentTime}</td>
              <td style={tdStyle}>{previewData.totalAmount} €</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>Total</td>
              <td style={{ ...tdStyle, fontWeight: 'bold' }}>{previewData.totalAmount} €</td>
            </tr>
          </tfoot>
        </table>
        
        <div style={{ padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '4px', marginBottom: '20px' }}>
          <p style={{ margin: 0, color: template.primaryColor }}>
            <strong>Statut:</strong> {previewData.status}
          </p>
        </div>
        
        {template.showTherapistSignature && (
          <div style={signatureStyle}>
            <div>
              <p style={{ marginBottom: '5px' }}>Signature du thérapeute:</p>
              <div style={signatureBoxStyle}>
                <p style={{ margin: 0, fontSize: '9px', color: '#999' }}>Signature électronique</p>
                <p style={{ margin: 0, fontSize: '9px', textAlign: 'right' as const }}>Date: {previewData.issueDate}</p>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Pied de page */}
      <div 
        style={footerStyle}
        dangerouslySetInnerHTML={{ __html: template.footerContent || '' }}
      />
    </div>
  );
}