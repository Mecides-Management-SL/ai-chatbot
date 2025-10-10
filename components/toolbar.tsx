"use client";

import type { ArtifactKind } from "@/lib/types";

type ToolProps = {
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
};

export function Toolbar({
  tool,
  sendMessage,
}: {
  tool: ToolProps;
  sendMessage: (message: { role: "user"; parts: Array<{ type: "text"; text: string }> }) => void;
}) {
  return (
    <button
      onClick={tool.onClick}
      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
    >
      {tool.icon}
      {tool.description}
    </button>
  );
}

export function ToolbarWrapper({
  isToolbarVisible,
  setIsToolbarVisible,
  status,
  sendMessage,
  stop,
  setMessages,
  artifactKind,
}: {
  isToolbarVisible: boolean;
  setIsToolbarVisible: React.Dispatch<React.SetStateAction<boolean>>;
  status: "idle" | "streaming";
  sendMessage: (message: { role: "user"; parts: Array<{ type: "text"; text: string }> }) => void;
  stop: () => void;
  setMessages: (messages: any[]) => void;
  artifactKind: ArtifactKind;
}) {
  // Toolbar simplified for document merger - no tools needed
  return null;
}
