import jsPDF from 'jspdf';

export interface SlideSummary {
  pageNumber: number;
  summary: string;
  success: boolean;
  error?: string;
}

export interface PDFGenerationOptions {
  title?: string;
  author?: string;
  subject?: string;
  roomCode?: string;
  generatedAt?: Date;
}

/**
 * Generate a PDF document with slide images and summaries
 */
export async function generatePresentationSummaryPDF(
  summaries: SlideSummary[],
  pdfViewerElement: HTMLElement | null,
  pageTexts: string[] = [],
  totalPages: number = 0,
  currentPage: number = 1,
  pdfUrl: string = '',
  options: PDFGenerationOptions = {}
): Promise<Blob> {
  const {
    title = 'Presentation Summary',
    roomCode = 'Unknown',
    generatedAt = new Date()
  } = options;

  // Render all slides independently using PDF.js
  console.log('📄 Rendering all slides independently for PDF generation...');
  const pageImages = await renderAllSlidesIndependently(pdfUrl, summaries.map(s => s.pageNumber));
  
  // Create new PDF document
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);

  // Add title page
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(title, pageWidth / 2, 50, { align: 'center' });
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'normal');
  doc.text(`Room Code: ${roomCode}`, pageWidth / 2, 70, { align: 'center' });
  doc.text(`Generated: ${generatedAt.toLocaleString()}`, pageWidth / 2, 85, { align: 'center' });
  
  doc.setFontSize(12);
  doc.text('AI-Generated Slide Summaries with Context', pageWidth / 2, 100, { align: 'center' });
  doc.text('This document contains intelligent summaries of each slide', pageWidth / 2, 115, { align: 'center' });
  doc.text('based on voice transcriptions and slide content analysis.', pageWidth / 2, 130, { align: 'center' });

  // Add new page for content
  doc.addPage();

  let currentY = margin;
  const lineHeight = 7;
  const imageHeight = 120;
  const summaryHeight = 40;

  // Process each slide
  for (let i = 0; i < summaries.length; i++) {
    const summary = summaries[i];
    
    // Check if we need a new page
    if (currentY + imageHeight + summaryHeight + 20 > pageHeight - margin) {
      doc.addPage();
      currentY = margin;
    }

    // Add slide header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`Slide ${summary.pageNumber}`, margin, currentY);
    currentY += lineHeight * 2;

    // Use pre-rendered slide image
    const pageImage = pageImages[summary.pageNumber];
    
    if (pageImage) {
      // Add the pre-rendered page image to PDF
      const imgWidth = contentWidth;
      const imgHeight = (pageImage.height * imgWidth) / pageImage.width;
      
      // Ensure image fits on page
      const maxImageHeight = pageHeight - currentY - summaryHeight - margin;
      const finalImageHeight = Math.min(imgHeight, maxImageHeight);
      const finalImageWidth = (pageImage.width * finalImageHeight) / pageImage.height;

      doc.addImage(pageImage.dataUrl, 'JPEG', margin, currentY, finalImageWidth, finalImageHeight);
      currentY += finalImageHeight + 10;
      
      console.log(`✅ Successfully added slide ${summary.pageNumber} image`);
    } else {
      // Create a placeholder with slide content
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`Slide ${summary.pageNumber}`, margin, currentY);
      currentY += lineHeight * 1.5;
      
      // Create a visual placeholder box
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(1);
      const boxHeight = 80;
      const boxWidth = contentWidth;
      doc.rect(margin, currentY, boxWidth, boxHeight);
      
      // Add placeholder text inside the box
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text('Slide Image', margin + 5, currentY + 15);
      doc.text('(Rendering failed)', margin + 5, currentY + 25);
      doc.text('Using slide content as text below', margin + 5, currentY + 35);
      
      currentY += boxHeight + 10;
      
      // Add slide content as text
      const slideText = pageTexts[summary.pageNumber - 1] || '';
      if (slideText) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('Slide Content:', margin, currentY);
        currentY += lineHeight;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        const slideContent = doc.splitTextToSize(slideText, contentWidth);
        doc.text(slideContent, margin, currentY);
        currentY += lineHeight * slideContent.length + 10;
      }
    }

    // Add summary text
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary:', margin, currentY);
    currentY += lineHeight;

    doc.setFont('helvetica', 'normal');
    const summaryText = summary.success ? summary.summary : `Error: ${summary.error || 'Unknown error'}`;
    
    // Split long text into multiple lines
    const splitSummary = doc.splitTextToSize(summaryText, contentWidth);
    doc.text(splitSummary, margin, currentY);
    currentY += lineHeight * splitSummary.length + 15;

    // Add separator line
    if (i < summaries.length - 1) {
      doc.setLineWidth(0.5);
      doc.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 10;
    }
  }

  // Add footer to last page
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.text('Generated by Presentation Platform with AI-powered summarization', pageWidth / 2, pageHeight - 10, { align: 'center' });

  // Convert to blob
  const pdfBlob = doc.output('blob');
  return pdfBlob;
}

/**
 * Render all slides independently using PDF.js
 */
async function renderAllSlidesIndependently(
  pdfUrl: string, 
  pageNumbers: number[]
): Promise<{ [pageNumber: number]: { dataUrl: string; width: number; height: number } }> {
  const pageImages: { [pageNumber: number]: { dataUrl: string; width: number; height: number } } = {};
  
  try {
    // Dynamically import PDF.js
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
    
    // Load the PDF document
    console.log('📄 Loading PDF document for independent rendering...');
    const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
    console.log(`📄 PDF loaded with ${pdf.numPages} pages`);
    
    // Render each required page
    for (const pageNumber of pageNumbers) {
      try {
        console.log(`📄 Rendering page ${pageNumber}...`);
        
        // Get the page
        const page = await pdf.getPage(pageNumber);
        
        // Create a temporary canvas for rendering
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        if (!context) {
          console.warn(`Could not get 2D context for page ${pageNumber}`);
          continue;
        }
        
        // Set up viewport and scale
        const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better quality
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        // Render the page
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };
        
        await page.render(renderContext).promise;
        
        // Extract the image data
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        pageImages[pageNumber] = {
          dataUrl,
          width: canvas.width,
          height: canvas.height
        };
        
        console.log(`✅ Successfully rendered page ${pageNumber}`);
        
      } catch (error) {
        console.warn(`Failed to render page ${pageNumber}:`, error);
      }
    }
    
  } catch (error) {
    console.error('Error loading PDF for independent rendering:', error);
  }
  
  return pageImages;
}

/**
 * Extract a PDF page image directly using PDF.js (legacy function)
 */
async function extractPDFPageImage(pageNumber: number, pdfViewerElement: HTMLElement | null): Promise<{ dataUrl: string; width: number; height: number } | null> {
  try {
    // Find the canvas element in the PDF viewer
    const canvas = pdfViewerElement?.querySelector('canvas') as HTMLCanvasElement;
    if (!canvas) {
      console.warn('Canvas not found in PDF viewer');
      return null;
    }

    // Check if the canvas has content (not just empty)
    if (canvas.width === 0 || canvas.height === 0) {
      console.warn('Canvas has no content');
      return null;
    }

    // Extract the canvas as image
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    return {
      dataUrl,
      width: canvas.width,
      height: canvas.height
    };

  } catch (error) {
    console.warn(`Error extracting page ${pageNumber} image:`, error);
    return null;
  }
}


/**
 * Download a PDF blob as a file
 */
export function downloadPDF(blob: Blob, filename: string = 'presentation-summary.pdf'): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate filename with timestamp
 */
export function generateFilename(roomCode: string, timestamp?: Date): string {
  const date = timestamp || new Date();
  const dateStr = date.toISOString().split('T')[0];
  const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-');
  return `presentation-summary-${roomCode}-${dateStr}-${timeStr}.pdf`;
}
