'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import PDFNavigation from './PDFNavigation';
import PDFToolbar from './PDFToolbar';
import { PDFDocument, PDFFitMode } from '../types/pdf';

// Dynamically import PDFViewer to prevent SSR issues
const PDFViewer = dynamic(() => import('./PDFViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-96 bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading PDF viewer...</p>
      </div>
    </div>
  )
});

interface PresentationViewerProps {
  pdfUrl: string;
  className?: string;
  onPageChange?: (page: number) => void;
  onTotalPagesChange?: (totalPages: number) => void;
  onTimeUpdate?: (timings: number[], estimatedTotal: number) => void;
}

const PresentationViewer: React.FC<PresentationViewerProps> = ({
  pdfUrl,
  className = '',
  onPageChange,
  onTotalPagesChange,
  onTimeUpdate
}) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [fitMode, setFitMode] = useState<PDFFitMode>('auto');

  // Handle page changes from navigation
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    if (onPageChange) {
      onPageChange(page);
    }
  };

  // Handle total pages update from PDF viewer
  const handleTotalPagesChange = (pages: number) => {
    setTotalPages(pages);
    if (onTotalPagesChange) {
      onTotalPagesChange(pages);
    }
  };

  // Handle PDF viewer initialization (when PDF loads)
  const handlePDFInitialization = (pages: number) => {
    setTotalPages(pages);
    setCurrentPage(1); // Reset to page 1 when PDF loads
    if (onTotalPagesChange) {
      onTotalPagesChange(pages);
    }
  };

  // Handle fit mode changes
  const handleFitModeChange = (mode: PDFFitMode) => {
    setFitMode(mode);
  };

  // Reset to page 1 when PDF URL changes
  useEffect(() => {
    setCurrentPage(1);
    setTotalPages(0);
  }, [pdfUrl]);

  return (
    <div className={`flex flex-col h-full w-full bg-gray-50 ${className}`}>
      {/* PDF Toolbar */}
      {totalPages > 0 && (
        <PDFToolbar
          fitMode={fitMode}
          onFitModeChange={handleFitModeChange}
          className="flex-shrink-0"
        />
      )}
      
      {/* PDF Viewer */}
      <div className="flex-1 overflow-hidden min-h-0">
        <PDFViewer
          pdfUrl={pdfUrl}
          currentPage={currentPage}
          onPDFLoad={handlePDFInitialization}
          fitMode={fitMode}
          className="h-full"
        />
      </div>

      {/* Navigation Controls */}
      {totalPages > 0 && (
        <PDFNavigation
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          className="flex-shrink-0"
        />
      )}
    </div>
  );
};

export default PresentationViewer;
