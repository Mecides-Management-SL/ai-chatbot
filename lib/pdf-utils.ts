import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/**
 * Convert markdown text to HTML for PDF generation
 */
export function markdownToHtml(markdown: string): string {
  // Simple markdown to HTML conversion
  // In a production app, you might want to use a proper markdown parser like marked or remark
  let html = markdown
    // Headers
    .replace(/^### (.*$)/gim, "<h3>$1</h3>")
    .replace(/^## (.*$)/gim, "<h2>$1</h2>")
    .replace(/^# (.*$)/gim, "<h1>$1</h1>")
    // Bold
    .replace(/\*\*(.*)\*\*/gim, "<strong>$1</strong>")
    // Italic
    .replace(/\*(.*)\*/gim, "<em>$1</em>")
    // Line breaks
    .replace(/\n/gim, "<br>")
    // Lists
    .replace(/^\* (.*$)/gim, "<li>$1</li>")
    .replace(/^- (.*$)/gim, "<li>$1</li>");

  // Wrap list items in ul tags
  html = html.replace(/(<li>.*<\/li>)/gims, "<ul>$1</ul>");

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; max-width: 800px; margin: 0 auto;">
      ${html}
    </div>
  `;
}

/**
 * Generate PDF blob from markdown content
 */
export async function generatePdfFromMarkdown(
  markdown: string,
  filename: string = "merged-document.pdf"
): Promise<Blob> {
  const html = markdownToHtml(markdown);
  
  // Create a temporary div to render the HTML
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;
  tempDiv.style.position = "absolute";
  tempDiv.style.left = "-9999px";
  tempDiv.style.top = "-9999px";
  tempDiv.style.width = "800px";
  document.body.appendChild(tempDiv);

  try {
    // Convert HTML to canvas
    const canvas = await html2canvas(tempDiv, {
      scale: 2, // Higher quality
      useCORS: true,
      allowTaint: true,
    });

    // Create PDF
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const imgWidth = 210; // A4 width in mm
    const pageHeight = 295; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;

    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    return pdf.output("blob");
  } finally {
    // Clean up
    document.body.removeChild(tempDiv);
  }
}

/**
 * Download PDF blob as file
 */
export function downloadPdf(blob: Blob, filename: string = "merged-document.pdf"): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate PDF and download it
 */
export async function generateAndDownloadPdf(
  markdown: string,
  filename: string = "merged-document.pdf"
): Promise<void> {
  const blob = await generatePdfFromMarkdown(markdown, filename);
  downloadPdf(blob, filename);
}

/**
 * Generate PDF blob for preview (returns data URL)
 */
export async function generatePdfDataUrl(markdown: string): Promise<string> {
  const blob = await generatePdfFromMarkdown(markdown);
  return URL.createObjectURL(blob);
}

/**
 * Download markdown as text file
 */
export function downloadMarkdown(markdown: string, filename: string = "merged-document.md"): void {
  const blob = new Blob([markdown], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
