'use client';

import React, { useEffect, useRef, useState } from 'react';

interface PDFViewerProps {
  pdfUrl: string;
  currentPage: number;
  onPageChange?: (newPage: number, previousPage: number) => void;
  onPDFLoad?: (totalPages: number) => void;
  onTimeUpdate?: (slideTimings: number[], estimatedTotal: number) => void;
  fitMode?: 'auto' | 'width' | 'height' | 'page';
  className?: string;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ 
  pdfUrl, 
  currentPage, 
  onPageChange,
  onPDFLoad,
  onTimeUpdate,
  fitMode = 'auto',
  className = '' 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isRenderingRef = useRef<boolean>(false);
  const renderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [canvasReady, setCanvasReady] = useState<boolean>(false);
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const prevPageRef = useRef<number>(currentPage);

  // Time tracking state
  const [slideTimings, setSlideTimings] = useState<number[]>([]);
  const [currentSlideStartTime, setCurrentSlideStartTime] = useState<number>(Date.now());

  // Callback ref to track when canvas is mounted
  const canvasCallbackRef = (canvas: HTMLCanvasElement | null) => {
    canvasRef.current = canvas;
    setCanvasReady(!!canvas);
  };

  const [totalPages, setTotalPages] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfjsLib, setPdfjsLib] = useState<any>(null);

  // Dynamically import PDF.js
  useEffect(() => {
    const loadPdfJs = async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
        setPdfjsLib(pdfjs);
      } catch (err) {
        console.error('Error loading PDF.js:', err);
        setError('Failed to load PDF library');
        setLoading(false);
      }
    };

    loadPdfJs();
  }, []);

  // Load PDF document
  useEffect(() => {
    const loadPDF = async () => {
      if (!pdfjsLib || !pdfUrl) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
        setPdfDocument(pdf);
        setTotalPages(pdf.numPages);
        
        // Initialize slide timings array
        setSlideTimings(new Array(pdf.numPages).fill(0));
        
        if (onPDFLoad) {
          onPDFLoad(pdf.numPages);
        }
      } catch (err) {
        console.error('Error loading PDF:', err);
        setError('Failed to load PDF document');
      } finally {
        setLoading(false);
      }
    };

    loadPDF();
  }, [pdfjsLib, pdfUrl, onPDFLoad]);

  // Track page changes and update timings
  useEffect(() => {
    if (prevPageRef.current !== currentPage && totalPages > 0) {
      const now = Date.now();
      const timeSpent = now - currentSlideStartTime;
      const previousPageIndex = prevPageRef.current - 1;
      
      // Update timing for the page we're leaving
      if (previousPageIndex >= 0 && previousPageIndex < slideTimings.length) {
        setSlideTimings(prev => {
          const newTimings = [...prev];
          newTimings[previousPageIndex] = (newTimings[previousPageIndex] || 0) + timeSpent;
          
      // Calculate estimated time REMAINING
      const viewedSlides = newTimings.filter(time => time > 0);
      const averageTime = viewedSlides.length > 0 
        ? viewedSlides.reduce((sum, time) => sum + time, 0) / viewedSlides.length 
        : 0;
      const remainingSlides = totalPages - currentPage;
      const estimatedRemaining = Math.round((averageTime * remainingSlides) / 1000);

          
          // Notify parent component
          if (onTimeUpdate) {
            onTimeUpdate(newTimings, estimatedRemaining);
          }
          
          return newTimings;
        });
      }
      
      // Reset timer for new slide
      setCurrentSlideStartTime(now);
      
      // Notify page change
      if (onPageChange) {
        onPageChange(currentPage, prevPageRef.current);
      }
      
      prevPageRef.current = currentPage;
    }
  }, [currentPage, totalPages, slideTimings.length, currentSlideStartTime, onPageChange, onTimeUpdate]);

  // Render current page
  useEffect(() => {
    const renderPage = async () => {
      if (!pdfDocument || !canvasReady || currentPage < 1 || currentPage > totalPages) {
        return;
      }

      if (isRenderingRef.current) {
        console.log('📄 Render already in progress, skipping duplicate render');
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) {
        console.log('Canvas not available yet, skipping render');
        return;
      }

      isRenderingRef.current = true;
      console.log('📄 Starting PDF render for page:', currentPage);

      try {
        const page = await pdfDocument.getPage(currentPage);
        const context = canvas.getContext('2d');

        if (!context) {
          console.error('Could not get 2D context from canvas');
          isRenderingRef.current = false;
          return;
        }

        const container = canvas.parentElement;
        const containerWidth = container?.clientWidth || 1200;
        const containerHeight = container?.clientHeight || 800;
        
        const viewport = page.getViewport({ scale: 1 });
        
        let scale = 1;
        
        switch (fitMode) {
          case 'width':
            scale = (containerWidth - 80) / viewport.width;
            break;
          case 'height':
            scale = (containerHeight - 80) / viewport.height;
            break;
          case 'page':
            scale = Math.min(
              (containerWidth - 80) / viewport.width,
              (containerHeight - 80) / viewport.height
            );
            break;
          case 'auto':
          default:
            const widthScale = (containerWidth - 80) / viewport.width;
            const heightScale = (containerHeight - 80) / viewport.height;
            scale = Math.max(widthScale, heightScale);
            scale = Math.min(scale, 2.0);
            break;
        }
        
        const scaledViewport = page.getViewport({ scale });

        const devicePixelRatio = window.devicePixelRatio || 1;
        canvas.width = scaledViewport.width * devicePixelRatio;
        canvas.height = scaledViewport.height * devicePixelRatio;
        
        canvas.style.width = scaledViewport.width + 'px';
        canvas.style.height = scaledViewport.height + 'px';
        
        context.scale(devicePixelRatio, devicePixelRatio);

        const renderContext = {
          canvasContext: context,
          viewport: scaledViewport,
        };

        await page.render(renderContext).promise;
        console.log('📄 PDF render completed for page:', currentPage);
      } catch (err) {
        console.error('❌ Error rendering page:', err);
        setError('Failed to render PDF page');
      } finally {
        isRenderingRef.current = false;
      }
    };

    if (renderTimeoutRef.current) {
      clearTimeout(renderTimeoutRef.current);
    }

    renderTimeoutRef.current = setTimeout(() => {
      renderPage();
    }, 100);

    return () => {
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }
    };
  }, [pdfDocument, canvasReady, currentPage, totalPages, fitMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }
      isRenderingRef.current = false;
    };
  }, []);

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-96 bg-gray-100 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading PDF...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center h-96 bg-red-50 ${className}`}>
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <p className="text-red-600 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  if (!pdfDocument) {
    return (
      <div className={`flex items-center justify-center h-96 bg-gray-100 ${className}`}>
        <p className="text-gray-600">No PDF document loaded</p>
      </div>
    );
  }

  return (
    <div className={`flex justify-center items-center bg-gray-50 h-full w-full ${className}`}>
      <div 
        className={`w-full h-full p-4 ${
          fitMode === 'height' ? 'overflow-x-auto overflow-y-hidden' :
          fitMode === 'width' ? 'overflow-x-hidden overflow-y-auto' :
          'overflow-auto'
        }`}
      >
        <div className={`flex items-center justify-center ${
          fitMode === 'height' ? 'h-full' :
          fitMode === 'width' ? 'w-full' :
          'min-h-full min-w-full'
        }`}>
          <canvas
            ref={canvasCallbackRef}
            className="shadow-lg border border-gray-200 rounded-lg"
            style={{ maxWidth: 'none', maxHeight: 'none' }}
          />
        </div>
      </div>
    </div>
  );
};

export default PDFViewer;
