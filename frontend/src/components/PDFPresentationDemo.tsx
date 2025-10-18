'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { storage, db, auth } from '../app/lib/firebase';

// Dynamically import PresentationViewer to prevent SSR issues
const PresentationViewer = dynamic(() => import('./PresentationViewer'), {
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

const PDFPresentationDemo: React.FC = () => {
  const router = useRouter();
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
      setPdfFile(file); // Store the actual File object for upload
    } else {
      alert('Please select a valid PDF file');
    }
  };

  const handleUrlInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPdfUrl(event.target.value);
    setPdfFile(null); // Clear file when using URL
  };

  const handleCreatePresentation = async () => {
    if (!pdfUrl) return;

    const user = auth.currentUser;
    if (!user) {
      alert('Please sign in to create a presentation');
      router.push('/login');
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);
      let finalPdfUrl = pdfUrl;
      let fileName = 'External PDF';
      let fileSize = 0;

      // Hybrid approach: Upload file to Firebase Storage if it's a local file
      if (pdfFile && pdfUrl.startsWith('blob:')) {
        fileName = pdfFile.name;
        fileSize = pdfFile.size;

        // Create storage reference
        const storageRef = storage.ref(`presentations/${user.uid}/${Date.now()}_${pdfFile.name}`);

        // Upload file with progress tracking
        const uploadTask = storageRef.put(pdfFile);

        // Monitor upload progress
        uploadTask.on('state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
          },
          (error) => {
            console.error('Upload error:', error);
            throw error;
          }
        );

        // Wait for upload to complete
        await uploadTask;

        // Get download URL
        finalPdfUrl = await storageRef.getDownloadURL();
      }

      // Save presentation metadata to Firestore
      const presentationDoc = await db.collection('presentations').add({
        pdfUrl: finalPdfUrl,
        pdfType: pdfFile ? 'uploaded' : 'external',
        userId: user.uid,
        userEmail: user.email,
        fileName: fileName,
        fileSize: fileSize,
        createdAt: new Date().toISOString(),
      });

      // Store presentation ID and URL in localStorage
      localStorage.setItem('presentation-id', presentationDoc.id);
      localStorage.setItem('presentation-pdf-url', finalPdfUrl);

      // Navigate to start-presenting page
      router.push('/start-presenting');

    } catch (error) {
      console.error('Error creating presentation:', error);
      alert('Failed to create presentation. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-2">
      <div className="max-w-full mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-4 text-center">
          PDF Presentation Viewer
        </h1>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload PDF File
              </label>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            {/* URL Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Or enter PDF URL
              </label>
              <input
                type="url"
                placeholder="https://example.com/document.pdf"
                value={pdfUrl}
                onChange={handleUrlInput}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Status */}
          {pdfUrl && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800">
                PDF loaded: Page {currentPage} of {totalPages}
              </p>
            </div>
          )}

          {/* Create Presentation Button */}
          <div className="mt-4">
            <button
              onClick={handleCreatePresentation}
              disabled={!pdfUrl || isUploading}
              className={`w-full md:w-auto px-6 py-3 rounded-lg font-medium transition-colors ${
                pdfUrl && !isUploading
                  ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                  : 'bg-gray-400 text-gray-200 cursor-not-allowed opacity-50'
              }`}
            >
              {isUploading
                ? `Uploading... ${Math.round(uploadProgress)}%`
                : 'Create Presentation'}
            </button>
          </div>
        </div>

        {/* PDF Viewer */}
        {pdfUrl ? (
          <div className="bg-white rounded-lg shadow-md overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
            <PresentationViewer
              pdfUrl={pdfUrl}
              onPageChange={setCurrentPage}
              onTotalPagesChange={setTotalPages}
              className="h-full"
            />
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-12 text-center" style={{ height: 'calc(100vh - 200px)' }}>
            <div className="text-gray-400 text-6xl mb-4">📄</div>
            <h2 className="text-xl font-semibold text-gray-600 mb-2">
              No PDF Selected
            </h2>
            <p className="text-gray-500">
              Upload a PDF file or enter a PDF URL to start viewing
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PDFPresentationDemo;
