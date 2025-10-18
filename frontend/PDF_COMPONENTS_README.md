# PDF Presentation Viewer Components

This project provides a complete PDF viewing and navigation system for presentations, built with React, Next.js, and PDF.js.

## Components

### 1. PDFViewer
Displays a specific page of a PDF document with automatic scaling and responsive design.

**Props:**
- `pdfUrl: string` - URL or blob URL of the PDF file
- `currentPage: number` - Page number to display (1-indexed)
- `onPageChange?: (page: number) => void` - Callback when page changes
- `className?: string` - Additional CSS classes

### 2. PDFNavigation
Provides navigation controls with arrow keys and page input.

**Props:**
- `currentPage: number` - Current page number
- `totalPages: number` - Total number of pages in the PDF
- `onPageChange: (page: number) => void` - Callback when page changes
- `className?: string` - Additional CSS classes

**Features:**
- Left/Right arrow buttons
- Direct page number input
- Keyboard navigation (← → arrow keys)
- Responsive design

### 3. PresentationViewer
Combines PDFViewer and PDFNavigation into a complete presentation interface.

**Props:**
- `pdfUrl: string` - URL or blob URL of the PDF file
- `className?: string` - Additional CSS classes
- `onPageChange?: (page: number) => void` - Callback when page changes
- `onTotalPagesChange?: (totalPages: number) => void` - Callback when total pages are loaded

### 4. PDFPresentationDemo
Complete demo component with file upload and URL input functionality.

## Usage

### Basic Usage
```tsx
import { PresentationViewer } from './components';

function MyComponent() {
  const [pdfUrl, setPdfUrl] = useState('');
  
  return (
    <PresentationViewer
      pdfUrl={pdfUrl}
      onPageChange={(page) => console.log('Current page:', page)}
      onTotalPagesChange={(total) => console.log('Total pages:', total)}
    />
  );
}
```

### Advanced Usage with Separate Components
```tsx
import { PDFViewer, PDFNavigation } from './components';

function CustomPresentation() {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  
  return (
    <div className="h-screen flex flex-col">
      <div className="flex-1">
        <PDFViewer
          pdfUrl="https://example.com/document.pdf"
          currentPage={currentPage}
          onPageChange={setTotalPages}
        />
      </div>
      <PDFNavigation
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
```

## Features

- **PDF Rendering**: Uses PDF.js for high-quality PDF rendering
- **Responsive Design**: Automatically scales to fit container
- **Keyboard Navigation**: Arrow keys for page navigation
- **Direct Page Input**: Type page number to jump to specific page
- **Loading States**: Shows loading spinner while PDF loads
- **Error Handling**: Displays error messages for failed loads
- **TypeScript Support**: Full TypeScript definitions included

## Integration with Firebase

These components are designed to work with Firebase Storage. Simply pass the Firebase Storage URL to the `pdfUrl` prop:

```tsx
// Example Firebase integration
const [pdfUrl, setPdfUrl] = useState('');

useEffect(() => {
  // Get PDF URL from Firebase Storage
  const getPdfUrl = async () => {
    const url = await getDownloadURL(ref(storage, 'presentations/slide-deck.pdf'));
    setPdfUrl(url);
  };
  
  getPdfUrl();
}, []);

return <PresentationViewer pdfUrl={pdfUrl} />;
```

## Styling

All components use Tailwind CSS classes and can be customized with additional CSS classes through the `className` prop. The components are designed to be responsive and work well on both desktop and mobile devices.

## Dependencies

- `pdfjs-dist`: PDF.js library for PDF rendering
- `react-pdf`: React wrapper for PDF.js (optional, not used in current implementation)
- `react`: React library
- `next`: Next.js framework
- `tailwindcss`: CSS framework for styling
