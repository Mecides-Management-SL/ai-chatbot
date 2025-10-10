/**
 * Configuration for the document merger feature
 */

// URL to the guidelines document that should be used for all merge operations
// This should be uploaded to a permanent location (e.g., Vercel Blob, AWS S3, etc.)
export const MERGE_GUIDELINES_DOCUMENT_URL = process.env.MERGE_GUIDELINES_DOCUMENT_URL;

/**
 * Get the guidelines for document merging
 * Throws an error if the guidelines document URL is not configured
 */
export function getMergeGuidelines() {
  if (!MERGE_GUIDELINES_DOCUMENT_URL) {
    throw new Error(
      "MERGE_GUIDELINES_DOCUMENT_URL environment variable is not set. " +
      "Please configure the guidelines document URL in your .env.local file. " +
      "This is required for the document merger to function properly."
    );
  }

  return {
    guidelinesDocumentUrl: MERGE_GUIDELINES_DOCUMENT_URL,
  };
}
