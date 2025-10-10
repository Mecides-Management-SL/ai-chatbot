
export type ArtifactKind = "text" | "image" | "merge";

export type UIArtifact = {
  documentId: string;
  content: string;
  kind: ArtifactKind;
  title: string;
  status: "idle" | "streaming";
  isVisible: boolean;
  boundingBox: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  metadata?: any;
};

export type Attachment = {
  name: string;
  url: string;
  contentType: string;
};
