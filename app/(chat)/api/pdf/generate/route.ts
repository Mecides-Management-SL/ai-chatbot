import { auth } from "@/app/(auth)/auth";
import chromium from "@sparticuz/chromium";
import { marked } from "marked";
import { NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import { z } from "zod";

const GeneratePdfSchema = z.object({
  html: z.string().min(1, "Content is required"),
  filename: z.string().optional().default("merged-document.pdf"),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { html, filename } = GeneratePdfSchema.parse(body);

    // Convert markdown to HTML using marked
    const processedHtml = await marked.parse(html);

    // Launch Puppeteer with Vercel-compatible configuration
    const browser = await puppeteer.launch({
      args: [
        ...(chromium.args || []),
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ],
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    try {
      const page = await browser.newPage();

      // Set the HTML content with proper CSS for PDF generation
      const fullHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            @media print {
              .no-break { 
                page-break-inside: avoid; 
              }
              section { 
                margin-bottom: 2rem; 
              }
              h1, h2, h3 { 
                page-break-after: avoid; 
                page-break-inside: avoid;
              }
              table {
                page-break-inside: avoid;
              }
              ul, ol {
                page-break-inside: avoid;
              }
            }
            
            body {
              font-family: 'Times New Roman', serif;
              font-size: 12pt;
              line-height: 1.6;
              color: #000;
              margin: 0;
              padding: 0;
            }
            
            article {
              padding: 20px;
            }
            
            h1 {
              font-size: 18pt;
              font-weight: bold;
              margin-top: 0;
              margin-bottom: 16pt;
              page-break-after: avoid;
            }
            
            h2 {
              font-size: 16pt;
              font-weight: bold;
              margin-top: 16pt;
              margin-bottom: 12pt;
              page-break-after: avoid;
            }
            
            h3 {
              font-size: 14pt;
              font-weight: bold;
              margin-top: 12pt;
              margin-bottom: 8pt;
              page-break-after: avoid;
            }
            
            p {
              margin-bottom: 8pt;
              text-align: justify;
            }
            
            ul, ol {
              margin-bottom: 8pt;
              padding-left: 20pt;
            }
            
            li {
              margin-bottom: 4pt;
            }
            
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 12pt;
            }
            
            th, td {
              border: 1pt solid #000;
              padding: 6pt;
              text-align: left;
            }
            
            th {
              background-color: #f5f5f5;
              font-weight: bold;
            }
            
            strong {
              font-weight: bold;
            }
            
            em {
              font-style: italic;
            }
          </style>
        </head>
        <body>
          <article>
            ${processedHtml}
          </article>
        </body>
        </html>
      `;

      await page.setContent(fullHtml, { waitUntil: 'domcontentloaded' });
      
      // Wait for fonts to load
      await page.evaluateHandle('document.fonts.ready');

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        },
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: false,
      });

      // Encode filename to handle non-ASCII characters
      const encodedFilename = encodeURIComponent(filename);
      
      return new Response(pdfBuffer.buffer.slice(pdfBuffer.byteOffset, pdfBuffer.byteOffset + pdfBuffer.byteLength) as ArrayBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename*=UTF-8''${encodedFilename}`,
          'Content-Length': pdfBuffer.length.toString(),
        },
      });

    } finally {
      await browser.close();
    }

  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
