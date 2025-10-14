"use client";

import { CrossIcon, FileIcon, UploadIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCallback, useState } from "react";

export interface UploadedFile {
  file: File;
  url: string;
  name: string;
  contentType: string;
}

interface FileDropzoneProps {
  onFileUpload: (file: File) => Promise<UploadedFile | undefined>;
  onFileRemove?: (file: UploadedFile) => void;
  uploadedFiles: UploadedFile[];
  maxFiles?: number;
  className?: string;
  disabled?: boolean;
}

export function FileDropzone({
  onFileUpload,
  onFileRemove,
  uploadedFiles,
  maxFiles = 2,
  className,
  disabled = false,
}: FileDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (disabled || uploadedFiles.length >= maxFiles) return;

    const files = Array.from(e.dataTransfer.files).filter((file) => {
      const validTypes = [
        "application/pdf"];
      return validTypes.includes(file.type);
    });

    if (files.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of files.slice(0, maxFiles - uploadedFiles.length)) {
        await onFileUpload(file);
      }
    } finally {
      setIsUploading(false);
    }
  }, [disabled, uploadedFiles.length, maxFiles, onFileUpload]);

  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled || uploadedFiles.length >= maxFiles) return;

    const files = Array.from(e.target.files || []).filter((file) => {
      const validTypes = [
        "application/pdf"];
      return validTypes.includes(file.type);
    });

    if (files.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of files.slice(0, maxFiles - uploadedFiles.length)) {
        await onFileUpload(file);
      }
    } finally {
      setIsUploading(false);
    }
  }, [disabled, uploadedFiles.length, maxFiles, onFileUpload]);

  const getFileIcon = (contentType: string) => {
    if (contentType === "application/pdf") {
      return <div className="text-red-500"><FileIcon size={20} /></div>;
    }
    if (contentType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      return <div className="text-blue-500"><FileIcon size={20} /></div>;
    }
    return <div className="text-gray-500"><FileIcon size={20} /></div>;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className={cn("w-full", className)}>
      {/* Dropzone */}
      <div
        className={cn(
          "relative border-2 border-dashed rounded-lg p-8 text-center transition-colors",
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50",
          disabled && "opacity-50 cursor-not-allowed",
          uploadedFiles.length >= maxFiles && "border-green-500 bg-green-50 dark:bg-green-950/20"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple={maxFiles > 1}
          accept=".pdf"
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          disabled={disabled || uploadedFiles.length >= maxFiles}
        />
        
        <div className="space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <div className="text-muted-foreground">
              <UploadIcon size={24} />
            </div>
          </div>
          
          <div>
            <p className="text-lg font-medium">
              {uploadedFiles.length >= maxFiles
                ? "Máximo de documentos subidos"
                : isUploading
                ? "Subiendo..."
                : "Arrastra tus documentos aquí"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {uploadedFiles.length >= maxFiles
                ? "Puedes eliminar un documento para subir uno diferente"
                : `Sube hasta ${maxFiles} documentos PDF (máximo 20MB cada uno)`}
            </p>
          </div>

          {uploadedFiles.length < maxFiles && !isUploading && (
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              className="pointer-events-none"
            >
              Elegir archivos
            </Button>
          )}
        </div>
      </div>

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-medium">Documentos subidos:</h4>
          {uploadedFiles.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center justify-between p-3 bg-muted rounded-lg"
            >
              <div className="flex items-center space-x-3">
                {getFileIcon(file.contentType)}
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.file.size)}
                  </p>
                </div>
              </div>
              {onFileRemove && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onFileRemove(file)}
                  disabled={disabled}
                >
                  <CrossIcon size={16} />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
