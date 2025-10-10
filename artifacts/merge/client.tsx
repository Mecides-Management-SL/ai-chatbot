import { Artifact } from "@/components/create-artifact";
import { DocumentSkeleton } from "@/components/document-skeleton";
import {
  ClockRewind,
  CopyIcon,
  DownloadIcon,
  FileIcon,
  MessageIcon,
  PenIcon,
  RedoIcon,
  UndoIcon,
} from "@/components/icons";
import { downloadMarkdown, generateAndDownloadPdf } from "@/lib/pdf-utils";
import { toast } from "sonner";

type MergeArtifactMetadata = {
  sourceFiles?: Array<{
    name: string;
    size: number;
    type: string;
  }>;
};

export const mergeArtifact = new Artifact<"merge", MergeArtifactMetadata>({
  kind: "merge",
  description: "Merged document created from multiple source files",
  initialize: async ({ documentId, setMetadata }) => {
    // Initialize with empty metadata - source files will be set during creation
    setMetadata({
      sourceFiles: [],
    });
  },
  onStreamPart: ({ streamPart, setMetadata, setArtifact }) => {
    if (streamPart.type === "data-textDelta") {
      setArtifact((draftArtifact: any) => {
        return {
          ...draftArtifact,
          content: draftArtifact.content + streamPart.data,
          isVisible:
            draftArtifact.status === "streaming" &&
            draftArtifact.content.length > 400 &&
            draftArtifact.content.length < 450
              ? true
              : draftArtifact.isVisible,
          status: "streaming",
        };
      });
    }
  },
  content: ({
    mode,
    status,
    content,
    isCurrentVersion,
    currentVersionIndex,
    onSaveContent,
    getDocumentContentById,
    isLoading,
    metadata,
  }) => {
    if (isLoading) {
      return <DocumentSkeleton artifactKind="merge" />;
    }

    if (mode === "diff") {
      const oldContent = getDocumentContentById(currentVersionIndex - 1);
      const newContent = getDocumentContentById(currentVersionIndex);

      return (
        <div className="flex flex-col h-full">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold">Document Changes</h3>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <div className="prose max-w-none">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Previous Version</h4>
                  <div className="p-4 bg-muted rounded-lg">
                    <pre className="whitespace-pre-wrap text-sm">{oldContent}</pre>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Current Version</h4>
                  <div className="p-4 bg-muted rounded-lg">
                    <pre className="whitespace-pre-wrap text-sm">{newContent}</pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full">
        {/* Header with source files info */}
        {metadata?.sourceFiles && metadata.sourceFiles.length > 0 && (
          <div className="p-4 border-b bg-muted/50">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Source Files</h3>
            <div className="flex flex-wrap gap-2">
              {metadata.sourceFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-3 py-1 bg-background rounded-full text-sm"
                >
                  <FileIcon size={14} />
                  <span>{file.name}</span>
                  <span className="text-muted-foreground text-xs">
                    ({(file.size / 1024 / 1024).toFixed(1)} MB)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-6 md:p-12">
            <div className="prose max-w-none">
              <div className="whitespace-pre-wrap">{content}</div>
            </div>
          </div>
        </div>
      </div>
    );
  },
  actions: [
    {
      icon: <ClockRewind size={18} />,
      description: "View changes",
      onClick: ({ handleVersionChange }) => {
        handleVersionChange("toggle");
      },
      isDisabled: ({ currentVersionIndex }) => {
        if (currentVersionIndex === 0) {
          return true;
        }
        return false;
      },
    },
    {
      icon: <UndoIcon size={18} />,
      description: "View Previous version",
      onClick: ({ handleVersionChange }) => {
        handleVersionChange("prev");
      },
      isDisabled: ({ currentVersionIndex }) => {
        if (currentVersionIndex === 0) {
          return true;
        }
        return false;
      },
    },
    {
      icon: <RedoIcon size={18} />,
      description: "View Next version",
      onClick: ({ handleVersionChange }) => {
        handleVersionChange("next");
      },
      isDisabled: ({ isCurrentVersion }) => {
        if (isCurrentVersion) {
          return true;
        }
        return false;
      },
    },
    {
      icon: <DownloadIcon size={18} />,
      description: "Download as PDF",
      onClick: async ({ content }) => {
        try {
          await generateAndDownloadPdf(content, "merged-document.pdf");
          toast.success("PDF downloaded successfully!");
        } catch (error) {
          console.error("Error generating PDF:", error);
          toast.error("Failed to generate PDF");
        }
      },
    },
    {
      icon: <FileIcon size={18} />,
      description: "Download as Markdown",
      onClick: ({ content }) => {
        downloadMarkdown(content, "merged-document.md");
        toast.success("Markdown file downloaded!");
      },
    },
    {
      icon: <CopyIcon size={18} />,
      description: "Copy to clipboard",
      onClick: ({ content }) => {
        navigator.clipboard.writeText(content);
        toast.success("Copied to clipboard!");
      },
    },
  ],
  toolbar: [
    {
      icon: <PenIcon />,
      description: "Improve structure",
      onClick: ({ sendMessage }) => {
        sendMessage({
          role: "user",
          parts: [
            {
              type: "text",
              text: "Please improve the structure and organization of this merged document. Add better headings, improve flow, and ensure all information is well-organized.",
            },
          ],
        });
      },
    },
    {
      icon: <MessageIcon />,
      description: "Add summary",
      onClick: ({ sendMessage }) => {
        sendMessage({
          role: "user",
          parts: [
            {
              type: "text",
              text: "Please add a comprehensive summary at the beginning of this document that highlights the key points and findings from all source materials.",
            },
          ],
        });
      },
    },
  ],
});
