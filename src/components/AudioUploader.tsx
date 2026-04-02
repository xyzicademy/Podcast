import React, { useState, useRef } from 'react';
import { UploadCloud } from 'lucide-react';

interface AudioUploaderProps {
  onFileSelect: (file: File) => void;
}

export const AudioUploader: React.FC<AudioUploaderProps> = ({ onFileSelect }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const isAudio = file.type.startsWith('audio/') || file.name.match(/\.(mp3|wav|m4a|ogg|aac|flac)$/i);
      if (isAudio) {
        onFileSelect(file);
      } else {
        console.error('אנא העלה קובץ אודיו בלבד.');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div 
      className={`
        w-full h-16 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors
        ${isDragging ? 'border-orange-500 bg-orange-500/10' : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-500'}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="audio/*" 
        className="hidden" 
      />
      
      <div className="flex items-center gap-2">
        <UploadCloud className={`w-5 h-5 ${isDragging ? 'text-orange-500' : 'text-zinc-500'}`} />
        <p className="text-zinc-300 font-medium text-sm">
          {isDragging ? 'שחרר את הקובץ כאן...' : 'העלאת קבצים'}
        </p>
      </div>
    </div>
  );
};
