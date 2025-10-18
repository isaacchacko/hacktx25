'use client';

import React, { useState, useEffect } from 'react';
import { PDFNavigationProps } from '../types/pdf';

const PDFNavigation: React.FC<PDFNavigationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  className = ''
}) => {
  const [pageInput, setPageInput] = useState<string>(currentPage.toString());
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // Update input when currentPage changes externally
  useEffect(() => {
    setPageInput(currentPage.toString());
  }, [currentPage]);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value);
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNumber = parseInt(pageInput);
    
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      onPageChange(pageNumber);
    } else {
      // Reset to current page if invalid
      setPageInput(currentPage.toString());
    }
    setIsEditing(false);
  };

  const handlePageInputBlur = () => {
    if (!isEditing) return;
    
    const pageNumber = parseInt(pageInput);
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      onPageChange(pageNumber);
    } else {
      setPageInput(currentPage.toString());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        handlePreviousPage();
        break;
      case 'ArrowRight':
        e.preventDefault();
        handleNextPage();
        break;
      case 'Enter':
        e.preventDefault();
        handlePageInputSubmit(e);
        break;
      case 'Escape':
        setPageInput(currentPage.toString());
        setIsEditing(false);
        break;
    }
  };

  return (
    <div 
      className={`flex items-center justify-center space-x-4 p-4 bg-white border-t border-gray-200 ${className}`}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Previous Button */}
      <button
        onClick={handlePreviousPage}
        disabled={currentPage <= 1}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        aria-label="Previous page"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Page Input */}
      <div className="flex items-center space-x-2">
        <form onSubmit={handlePageInputSubmit} className="flex items-center space-x-2">
          <input
            type="text"
            value={pageInput}
            onChange={handlePageInputChange}
            onFocus={() => setIsEditing(true)}
            onBlur={handlePageInputBlur}
            className="w-16 px-2 py-1 text-center border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Page"
          />
          <span className="text-gray-600">of {totalPages}</span>
        </form>
      </div>

      {/* Next Button */}
      <button
        onClick={handleNextPage}
        disabled={currentPage >= totalPages}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        aria-label="Next page"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Keyboard Instructions */}
      <div className="hidden md:flex items-center space-x-2 text-sm text-gray-500">
        <span>Use ← → arrow keys to navigate</span>
      </div>
    </div>
  );
};

export default PDFNavigation;
