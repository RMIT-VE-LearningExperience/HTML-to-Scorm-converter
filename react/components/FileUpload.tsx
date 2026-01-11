import React, { useState, useCallback } from 'react';
import { UploadIcon, FileIcon } from './Icon';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  acceptedFileType?: string;
  file: File | null;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, acceptedFileType = ".html,text/html", file }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  }, [onFileSelect]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <label
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`flex justify-center w-full h-64 px-4 transition bg-white border-2 ${isDragging ? 'border-[#d50032]' : 'border-gray-300'} border-dashed rounded-md appearance-none cursor-pointer hover:border-gray-400 focus:outline-none`}>
        <div className="flex flex-col items-center justify-center space-y-4">
          {file ? (
            <>
              <FileIcon className="w-16 h-16 text-green-500" />
              <p className="text-lg font-semibold text-gray-800">{file.name}</p>
              <span className="text-sm text-gray-500">({(file.size / 1024).toFixed(2)} KB)</span>
              <span className="text-sm text-gray-600">Drop another file or click to replace.</span>
            </>
          ) : (
            <>
              <UploadIcon className="w-16 h-16 text-gray-400"/>
              <span className="font-medium text-gray-700">
                Drop your HTML file here or
                <span className="text-[#d50032] underline ml-1">browse</span>
              </span>
              <span className="text-sm text-gray-500">Only .html files are accepted</span>
            </>
          )}
        </div>
        <input
          type="file"
          name="file_upload"
          className="hidden"
          accept={acceptedFileType}
          onChange={handleFileChange}
        />
      </label>
    </div>
  );
};