import { auth } from "@/app/(auth)/auth";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { z } from "zod";

const UploadPdfSchema = z.object({
  pdfBuffer: z.string(), // Base64 encoded PDF buffer
  filename: z.string().optional().default("merged-document.pdf"),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { pdfBuffer, filename } = UploadPdfSchema.parse(body);

    // Convert base64 to buffer
    const buffer = Buffer.from(pdfBuffer, 'base64');

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const uniqueFilename = `merged-documents/${timestamp}-${filename}`;

    // Upload to Vercel Blob
    const blob = await put(uniqueFilename, buffer, {
      access: 'public',
      contentType: 'application/pdf',
      addRandomSuffix: true,
    });

    return NextResponse.json({
      url: blob.url,
      filename: uniqueFilename,
    });

  } catch (error) {
    console.error('PDF upload error:', error);
    return NextResponse.json(
      { error: "Failed to upload PDF" },
      { status: 500 }
    );
  }
}
