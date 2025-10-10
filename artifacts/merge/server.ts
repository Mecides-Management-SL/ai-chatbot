import { myProvider } from "@/lib/ai/providers";
import { createDocumentHandler } from "@/lib/artifacts/server";
import { getMergeGuidelines } from "@/lib/merge-config";
import { smoothStream, streamText } from "ai";

export const mergeDocumentHandler = createDocumentHandler<"merge">({
  kind: "merge",
  onCreateDocument: async ({ title, dataStream, session }) => {
    let draftContent = "";

    // Get merge guidelines (throws error if not configured)
    const { guidelinesDocumentUrl } = getMergeGuidelines();

    const { fullStream } = streamText({
      model: myProvider.languageModel("artifact-model"),
      system: `You are a document processor. Your task is to create documents based on provided guidelines.

CRITICAL REQUIREMENTS - NO EXCEPTIONS:
- DO NOT include any meta-commentary, explanations, or AI-generated language
- DO NOT use phrases like "Based on the provided documentation", "I'll prepare", "I'll analyze", "This document provides", "The merged document", etc.
- DO NOT explain what you're doing or add introductory/explanatory text
- DO NOT mention that content was "merged" or "combined" from sources
- DO NOT add conclusions about the merging process
- DO NOT reference the guidelines document or mention following instructions
- Start directly with the actual content
- Write as if you are the original author of a single, unified document
- Output ONLY the document content in markdown format

The guidelines document contains specific formatting and structure requirements - follow them exactly without mentioning that you're following guidelines.`,
      messages: [
        {
          role: "user",
          content: [
            // Include guidelines document (required)
            {
              type: "file" as const,
              data: guidelinesDocumentUrl,
              mediaType: "application/pdf", // Assuming guidelines are in PDF format
            },
            {
              type: "text" as const,
              text: `Create a document with the title: ${title}`,
            },
          ],
        },
      ],
      experimental_transform: smoothStream({ chunking: "word" }),
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === "text-delta") {
        const { text } = delta;

        draftContent += text;

        dataStream.write({
          type: "data-textDelta",
          data: text,
          transient: true,
        });
      }
    }

    return draftContent;
  },
  onUpdateDocument: async ({ document, description, dataStream }) => {
    let draftContent = "";

    // Get merge guidelines (throws error if not configured)
    const { guidelinesDocumentUrl } = getMergeGuidelines();

    const { fullStream } = streamText({
      model: myProvider.languageModel("artifact-model"),
      system: `You are a document processor. Your task is to update documents based on provided guidelines.

CRITICAL REQUIREMENTS - NO EXCEPTIONS:
- DO NOT include any meta-commentary, explanations, or AI-generated language
- DO NOT use phrases like "Based on the provided documentation", "I'll prepare", "I'll analyze", "I'll update", "I've made changes", etc.
- DO NOT explain what you're doing or add introductory/explanatory text
- DO NOT mention that you're "updating" or "editing" the document
- DO NOT reference the guidelines document or mention following instructions
- Write as if you are the original author making natural revisions
- Start directly with the updated content
- Output ONLY the updated document content in markdown format

The guidelines document contains specific formatting and structure requirements - follow them exactly without mentioning that you're following guidelines.`,
      messages: [
        {
          role: "user",
          content: [
            // Include guidelines document (required)
            {
              type: "file" as const,
              data: guidelinesDocumentUrl,
              mediaType: "application/pdf", // Assuming guidelines are in PDF format
            },
            {
              type: "text" as const,
              text: `Update the following document according to the user's request: "${description}"

Current document content:
${document.content}`,
            },
          ],
        },
      ],
      experimental_transform: smoothStream({ chunking: "word" }),
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === "text-delta") {
        const { text } = delta;

        draftContent += text;

        dataStream.write({
          type: "data-textDelta",
          data: text,
          transient: true,
        });
      }
    }

    return draftContent;
  },
});
