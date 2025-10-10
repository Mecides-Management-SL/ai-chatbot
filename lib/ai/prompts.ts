import type { ArtifactKind } from "@/lib/types";

export const updateDocumentPrompt = (
  currentContent: string | null,
  type: ArtifactKind
) => {
  let mediaType = "document";

  if (type === "image") {
    mediaType = "image";
  }

  return `Improve the following contents of the ${mediaType} based on the given prompt.

${currentContent}`;
};
