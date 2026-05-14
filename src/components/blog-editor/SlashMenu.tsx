"use client";

import {
  Heading1,
  Heading2,
  Heading3,
  Type,
  Quote,
  List,
  ListOrdered,
  Code2,
  Minus,
  Image as ImageIcon,
  Link as LinkIcon,
  MonitorPlay,
} from "lucide-react";
import type { Editor } from "@tiptap/react";
import type { LucideIcon } from "lucide-react";

/**
 * Provided by the editor surface when a slash item is invoked. Lets items
 * delete the trigger text consistently and request a value from the user via
 * an in-app dialog (rather than `window.prompt`).
 */
export interface SlashRunContext {
  range: { from: number; to: number };
  requestUrl: (config: {
    title: string;
    label: string;
    placeholder?: string;
    icon?: LucideIcon;
    submitText?: string;
  }) => Promise<string | null>;
}

export interface SlashItem {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  keywords: string[];
  run: (editor: Editor, ctx: SlashRunContext) => void | Promise<void>;
}

/**
 * Runs a slash command after removing the trigger text (e.g. "/h1"). The
 * `range` is the inclusive ProseMirror range of the trigger + query that
 * should be replaced before the action executes.
 */
function chainBefore(editor: Editor, range: { from: number; to: number }) {
  return editor.chain().focus().deleteRange(range);
}

export const SLASH_ITEMS: SlashItem[] = [
  {
    id: "h1",
    title: "Heading 1",
    description: "Big section heading",
    icon: Heading1,
    keywords: ["h1", "title", "heading"],
    run: (e, ctx) => chainBefore(e, ctx.range).setNode("heading", { level: 1 }).run(),
  },
  {
    id: "h2",
    title: "Heading 2",
    description: "Medium section heading",
    icon: Heading2,
    keywords: ["h2", "heading"],
    run: (e, ctx) => chainBefore(e, ctx.range).setNode("heading", { level: 2 }).run(),
  },
  {
    id: "h3",
    title: "Heading 3",
    description: "Small section heading",
    icon: Heading3,
    keywords: ["h3", "heading"],
    run: (e, ctx) => chainBefore(e, ctx.range).setNode("heading", { level: 3 }).run(),
  },
  {
    id: "text",
    title: "Paragraph",
    description: "Plain body text",
    icon: Type,
    keywords: ["p", "paragraph", "text"],
    run: (e, ctx) => chainBefore(e, ctx.range).setNode("paragraph").run(),
  },
  {
    id: "quote",
    title: "Quote",
    description: "Capture a notable thought",
    icon: Quote,
    keywords: ["quote", "blockquote"],
    run: (e, ctx) => chainBefore(e, ctx.range).toggleBlockquote().run(),
  },
  {
    id: "ul",
    title: "Bullet list",
    description: "An unordered list",
    icon: List,
    keywords: ["ul", "bullet", "list"],
    run: (e, ctx) => chainBefore(e, ctx.range).toggleBulletList().run(),
  },
  {
    id: "ol",
    title: "Numbered list",
    description: "An ordered list",
    icon: ListOrdered,
    keywords: ["ol", "ordered", "numbered"],
    run: (e, ctx) => chainBefore(e, ctx.range).toggleOrderedList().run(),
  },
  {
    id: "code",
    title: "Code block",
    description: "Syntax-highlighted code",
    icon: Code2,
    keywords: ["code", "snippet", "block"],
    run: (e, ctx) => chainBefore(e, ctx.range).toggleCodeBlock().run(),
  },
  {
    id: "divider",
    title: "Divider",
    description: "Visual section break",
    icon: Minus,
    keywords: ["hr", "divider", "rule"],
    run: (e, ctx) => chainBefore(e, ctx.range).setHorizontalRule().run(),
  },
  {
    id: "image",
    title: "Image",
    description: "Embed an image by URL",
    icon: ImageIcon,
    keywords: ["image", "img", "picture"],
    run: async (e, ctx) => {
      const url = await ctx.requestUrl({
        title: "Insert image",
        label: "Image URL",
        placeholder: "https://images.unsplash.com/…",
        icon: ImageIcon,
        submitText: "Insert image",
      });
      if (!url) return;
      chainBefore(e, ctx.range).setImage({ src: url }).run();
    },
  },
  {
    id: "link",
    title: "Link",
    description: "Insert a hyperlink",
    icon: LinkIcon,
    keywords: ["link", "url", "href"],
    run: async (e, ctx) => {
      const url = await ctx.requestUrl({
        title: "Insert link",
        label: "Link URL",
        placeholder: "https://…",
        icon: LinkIcon,
        submitText: "Insert link",
      });
      if (!url) return;
      chainBefore(e, ctx.range)
        .insertContent({
          type: "text",
          text: url,
          marks: [{ type: "link", attrs: { href: url } }],
        })
        .run();
    },
  },
  {
    id: "playground",
    title: "Interactive playground",
    description: "Embed a runnable code snippet",
    icon: MonitorPlay,
    keywords: ["playground", "runnable", "sandbox", "code"],
    run: (e, ctx) => {
      // NOTE: We use `javascript-run` as the language id rather than a meta
      // flag — tiptap-markdown drops everything after the first whitespace
      // token in the info string, so a "javascript run" flag won't survive
      // the round-trip. MarkdownRenderer recognises the `-run` suffix.
      const code = "// Your interactive code here\nconsole.log('Hello from Codepad!');";
      chainBefore(e, ctx.range)
        .insertContent({
          type: "codeBlock",
          attrs: { language: "javascript-run" },
          content: [{ type: "text", text: code }],
        })
        .run();
    },
  },
];

export function filterSlashItems(query: string): SlashItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return SLASH_ITEMS;
  return SLASH_ITEMS.filter((item) =>
    [item.title, ...item.keywords].some((k) => k.toLowerCase().includes(q)),
  );
}

interface SlashMenuProps {
  items: SlashItem[];
  selectedIndex: number;
  position: { top: number; left: number };
  onSelect: (item: SlashItem) => void;
  onHover: (idx: number) => void;
}

export default function SlashMenu({
  items,
  selectedIndex,
  position,
  onSelect,
  onHover,
}: SlashMenuProps) {
  if (items.length === 0) {
    return (
      <div
        data-slash-menu="true"
        className="fixed z-50 w-72 rounded-xl border border-border bg-surface shadow-2xl p-4 text-xs text-muted"
        style={{ top: position.top, left: position.left }}
      >
        No matching blocks
      </div>
    );
  }

  return (
    <div
      data-slash-menu="true"
      className="fixed z-50 w-72 max-h-80 overflow-y-auto rounded-xl border border-border bg-surface shadow-2xl p-1.5"
      style={{ top: position.top, left: position.left }}
      role="listbox"
    >
      <div className="px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted/60">
        Basic blocks
      </div>
      {items.map((item, idx) => {
        const Icon = item.icon;
        const active = idx === selectedIndex;
        return (
          <button
            key={item.id}
            role="option"
            aria-selected={active}
            onMouseEnter={() => onHover(idx)}
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(item);
            }}
            className={`w-full flex items-start gap-3 px-2.5 py-2 rounded-lg text-left transition-colors ${
              active ? "bg-accent/10" : "hover:bg-bg/60"
            }`}
          >
            <span
              className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center border ${
                active
                  ? "bg-accent/20 border-accent/40 text-accent"
                  : "bg-bg border-border text-muted"
              }`}
            >
              <Icon className="w-4 h-4" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-fg truncate">
                {item.title}
              </span>
              <span className="block text-[11px] text-muted truncate">
                {item.description}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
