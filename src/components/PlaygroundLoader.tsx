"use client";

import dynamic from "next/dynamic";
import { PlaygroundSkeleton } from "@/app/play/loading";
import type { SandpackFiles } from "@codesandbox/sandpack-react";

type Visibility = "private" | "public";

type Snippet = {
  id: string;
  slug: string;
  title: string;
  template: string;
  files: SandpackFiles;
  visibility: Visibility;
  tags?: string[];
};

type Props = {
  templateId: string;
  initialTitle?: string;
  initialFiles?: SandpackFiles;
  snippet?: Snippet | null;
  signedIn: boolean;
  isOwner?: boolean;
  embed?: boolean;
  previewOnly?: boolean;
  backHref?: string;
};

const Playground = dynamic(() => import("./Playground"), {
  ssr: false,
  loading: () => <PlaygroundSkeleton />,
});

export default function PlaygroundLoader(props: Props) {
  return <Playground {...props} />;
}
