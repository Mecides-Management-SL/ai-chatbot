"use client";

import { FileDropzone, type UploadedFile } from "@/components/file-dropzone";
import {
  CheckCircleFillIcon,
  DownloadIcon,
  FileIcon,
  LoaderIcon,
  PlusIcon,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { downloadMarkdown, generateAndDownloadPdf, generatePdfDataUrl } from "@/lib/pdf-utils";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Label } from "./ui/label";

type WizardStep = "upload" | "preview" | "process" | "download";

interface MergeResult {
  documentId: string;
  title: string;
  content: string;
  sourceFiles: Array<{
    name: string;
    size: number;
    type: string;
  }>;
}

export function MergeWizard() {
  const [currentStep, setCurrentStep] = useState<WizardStep>("upload");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mergeResult, setMergeResult] = useState<MergeResult | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

  const uploadFile = useCallback(async (file: File): Promise<UploadedFile | undefined> => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const uploadedFile = {
          file,
          url: data.url,
          name: data.pathname,
          contentType: data.contentType,
        };
        
        // Update the uploadedFiles state
        setUploadedFiles(prev => [...prev, uploadedFile]);
        
        return uploadedFile;
      }
      
      const { error } = await response.json();
      toast.error(error || "Failed to upload file");
      return undefined;
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload file, please try again!");
      return undefined;
    }
  }, []);

  const removeFile = useCallback((fileToRemove: UploadedFile) => {
    setUploadedFiles(prev => prev.filter(file => file.url !== fileToRemove.url));
  }, []);

  const handleNext = useCallback(() => {
    if (currentStep === "upload" && uploadedFiles.length > 0) {
      setCurrentStep("preview");
    } else if (currentStep === "preview") {
      setCurrentStep("process");
      processDocuments();
    } else if (currentStep === "process" && mergeResult) {
      setCurrentStep("download");
      generatePdfPreview();
    }
  }, [currentStep, uploadedFiles.length, mergeResult]);

  const handleBack = useCallback(() => {
    if (currentStep === "preview") {
      setCurrentStep("upload");
    } else if (currentStep === "process") {
      setCurrentStep("preview");
    } else if (currentStep === "download") {
      setCurrentStep("process");
    }
  }, [currentStep]);

  const processDocuments = useCallback(async () => {
    if (uploadedFiles.length === 0) return;

    setIsProcessing(true);
    try {
      const response = await fetch("/api/merge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          files: uploadedFiles.map(file => ({
            url: file.url,
            name: file.name,
            contentType: file.contentType,
          })),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setMergeResult(result);
        toast.success("Documents merged successfully!");
      } else {
        const { error } = await response.json();
        toast.error(error || "Failed to merge documents");
      }
    } catch (error) {
      console.error("Merge error:", error);
      toast.error("Failed to merge documents, please try again");
    } finally {
      setIsProcessing(false);
    }
  }, [uploadedFiles]);

  const generatePdfPreview = useCallback(async () => {
    if (!mergeResult) return;

    try {
      const url = await generatePdfDataUrl(mergeResult.content);
      setPdfPreviewUrl(url);
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error("Failed to generate PDF preview");
    }
  }, [mergeResult]);

  const handleDownloadPdf = useCallback(async () => {
    if (!mergeResult) return;

    try {
      await generateAndDownloadPdf(mergeResult.content, `${mergeResult.title}.pdf`);
      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error("PDF download error:", error);
      toast.error("Failed to download PDF");
    }
  }, [mergeResult]);

  const handleDownloadMarkdown = useCallback(() => {
    if (!mergeResult) return;

    downloadMarkdown(mergeResult.content, `${mergeResult.title}.md`);
    toast.success("Markdown file downloaded!");
  }, [mergeResult]);

  const handleStartNew = useCallback(() => {
    setCurrentStep("upload");
    setUploadedFiles([]);
    setMergeResult(null);
    setPdfPreviewUrl(null);
  }, []);

  const canProceed = () => {
    switch (currentStep) {
      case "upload":
        return uploadedFiles.length > 0;
      case "preview":
        return true;
      case "process":
        return !isProcessing && mergeResult !== null;
      case "download":
        return true;
      default:
        return false;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case "upload":
        return "Upload Documents";
      case "preview":
        return "Preview Files";
      case "process":
        return "Processing Documents";
      case "download":
        return "Download Results";
      default:
        return "";
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case "upload":
        return "Upload 1-2 PDF or DOCX files to merge";
      case "preview":
        return "Review your uploaded files before processing";
      case "process":
        return "AI is analyzing and merging your documents";
      case "download":
        return "Your merged document is ready for download";
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Document Merger</h1>
          <p className="text-muted-foreground">
            Upload 1-2 documents and let AI merge them into a comprehensive document
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-4">
            {["upload", "preview", "process", "download"].map((step, index) => {
              const stepIndex = index + 1;
              const isActive = currentStep === step;
              const isCompleted = ["upload", "preview", "process", "download"].indexOf(currentStep) > index;
              
              return (
                <div key={step} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : isCompleted
                        ? "bg-green-500 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isCompleted ? <CheckCircleFillIcon size={16} /> : stepIndex}
                  </div>
                  {index < 3 && (
                    <div
                      className={`w-12 h-0.5 ${
                        isCompleted ? "bg-green-500" : "bg-muted"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <Card>
          <CardHeader>
            <CardTitle>{getStepTitle()}</CardTitle>
            <CardDescription>{getStepDescription()}</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Upload Step */}
            {currentStep === "upload" && (
              <div className="space-y-6">
                <FileDropzone
                  onFileUpload={uploadFile}
                  onFileRemove={removeFile}
                  uploadedFiles={uploadedFiles}
                  maxFiles={2}
                />
              </div>
            )}

            {/* Preview Step */}
            {currentStep === "preview" && (
              <div className="space-y-4">
                <div className="grid gap-4">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileIcon size={20} />
                        <div>
                          <p className="font-medium">{file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(file.file.size / 1024 / 1024).toFixed(1)} MB
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(file)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Process Step */}
            {currentStep === "process" && (
              <div className="text-center py-12">
                {isProcessing ? (
                  <div className="space-y-4">
                    <div className="w-12 h-12 animate-spin mx-auto text-primary">
                      <LoaderIcon size={48} />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium">Processing Documents</h3>
                      <p className="text-muted-foreground">
                        AI is analyzing and merging your documents. This may take a few minutes...
                      </p>
                    </div>
                  </div>
                ) : mergeResult ? (
                  <div className="space-y-4">
                    <div className="w-12 h-12 mx-auto text-green-500">
                      <CheckCircleFillIcon size={48} />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium">Processing Complete!</h3>
                      <p className="text-muted-foreground">
                        Your documents have been successfully merged.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="w-12 h-12 mx-auto text-muted-foreground">
                      <PlusIcon size={48} />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium">Ready to Process</h3>
                      <p className="text-muted-foreground">
                        Click "Process Documents" to start merging.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Download Step */}
            {currentStep === "download" && mergeResult && (
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-lg font-medium mb-2">{mergeResult.title}</h3>
                  <p className="text-muted-foreground">
                    Your merged document is ready for download
                  </p>
                </div>

                {/* PDF Preview */}
                {pdfPreviewUrl && (
                  <div className="space-y-2">
                    <Label>PDF Preview</Label>
                    <div className="border rounded-lg overflow-hidden">
                      <iframe
                        src={pdfPreviewUrl}
                        className="w-full h-96"
                        title="PDF Preview"
                      />
                    </div>
                  </div>
                )}

                {/* Download Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button onClick={handleDownloadPdf} className="flex-1">
                    <div className="flex items-center">
                      <DownloadIcon size={16} />
                      <span className="ml-2">Download PDF</span>
                    </div>
                  </Button>
                  <Button onClick={handleDownloadMarkdown} variant="outline" className="flex-1">
                    <div className="flex items-center">
                      <FileIcon size={16} />
                      <span className="ml-2">Download Markdown</span>
                    </div>
                  </Button>
                </div>

                {/* Start New Button */}
                <div className="text-center">
                  <Button onClick={handleStartNew} variant="ghost">
                    <div className="flex items-center">
                      <PlusIcon size={16} />
                      <span className="ml-2">Start New Merge</span>
                    </div>
                  </Button>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === "upload" || isProcessing}
            >
              ← Back
            </Button>
            
            <Button
              onClick={handleNext}
              disabled={!canProceed() || isProcessing}
            >
              {currentStep === "process" && !isProcessing ? "Process Documents" : "Next →"}
            </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
