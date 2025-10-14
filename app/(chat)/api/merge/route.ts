import { auth } from "@/app/(auth)/auth";
import { myProvider } from "@/lib/ai/providers";
import { getMergeGuidelines } from "@/lib/merge-config";
import { generateUUID } from "@/lib/utils";
import { streamText } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const mergeRequestSchema = z.object({
  files: z.array(
    z.object({
      url: z.string().url(),
      name: z.string(),
      contentType: z.string(),
    })
  ).min(1).max(2),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { files } = mergeRequestSchema.parse(body);

    if (files.length === 0) {
      return NextResponse.json({ error: "At least one file is required" }, { status: 400 });
    }

    // Create a unique document ID for this merge operation
    const documentId = generateUUID();
    const title = `INFORME TÉCNICO-Evaluación de I+D conforme art. 35.1.a) LIS ${documentId}`;

    // Get merge guidelines (throws error if not configured)
    const { guidelinesDocumentUrl } = getMergeGuidelines();
    
    // Process documents through Claude
    const result = await streamText({
      model: myProvider.languageModel("artifact-model"),
      system: `You are a document processor. Your task is to merge documents into a single, comprehensive output.

CRITICAL REQUIREMENTS - NO EXCEPTIONS:
- DO NOT include any meta-commentary, explanations, or AI-generated language
- DO NOT use phrases like "Based on the provided documentation", "I'll prepare", "I'll analyze", "This document provides", "The merged document", etc.
- DO NOT explain what you're doing or add introductory/explanatory text
- DO NOT mention that content was "merged" or "combined" from sources
- DO NOT add conclusions about the merging process
- DO NOT reference the guidelines document or mention following instructions
- Start directly with the actual content from the documents
- Write as if you are the original author of a single, unified document
- Output ONLY the merged document content in markdown format

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
            // Include user documents
            ...files.map(file => ({
              type: "file" as const,
              data: file.url,
              mediaType: file.contentType,
            })),
            {
              type: "text" as const,
              text: "Merge these documents into a single, comprehensive document.",
            },
          ],
        },
      ],
    });

    // Collect the full response
    let fullContent = "";
    for await (const delta of result.fullStream) {
      if (delta.type === "text-delta") {
        fullContent += delta.text;
      }
    }

    // Return the result
    return NextResponse.json({
      success: true,
      documentId,
      title,
      content: fullContent,
      sourceFiles: files,
    });

  } catch (error) {
    console.error("Merge API error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to process documents" },
      { status: 500 }
    );
  }
}
