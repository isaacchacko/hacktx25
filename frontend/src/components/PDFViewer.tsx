'use client';

import React, { useEffect, useRef, useState } from 'react';
import { PDFViewerProps } from '../types/pdf';

const PDFViewer: React.FC<PDFViewerProps> = ({ 
  pdfUrl, 
  currentPage, 
  onPageChange,
  onPDFLoad,
  fitMode = 'auto',
  className = '' 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasReady, setCanvasReady] = useState<boolean>(false);
  const [pdfDocument, setPdfDocument] = useState<any>(null);

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
        
        // Configure worker
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
        
        // Notify parent component about PDF load
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
  }, [pdfjsLib, pdfUrl, onPageChange]);

  // Render current page
  useEffect(() => {
    const renderPage = async () => {
      if (!pdfDocument || !canvasReady || currentPage < 1 || currentPage > totalPages) {
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) {
        console.log('Canvas not available yet, skipping render');
        return;
      }

      try {
        const page = await pdfDocument.getPage(currentPage);
        const context = canvas.getContext('2d');

        if (!context) {
          console.error('Could not get 2D context from canvas');
          return;
        }

        // Calculate scale based on fit mode - ALWAYS maintain aspect ratio
        const container = canvas.parentElement;
        const containerWidth = container?.clientWidth || 1200;
        const containerHeight = container?.clientHeight || 800;
        
        const viewport = page.getViewport({ scale: 1 });
        const pdfAspectRatio = viewport.width / viewport.height;
        const containerAspectRatio = containerWidth / containerHeight;
        
        let scale = 1;
        
        switch (fitMode) {
          case 'width':
            // Fit to width - scale so PDF width matches container width
            scale = (containerWidth - 80) / viewport.width;
            break;
          case 'height':
            // Fit to height - scale so PDF height matches container height
            scale = (containerHeight - 80) / viewport.height;
            break;
          case 'page':
            // Fit entire page - scale to fit both dimensions (smaller scale wins)
            scale = Math.min(
              (containerWidth - 80) / viewport.width,
              (containerHeight - 80) / viewport.height
            );
            break;
          case 'auto':
          default:
            // Smart fit - choose the mode that gives the largest readable size
            const widthScale = (containerWidth - 80) / viewport.width;
            const heightScale = (containerHeight - 80) / viewport.height;
            scale = Math.max(widthScale, heightScale);
            // Cap maximum zoom
            scale = Math.min(scale, 2.0);
            break;
        }
        
        const scaledViewport = page.getViewport({ scale });
        
        console.log('Scaling info:', {
          fitMode,
          originalSize: { width: viewport.width, height: viewport.height },
          containerSize: { width: containerWidth, height: containerHeight },
          pdfAspectRatio: pdfAspectRatio.toFixed(2),
          containerAspectRatio: containerAspectRatio.toFixed(2),
          calculatedScale: scale.toFixed(2),
          finalSize: { width: scaledViewport.width, height: scaledViewport.height }
        });

        // Set canvas dimensions with proper pixel ratio to prevent blurriness
        const devicePixelRatio = window.devicePixelRatio || 1;
        canvas.width = scaledViewport.width * devicePixelRatio;
        canvas.height = scaledViewport.height * devicePixelRatio;
        
        // Scale the canvas back down using CSS
        canvas.style.width = scaledViewport.width + 'px';
        canvas.style.height = scaledViewport.height + 'px';
        
        // Scale the drawing context so everything draws at the correct size
        context.scale(devicePixelRatio, devicePixelRatio);

        // Render page
        const renderContext = {
          canvasContext: context,
          viewport: scaledViewport,
        };

        await page.render(renderContext).promise;
      } catch (err) {
        console.error('Error rendering page:', err);
        setError('Failed to render PDF page');
      }
    };

    renderPage();
  }, [pdfDocument, canvasReady, currentPage, totalPages, fitMode]);

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
