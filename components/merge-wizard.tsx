"use client";

import { FileDropzone, type UploadedFile } from "@/components/file-dropzone";
import {
  CheckCircleFillIcon,
  DownloadIcon,
  LoaderIcon,
  PlusIcon
} from "@/components/icons";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Label } from "@Mecides-Management-SL/ui";
import Image from "next/image";
import { useCallback, useState } from "react";
import { toast } from "sonner";

type WizardStep = "upload" | "process" | "download";

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
      setCurrentStep("process");
      processDocuments();
    } else if (currentStep === "process" && mergeResult) {
      setCurrentStep("download");
      generatePdfPreview();
    }
  }, [currentStep, uploadedFiles.length, mergeResult]);

  const handleBack = useCallback(() => {
    if (currentStep === "process") {
      setCurrentStep("upload");
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
        toast.success("Documentos combinados exitosamente!");
      } else {
        const { error } = await response.json();
        toast.error(error || "Ha ocurrido un error al combinar los documentos");
      }
    } catch (error) {
      console.error("Merge error:", error);
      toast.error("Ha ocurrido un error al combinar los documentos, por favor intenta nuevamente");
    } finally {
      setIsProcessing(false);
    }
  }, [uploadedFiles]);

  const generatePdfPreview = useCallback(async () => {
    if (!mergeResult) return;

    try {
      toast.loading("Generando vista previa del PDF...", { id: "pdf-preview" });
      
      // Generate PDF on server
      const generateResponse = await fetch('/api/pdf/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          html: mergeResult.content,
          filename: `${mergeResult.title}.pdf`,
        }),
      });

      if (!generateResponse.ok) {
        throw new Error('Failed to generate PDF');
      }

      // Convert to blob URL for preview
      const pdfBuffer = await generateResponse.arrayBuffer();
      const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setPdfPreviewUrl(url);
      
      toast.success("Vista previa del PDF generada!", { id: "pdf-preview" });
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error("Ha ocurrido un error al generar la vista previa del PDF", { id: "pdf-preview" });
    }
  }, [mergeResult]);

  const handleDownloadPdf = useCallback(async () => {
    if (!mergeResult) return;

    try {
      toast.loading("Generating PDF...", { id: "pdf-download" });
      
      // Step 1: Generate PDF on server
      const generateResponse = await fetch('/api/pdf/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          html: mergeResult.content,
          filename: `${mergeResult.title}.pdf`,
        }),
      });

      if (!generateResponse.ok) {
        throw new Error('Failed to generate PDF');
      }

      // Step 2: Convert PDF to base64 for upload
      const pdfBuffer = await generateResponse.arrayBuffer();
      const uint8Array = new Uint8Array(pdfBuffer);
      const base64Pdf = btoa(String.fromCharCode.apply(null, Array.from(uint8Array)));

      // Step 3: Upload to Vercel Blob
      const uploadResponse = await fetch('/api/pdf/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pdfBuffer: base64Pdf,
          filename: `${mergeResult.title}.pdf`,
        }),
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload PDF');
      }

      const { url } = await uploadResponse.json();

      // Step 4: Download the PDF
      const link = document.createElement('a');
      link.href = url;
      link.download = `${mergeResult.title}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("PDF descargado exitosamente!", { id: "pdf-download" });
    } catch (error) {
      console.error("PDF download error:", error);
      toast.error("Ha ocurrido un error al descargar el PDF", { id: "pdf-download" });
    }
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
        return "Subir documentos";
      case "process":
        return "Procesando documentos";
      case "download":
        return "Descargar resultados";
      default:
        return "";
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case "upload":
        return "Adjunta la transcripción de la reunión inicial e información proporcionada del cliente (opcional)";
      case "process":
        return "La IA está analizando y combinando tus documentos";
      case "download":
        return "Tu documento está listo para descargar";
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8 flex flex-col items-center justify-center gap-2">
          <div className="flex items-center justify-center gap-2">
            <Image src="/images/logo.webp" alt="Mecides AI" width={200} height={100} />
          <h1 className="text-3xl font-bold mb-2 text-primary">AI</h1>
          </div>
          <p className="text-muted-foreground">
            Generador de Informes iniciales para proyectos competitivos de I+D
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-4">
            {["upload", "process", "download"].map((step, index) => {
              const stepIndex = index + 1;
              const isActive = currentStep === step;
              const isCompleted = ["upload", "process", "download"].indexOf(currentStep) > index;
              
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
          
            {/* Process Step */}
            {currentStep === "process" && (
              <div className="text-center py-12">
                {isProcessing ? (
                  <div className="space-y-4">
                    <div className="w-12 h-12 animate-spin mx-auto text-primary">
                      <LoaderIcon size={48} />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium">Procesando documentos</h3>
                      <p className="text-muted-foreground">
                        La IA está analizando y combinando tus documentos. Esto puede tomar unos minutos...
                      </p>
                    </div>
                  </div>
                ) : mergeResult ? (
                  <div className="space-y-4">
                    <div className="w-12 h-12 mx-auto text-green-500">
                      <CheckCircleFillIcon size={48} />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium">Procesado completado!</h3>
                      <p className="text-muted-foreground">
                        Tus documentos han sido combinados exitosamente.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="w-12 h-12 mx-auto text-muted-foreground">
                      <PlusIcon size={48} />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium">Listo para procesar</h3>
                      <p className="text-muted-foreground">
                        Haz clic en "Procesar documentos" para empezar a combinar.
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
                  <h3 className="text-lg font-medium mb-2">{`INFORME TÉCNICO-Evaluación de I+D conforme art. 35.1.a) LIS`} </h3>
                  <p className="text-muted-foreground">
                    Tu documento está listo para descargar
                  </p>
                </div>

                {/* Development: Raw LLM Output Preview */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="space-y-2">
                    <Label>Salida raw de la IA (Solo para desarrollo)</Label>
                    <div className="border rounded-lg p-4 bg-muted max-h-64 overflow-auto">
                      <pre className="text-xs whitespace-pre-wrap font-mono">
                        {mergeResult.content}
                      </pre>
                    </div>
                  </div>
                )}

                {/* PDF Preview */}
                {pdfPreviewUrl && (
                  <div className="space-y-2">
                    <Label>Vista previa del PDF</Label>
                    <div className="border rounded-lg overflow-hidden">
                      <iframe
                        src={pdfPreviewUrl}
                        className="w-full h-96"
                        title="PDF Preview"
                      />
                    </div>
                  </div>
                )}
                <div className="flex gap-3 justify-between w-full">
                {/* Download Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  <Button onClick={handleDownloadPdf} className="flex-1">
                    <div className="flex items-center">
                      <DownloadIcon size={16} />
                      <span className="ml-2">Descargar PDF</span>
                    </div>
                  </Button>
                </div>

                {/* Start New Button */}
                <div className="text-center w-full">
                  <Button onClick={handleStartNew} variant="ghost" className="w-full">
                    <div className="flex items-center">
                      <PlusIcon size={16} />
                      <span className="ml-2">Iniciar nuevo proceso</span>
                    </div>
                  </Button>
                </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            {currentStep !== "download" && (
            <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === "upload" || isProcessing}
            >
              ← Atrás
            </Button>
            
            <Button
              onClick={handleNext}
              disabled={!canProceed() || isProcessing}
            >
              {currentStep === "process" && !isProcessing ? "Procesar documentos" : "Siguiente →"}
            </Button>
            </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
