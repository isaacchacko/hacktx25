// Import polyfills for browser APIs
import './domPolyfills';

// Only import PDF.js on client side to avoid SSR issues
let pdfjsLib: any = null;

// Initialize PDF.js only on client side
if (typeof window !== 'undefined') {
  import('pdfjs-dist').then((pdfjs) => {
    pdfjsLib = pdfjs;
    // Set up PDF.js worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
  });
}

export interface PDFTextExtractionResult {
  success: boolean;
  text: string;
  pageTexts: string[]; // Array of text for each page (index 0 = page 1)
  error?: string;
  pageCount: number;
}

export interface PDFTextExtractionOptions {
  onProgress?: (progress: number, currentPage: number, totalPages: number) => void;
}

/**
 * Extract text content from a PDF URL
 */
export async function extractTextFromPDF(pdfUrl: string, options?: PDFTextExtractionOptions): Promise<PDFTextExtractionResult> {
  try {
    console.log('📄 Starting PDF text extraction from:', pdfUrl);
    
    // Ensure PDF.js is loaded
    if (!pdfjsLib) {
      const pdfjs = await import('pdfjs-dist');
      pdfjsLib = pdfjs;
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
    }
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument(pdfUrl);
    const pdf = await loadingTask.promise;
    
    console.log('📄 PDF loaded, pages:', pdf.numPages);
    
    let fullText = '';
    const pageCount = pdf.numPages;
    const pageTexts: string[] = new Array(pageCount).fill(''); // Initialize array with empty strings
    
    // Extract text from each page
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Combine all text items from the page
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ')
          .trim();
        
        // Store page text in array (pageNum - 1 because array is 0-indexed)
        pageTexts[pageNum - 1] = pageText;
        
        if (pageText) {
          fullText += `\n--- Page ${pageNum} ---\n${pageText}\n`;
        }
        
        console.log(`📄 Extracted text from page ${pageNum}, length: ${pageText.length}`);
      } catch (pageError) {
        console.warn(`⚠️ Error extracting text from page ${pageNum}:`, pageError);
        // Continue with other pages even if one fails
        pageTexts[pageNum - 1] = ''; // Set empty string for failed pages
      }
    }
    
    if (!fullText.trim()) {
      return {
        success: false,
        text: '',
        pageTexts: pageTexts,
        error: 'No text content found in PDF',
        pageCount
      };
    }
    
    console.log('✅ PDF text extraction completed, total length:', fullText.length);
    console.log('📄 Page texts array length:', pageTexts.length);
    
    return {
      success: true,
      text: fullText.trim(),
      pageTexts: pageTexts,
      pageCount
    };
    
  } catch (error) {
    console.error('❌ Error extracting text from PDF:', error);
    
    return {
      success: false,
      text: '',
      pageTexts: [],
      error: error instanceof Error ? error.message : 'Unknown error during PDF text extraction',
      pageCount: 0
    };
  }
}

/**
 * Extract text from a PDF file (File object)
 */
export async function extractTextFromPDFFile(file: File, options?: PDFTextExtractionOptions): Promise<PDFTextExtractionResult> {
  try {
    console.log('📄 Starting PDF text extraction from file:', file.name);
    
    // Ensure PDF.js is loaded
    if (!pdfjsLib) {
      const pdfjs = await import('pdfjs-dist');
      pdfjsLib = pdfjs;
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
    }
    
    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument(arrayBuffer);
    const pdf = await loadingTask.promise;
    
    console.log('📄 PDF file loaded, pages:', pdf.numPages);
    
    let fullText = '';
    const pageCount = pdf.numPages;
    const pageTexts: string[] = new Array(pageCount).fill(''); // Initialize array with empty strings
    
    // Extract text from each page
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Combine all text items from the page
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ')
          .trim();
        
        // Store page text in array (pageNum - 1 because array is 0-indexed)
        pageTexts[pageNum - 1] = pageText;
        
        if (pageText) {
          fullText += `\n--- Page ${pageNum} ---\n${pageText}\n`;
        }
        
        console.log(`📄 Extracted text from page ${pageNum}, length: ${pageText.length}`);
      } catch (pageError) {
        console.warn(`⚠️ Error extracting text from page ${pageNum}:`, pageError);
        // Continue with other pages even if one fails
        pageTexts[pageNum - 1] = ''; // Set empty string for failed pages
      }
    }
    
    if (!fullText.trim()) {
      return {
        success: false,
        text: '',
        pageTexts: pageTexts,
        error: 'No text content found in PDF',
        pageCount
      };
    }
    
    console.log('✅ PDF file text extraction completed, total length:', fullText.length);
    console.log('📄 Page texts array length:', pageTexts.length);
    
    return {
      success: true,
      text: fullText.trim(),
      pageTexts: pageTexts,
      pageCount
    };
    
  } catch (error) {
    console.error('❌ Error extracting text from PDF file:', error);
    
    return {
      success: false,
      text: '',
      pageTexts: [],
      error: error instanceof Error ? error.message : 'Unknown error during PDF file text extraction',
      pageCount: 0
    };
  }
}
