export type PDFFitMode = 'width' | 'height' | 'page' | 'auto';

export interface PDFViewerProps {
  pdfUrl: string;
  currentPage: number;
  onPageChange?: (page: number) => void;
  onPDFLoad?: (totalPages: number) => void;
  fitMode?: PDFFitMode;
  className?: string;
}

export interface PDFNavigationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export interface PDFDocument {
  url: string;
  totalPages: number;
  currentPage: number;
}
