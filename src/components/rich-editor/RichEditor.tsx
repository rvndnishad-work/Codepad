"use client";

import { useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "tiptap-markdown";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  SquareCode,
  Link2,
  ImagePlus,
  Undo2,
  Redo2,
  Blocks,
  Play,
  Braces,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { baseExtensions } from "./extensions";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export type EmbedOption = { id: string; slug: string; title: string };

type Props = {
  /** Tiptap JSON document — wins over initialMarkdown when present. */
  initialJson?: unknown | null;
  /** Legacy markdown body — parsed into the editor on first load. */
  initialMarkdown?: string | null;
  placeholder?: string;
  minHeightClass?: string;
  /** Creator's own content offered by the embed picker. */
  embeds?: { snippets: EmbedOption[]; challenges: EmbedOption[] };
  onChange: (json: object) => void;
};

export default function RichEditor({
  initialJson,
  initialMarkdown,
  placeholder = "Write something great…",
  minHeightClass = "min-h-[220px]",
  embeds,
  onChange,
}: Props) {
  const [embedOpen, setEmbedOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      ...baseExtensions(),
      Placeholder.configure({ placeholder }),
      // Parses legacy markdown passed as initial content (and markdown paste).
      Markdown.configure({ html: false, transformPastedText: true }),
    ],
    content: (initialJson as object | null) ?? initialMarkdown ?? "",
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: {
        class: `prose prose-sm dark:prose-invert max-w-none focus:outline-none px-4 py-3 ${minHeightClass}`,
      },
    },
    // JSON round-trip: ProseMirror attrs can be null-prototype objects, which
    // React's server-action serializer rejects ("temporary client reference").
    onUpdate: ({ editor }) => onChange(JSON.parse(JSON.stringify(editor.getJSON()))),
  });

  if (!editor) {
    return <div className={`rounded-xl border border-border bg-bg ${minHeightClass}`} />;
  }

  function pickImage(file: File) {
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Image too large", { description: "Keep images under 8MB." });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      editor?.chain().focus().setImage({ src: String(reader.result) }).run();
    };
    reader.readAsDataURL(file);
  }

  function setLink() {
    const prev = editor?.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", prev ?? "https://");
    if (url === null) return;
    if (url === "" || url === "https://") {
      editor?.chain().focus().unsetLink().run();
      return;
    }
    editor?.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  function insertEmbed(kind: "snippet" | "challenge", opt: EmbedOption) {
    editor
      ?.chain()
      .focus()
      .insertContent({ type: "contentEmbed", attrs: { kind, refId: opt.id, slug: opt.slug, title: opt.title } })
      .run();
    setEmbedOpen(false);
  }

  const hasEmbeds = !!embeds && (embeds.snippets.length > 0 || embeds.challenges.length > 0);

  return (
    <div className="rounded-xl border border-border bg-bg focus-within:border-accent/40 transition-colors relative">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 flex-wrap px-2 py-1.5 border-b border-border bg-surface/60 rounded-t-xl sticky top-0 z-10">
        <ToolBtn Icon={Bold} label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} />
        <ToolBtn Icon={Italic} label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} />
        <ToolBtn Icon={Strikethrough} label="Strikethrough" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} />
        <ToolBtn Icon={Code} label="Inline code" active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()} />
        <Divider />
        <ToolBtn Icon={Heading2} label="Heading" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
        <ToolBtn Icon={Heading3} label="Subheading" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} />
        <Divider />
        <ToolBtn Icon={List} label="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} />
        <ToolBtn Icon={ListOrdered} label="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
        <ToolBtn Icon={Quote} label="Quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} />
        <ToolBtn Icon={SquareCode} label="Code block" active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()} />
        <Divider />
        <ToolBtn Icon={Link2} label="Link" active={editor.isActive("link")} onClick={setLink} />
        <ToolBtn Icon={ImagePlus} label="Image" onClick={() => fileRef.current?.click()} />
        {hasEmbeds && (
          <ToolBtn Icon={Blocks} label="Embed playground / challenge" active={embedOpen} onClick={() => setEmbedOpen((o) => !o)} />
        )}
        <div className="ml-auto flex items-center gap-0.5">
          <ToolBtn Icon={Undo2} label="Undo" onClick={() => editor.chain().focus().undo().run()} />
          <ToolBtn Icon={Redo2} label="Redo" onClick={() => editor.chain().focus().redo().run()} />
        </div>
      </div>

      {/* Embed picker */}
      {embedOpen && embeds && (
        <div className="absolute top-11 left-2 right-2 z-20 rounded-xl border border-border bg-surface shadow-tile max-h-72 overflow-y-auto p-2">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Embed your content</span>
            <button type="button" onClick={() => setEmbedOpen(false)} className="text-muted hover:text-fg" aria-label="Close embed picker">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {embeds.snippets.length > 0 && (
            <EmbedGroup label="Playgrounds" Icon={Play} options={embeds.snippets} onPick={(o) => insertEmbed("snippet", o)} />
          )}
          {embeds.challenges.length > 0 && (
            <EmbedGroup label="Challenges" Icon={Braces} options={embeds.challenges} onPick={(o) => insertEmbed("challenge", o)} />
          )}
        </div>
      )}

      <EditorContent editor={editor} />

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) pickImage(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function ToolBtn({
  Icon,
  label,
  active,
  onClick,
}: {
  Icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`w-7 h-7 rounded-md grid place-items-center transition-colors ${
        active ? "bg-accent/15 text-accent" : "text-muted hover:text-fg hover:bg-panel/60"
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}

function Divider() {
  return <span className="w-px h-4 bg-border mx-1" aria-hidden />;
}

function EmbedGroup({
  label,
  Icon,
  options,
  onPick,
}: {
  label: string;
  Icon: LucideIcon;
  options: EmbedOption[];
  onPick: (o: EmbedOption) => void;
}) {
  return (
    <div className="mt-1">
      <div className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-muted/70 flex items-center gap-1">
        <Icon className="w-3 h-3" /> {label}
      </div>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onPick(o)}
          className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-fg hover:bg-panel/60 transition-colors truncate"
        >
          {o.title}
        </button>
      ))}
    </div>
  );
}
