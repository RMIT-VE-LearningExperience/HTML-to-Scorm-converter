import React, { useState, useCallback } from 'react';
import { Button } from './components/Button';
import { FileUpload } from './components/FileUpload';
import { DownloadIcon } from './components/Icon';
import { generateManifestXML, injectScormApi } from './services/scormService';

// This is needed because JSZip is loaded from a CDN script in index.html
declare var JSZip: any;

const App: React.FC = () => {
  const [htmlFile, setHtmlFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadFilename, setDownloadFilename] = useState<string>('');

  const handleFileSelect = useCallback((file: File) => {
    if (file.type !== 'text/html') {
      setError('Invalid file type. Please upload an HTML file.');
      setHtmlFile(null);
      return;
    }
    setError(null);
    setHtmlFile(file);
    // If a previous conversion exists, clear it when a new file is selected.
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
      setDownloadFilename('');
      setSuccessMessage(null);
    }
  }, [downloadUrl]);

  const handleConvert = async () => {
    if (!htmlFile) {
      setError('Please select an HTML file first.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const htmlContent = await htmlFile.text();
      const injectedHtml = injectScormApi(htmlContent);
      
      const packageHtmlFileName = 'index.html';
      const courseTitle = htmlFile.name.replace(/\.[^/.]+$/, "") || "SCORM Activity";
      
      const manifestXML = generateManifestXML(courseTitle, packageHtmlFileName);

      const zip = new JSZip();
      zip.file(packageHtmlFileName, injectedHtml);
      zip.file('imsmanifest.xml', manifestXML);
      
      const content = await zip.generateAsync({ type: 'blob' });
      
      const safeFilename = htmlFile.name.replace(/\.[^/.]+$/, "").replace(/[^a-z0-9]/gi, '_').toLowerCase();
      
      setDownloadUrl(URL.createObjectURL(content));
      setDownloadFilename(`${safeFilename}_scorm_1.2.zip`);
      setSuccessMessage('Package created successfully! Ready for download.');

    } catch (err) {
      console.error(err);
      setError('An error occurred during conversion. Please check the console.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = useCallback(() => {
    if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
    }
    setHtmlFile(null);
    setError(null);
    setSuccessMessage(null);
    setDownloadUrl(null);
    setDownloadFilename('');
  }, [downloadUrl]);

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-2xl mx-auto">
        <div className="text-center">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-[#d50032] mb-2">
            HTML to SCORM Converter
            </h1>
            <p className="text-lg text-gray-600 mb-8">
            Upload your HTML file to package it as a SCORM 1.2 compliant course.
            </p>
        </div>
        
        <div className="space-y-6">
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md text-left" role="alert">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          {downloadUrl ? (
             <div className="text-center p-6 sm:p-8 bg-white rounded-lg shadow-md border border-gray-200">
                {successMessage && (
                    <div className="bg-green-100 border-green-400 text-green-700 px-4 py-3 rounded-md text-left mb-6" role="alert">
                      <strong className="font-bold">Success!</strong>
                      <span className="block sm:inline ml-1">{successMessage}</span>
                    </div>
                )}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <a
                    href={downloadUrl}
                    download={downloadFilename}
                    className="flex w-full sm:w-auto items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-[#d50032] hover:bg-[#b00029] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-[#d50032] transition-all duration-150"
                  >
                    <DownloadIcon className="w-5 h-5 mr-2" />
                    Download Package
                  </a>
                  <Button
                    onClick={handleReset}
                    variant="secondary"
                    className="w-full sm:w-auto"
                  >
                    Start Over
                  </Button>
                </div>
              </div>
          ) : (
            <>
              <FileUpload onFileSelect={handleFileSelect} file={htmlFile} />

              <div className="flex justify-center">
                <Button
                  onClick={handleConvert}
                  disabled={!htmlFile || isLoading}
                  isLoading={isLoading}
                >
                  {isLoading ? 'Processing...' : 'Convert to SCORM'}
                </Button>
              </div>
            </>
          )}

        </div>

        <div className="mt-12 text-gray-500 text-sm text-center">
          <p>This tool creates a SCORM 1.2 package compatible with most LMSs, including Canvas.</p>
          <p>It injects the necessary SCORM API calls and generates a valid <code className="bg-gray-200 text-gray-800 p-1 rounded-md text-xs">imsmanifest.xml</code>.</p>
        </div>
      </div>
    </div>
  );
};

export default App;
