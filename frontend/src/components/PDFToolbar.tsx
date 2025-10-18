'use client';

import React from 'react';
import { PDFFitMode } from '../types/pdf';

interface PDFToolbarProps {
  fitMode: PDFFitMode;
  onFitModeChange: (mode: PDFFitMode) => void;
  className?: string;
}

const PDFToolbar: React.FC<PDFToolbarProps> = ({
  fitMode,
  onFitModeChange,
  className = ''
}) => {
  const fitOptions = [
    { mode: 'width' as PDFFitMode, label: 'Fit Width', icon: '↔️', description: 'Scale to fit width (scrollable height)' },
    { mode: 'height' as PDFFitMode, label: 'Fit Height', icon: '↕️', description: 'Scale to fit height (scrollable width)' },
    { mode: 'page' as PDFFitMode, label: 'Fit Page', icon: '📄', description: 'Scale to fit entire page' },
    { mode: 'auto' as PDFFitMode, label: 'Auto Fit', icon: '🔍', description: 'Choose largest readable size' }
  ];

  return (
    <div className={`flex items-center justify-center space-x-2 p-3 bg-white border-b border-gray-200 ${className}`}>
      <span className="text-sm font-medium text-gray-700 mr-2">Fit:</span>
      {fitOptions.map((option) => (
        <button
          key={option.mode}
          onClick={() => onFitModeChange(option.mode)}
          className={`flex items-center space-x-1 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
            fitMode === option.mode
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          title={`${option.label} - ${option.description}`}
        >
          <span>{option.icon}</span>
          <span className="hidden sm:inline">{option.label}</span>
        </button>
      ))}
    </div>
  );
};

export default PDFToolbar;
