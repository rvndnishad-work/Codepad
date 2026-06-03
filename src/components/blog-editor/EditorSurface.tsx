"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu, FloatingMenu } from "@tiptap/react/menus";
import { StarterKit } from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Image } from "@tiptap/extension-image";
import { Link } from "@tiptap/extension-link";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { TextAlign } from "@tiptap/extension-text-align";
import { Highlight } from "@tiptap/extension-highlight";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { CharacterCount } from "@tiptap/extension-character-count";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const SLASH_MENU_WIDTH = 288; // matches w-72 in SlashMenu
const SLASH_MENU_MAX_HEIGHT = 320; // matches max-h-80
const SLASH_MENU_MARGIN = 8;
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Link as LinkIcon,
  Highlighter,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Plus,
} from "lucide-react";

import SlashMenu, {
  filterSlashItems,
  SLASH_ITEMS,
  type SlashItem,
  type SlashRunContext,
} from "./SlashMenu";
import PromptDialog, { type PromptConfig } from "./PromptDialog";

const lowlight = createLowlight(common);

interface EditorSurfaceProps {
  content: string;
  onChange: (markdown: string) => void;
  onStats?: (stats: { words: number; characters: number }) => void;
  placeholder?: string;
}

interface SlashState {
  open: boolean;
  query: string;
  range: { from: number; to: number };
  position: { top: number; left: number };
  selectedIndex: number;
}

const INITIAL_SLASH: SlashState = {
  open: false,
  query: "",
  range: { from: 0, to: 0 },
  position: { top: 0, left: 0 },
  selectedIndex: 0,
};

/**
 * Pick a viewport position for the slash menu near the caret. Prefers placing
 * the menu below the line; flips above when there isn't room. Clamps inside
 * the viewport so it never lands far away from the caret.
 */
function placeSlashMenu(caret: { top: number; bottom: number; left: number }) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const roomBelow = vh - caret.bottom;
  const placeAbove =
    roomBelow < SLASH_MENU_MAX_HEIGHT + SLASH_MENU_MARGIN &&
    caret.top > roomBelow;
  const top = placeAbove
    ? Math.max(
        SLASH_MENU_MARGIN,
        caret.top - SLASH_MENU_MAX_HEIGHT - SLASH_MENU_MARGIN,
      )
    : caret.bottom + 6;
  const left = Math.min(
    Math.max(caret.left, SLASH_MENU_MARGIN),
    vw - SLASH_MENU_WIDTH - SLASH_MENU_MARGIN,
  );
  return { top, left };
}

export default function EditorSurface({
  content,
  onChange,
  onStats,
  placeholder,
}: EditorSurfaceProps) {
  const [slash, setSlash] = useState<SlashState>(INITIAL_SLASH);
  const slashRef = useRef(slash);
  slashRef.current = slash;

  const items = useMemo(() => filterSlashItems(slash.query), [slash.query]);

  // In-app modal prompt used by slash items (image/link) and the bubble menu's
  // link button, replacing native window.prompt. A pending callback resolves
  // the awaiting caller with the entered value (or null for cancel).
  const [promptState, setPromptState] = useState<{
    config: PromptConfig;
    onResolve: (value: string | null) => void;
  } | null>(null);

  const openPrompt = useCallback(
    (config: PromptConfig): Promise<string | null> =>
      new Promise((resolve) => {
        setPromptState({ config, onResolve: resolve });
      }),
    [],
  );

  const closePrompt = useCallback(
    (value: string | null) => {
      setPromptState((prev) => {
        prev?.onResolve(value);
        return null;
      });
    },
    [],
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        heading: { levels: [1, 2, 3] },
        link: false,
      }),
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: "plaintext",
        HTMLAttributes: { class: "tiptap-code-block" },
      }),
      Markdown.configure({ html: false, tightLists: true, linkify: true }),
      TextStyle,
      Color,
      Subscript,
      Superscript,
      Highlight.configure({ multicolor: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      CharacterCount,
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === "heading") {
            const level = (node.attrs as { level?: number }).level ?? 1;
            return level === 1 ? "Heading" : "Subheading";
          }
          return placeholder ?? "Type / for blocks, or just start writing…";
        },
        includeChildren: true,
        showOnlyCurrent: false,
      }),
      Image.configure({
        HTMLAttributes: { class: "tiptap-image" },
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "tiptap-link", rel: "noopener noreferrer nofollow" },
      }),
    ],
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      // tiptap-markdown attaches its serializer to editor.storage.markdown.
      const markdown = (editor.storage as any).markdown?.getMarkdown?.() ?? "";
      onChange(markdown);
      if (onStats) {
        const cc = editor.storage.characterCount;
        onStats({
          words: cc?.words?.() ?? 0,
          characters: cc?.characters?.() ?? 0,
        });
      }
      maybeUpdateSlash();
    },
    onSelectionUpdate: () => {
      maybeUpdateSlash();
    },
    editorProps: {
      attributes: {
        class: "tiptap-prose ProseMirror-codepad",
        spellcheck: "true",
      },
      handleKeyDown: (_view, event) => {
        const s = slashRef.current;
        if (!s.open) return false;
        if (event.key === "ArrowDown") {
          event.preventDefault();
          setSlash((prev) => ({
            ...prev,
            selectedIndex: Math.min(prev.selectedIndex + 1, items.length - 1),
          }));
          return true;
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          setSlash((prev) => ({
            ...prev,
            selectedIndex: Math.max(prev.selectedIndex - 1, 0),
          }));
          return true;
        }
        if (event.key === "Enter") {
          event.preventDefault();
          const target = items[s.selectedIndex];
          if (target) runSlashItem(target);
          return true;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          setSlash(INITIAL_SLASH);
          return true;
        }
        return false;
      },
      handleDrop: (view, event) => {
        const files = event.dataTransfer?.files;
        if (!files?.length) return false;
        const file = files[0];
        if (!file.type.startsWith("image/")) return false;
        event.preventDefault();
        const reader = new FileReader();
        reader.onload = () => {
          const url = reader.result as string;
          const { schema } = view.state;
          const node = schema.nodes.image.create({ src: url });
          const tr = view.state.tr.replaceSelectionWith(node);
          view.dispatch(tr);
        };
        reader.readAsDataURL(file);
        return true;
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of Array.from(items)) {
          if (item.kind === "file" && item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (!file) continue;
            event.preventDefault();
            const reader = new FileReader();
            reader.onload = () => {
              const url = reader.result as string;
              const { schema } = view.state;
              const node = schema.nodes.image.create({ src: url });
              const tr = view.state.tr.replaceSelectionWith(node);
              view.dispatch(tr);
            };
            reader.readAsDataURL(file);
            return true;
          }
        }
        return false;
      },
    },
  });

  // Keep editor content in sync if external `content` prop changes (e.g. when
  // loading an existing draft after mount). We avoid setting on every keystroke
  // by comparing against the editor's own markdown.
  useEffect(() => {
    if (!editor) return;
    const current = (editor.storage as any).markdown?.getMarkdown?.() ?? "";
    if (current === content) return;
    editor.commands.setContent(content, { emitUpdate: false });
  }, [content, editor]);

  // Close the slash menu when the *page* scrolls or the user clicks outside.
  // The menu itself has internal scroll — those events fire on the menu node
  // and must NOT close it. We filter by checking the scroll event's target.
  useEffect(() => {
    if (!slash.open) return;
    function isInMenu(node: EventTarget | null) {
      if (!(node instanceof Node)) return false;
      const menu = document.querySelector("[data-slash-menu='true']");
      return !!menu && menu.contains(node);
    }
    function onScroll(e: Event) {
      if (isInMenu(e.target)) return;
      setSlash(INITIAL_SLASH);
    }
    function onResize() {
      setSlash(INITIAL_SLASH);
    }
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node | null;
      if (!target) return;
      if (isInMenu(target)) return;
      // Any click outside the menu — including clicks inside the editor —
      // dismisses. If the click moves the caret to text that already starts
      // with `/`, `maybeUpdateSlash` will re-open the menu on next selection
      // update, so this is safe.
      setSlash(INITIAL_SLASH);
    }
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("resize", onResize);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      window.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", onResize);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [slash.open, editor]);

  // Slash detection: walks back from the cursor inside the current paragraph
  // to find a "/" at a word boundary. The text after it is the query.
  const maybeUpdateSlash = useCallback(() => {
    if (!editor) return;
    const { state, view } = editor;
    const { selection } = state;
    if (!selection.empty) {
      setSlash(INITIAL_SLASH);
      return;
    }
    const $from = selection.$from;
    const parent = $from.parent;
    if (parent.type.name === "codeBlock") {
      setSlash(INITIAL_SLASH);
      return;
    }
    const textBefore = parent.textBetween(0, $from.parentOffset, "\n", "\0");
    const match = /(?:^|\s)\/([\w-]*)$/.exec(textBefore);
    if (!match) {
      if (slashRef.current.open) setSlash(INITIAL_SLASH);
      return;
    }
    const triggerStart = $from.pos - match[1].length - 1;
    const coords = view.coordsAtPos(triggerStart);
    setSlash({
      open: true,
      query: match[1],
      range: { from: triggerStart, to: $from.pos },
      position: placeSlashMenu(coords),
      selectedIndex: 0,
    });
  }, [editor]);

  const runSlashItem = useCallback(
    (item: SlashItem) => {
      if (!editor) return;
      // Capture the trigger range BEFORE closing the slash menu — closing
      // clears `slashRef.current.range`, but async items (image/link) still
      // need that range to delete the "/query" text after a dialog resolves.
      const range = slashRef.current.range;
      setSlash(INITIAL_SLASH);
      const ctx: SlashRunContext = {
        range,
        requestUrl: (cfg) =>
          openPrompt({
            title: cfg.title,
            label: cfg.label,
            placeholder: cfg.placeholder,
            icon: cfg.icon,
            submitText: cfg.submitText,
            type: "url",
          }),
      };
      void item.run(editor, ctx);
    },
    [editor, openPrompt],
  );

  const promptLink = useCallback(async () => {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = await openPrompt({
      title: previous ? "Edit link" : "Insert link",
      label: "Link URL",
      placeholder: "https://…",
      initial: previous ?? "",
      submitText: previous ? "Update" : "Insert",
      type: "url",
      icon: LinkIcon,
      hint: previous ? "Clear the field and submit to remove the link." : undefined,
    });
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor, openPrompt]);

  if (!editor) {
    return (
      <div className="min-h-[400px] flex items-center justify-center text-sm text-muted">
        Loading editor…
      </div>
    );
  }

  return (
    <div className="relative">
      <BubbleMenu
        editor={editor}
        options={{ placement: "top", offset: 8 }}
        shouldShow={({ editor, from, to }) => {
          if (from === to) return false;
          if (editor.isActive("codeBlock")) return false;
          return true;
        }}
        className="z-40"
      >
        <div className="flex items-center gap-0.5 rounded-xl border border-border bg-surface/95 backdrop-blur-md shadow-2xl px-1 py-1">
          <ToolbarButton
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Bold (⌘B)"
          >
            <Bold className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italic (⌘I)"
          >
            <Italic className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("underline")}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            title="Underline (⌘U)"
          >
            <UnderlineIcon className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("strike")}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title="Strikethrough"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("code")}
            onClick={() => editor.chain().focus().toggleCode().run()}
            title="Inline code"
          >
            <Code className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("link")}
            onClick={promptLink}
            title="Link (⌘K)"
          >
            <LinkIcon className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("highlight")}
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            title="Highlight"
          >
            <Highlighter className="w-3.5 h-3.5" />
          </ToolbarButton>

          <span className="w-px h-5 bg-border mx-1" />

          <ToolbarButton
            active={editor.isActive("heading", { level: 1 })}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
            title="Heading 1"
          >
            <Heading1 className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("heading", { level: 2 })}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            title="Heading 2"
          >
            <Heading2 className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("heading", { level: 3 })}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
            title="Heading 3"
          >
            <Heading3 className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("blockquote")}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            title="Quote"
          >
            <Quote className="w-3.5 h-3.5" />
          </ToolbarButton>
        </div>
      </BubbleMenu>

      <FloatingMenu
        editor={editor}
        options={{ placement: "left-start", offset: 8 }}
        shouldShow={({ editor, state }) => {
          // NOTE: intentionally not gating on `slashRef.current.open`. React
          // state updates don't propagate into the plugin's next shouldShow
          // call until the next transaction, so using it here can leave the
          // + button stuck-hidden after the slash menu closes on scroll.
          const { selection } = state;
          if (!selection.empty) return false;
          const $from = selection.$from;
          const parent = $from.parent;
          if (parent.type.name !== "paragraph") return false;
          if (parent.content.size > 0) return false;
          if (editor.isActive("codeBlock")) return false;
          return true;
        }}
        className="z-30"
      >
        <button
          type="button"
          onClick={() => {
            // Open slash menu at the current caret without typing "/".
            if (!editor) return;
            const { state, view } = editor;
            const pos = state.selection.$from.pos;
            const coords = view.coordsAtPos(pos);
            setSlash({
              open: true,
              query: "",
              range: { from: pos, to: pos },
              position: placeSlashMenu(coords),
              selectedIndex: 0,
            });
            editor.commands.focus();
          }}
          className="w-7 h-7 rounded-full border border-border bg-surface hover:bg-elevated text-muted hover:text-fg shadow-sm flex items-center justify-center transition-colors"
          title="Add block"
        >
          <Plus className="w-4 h-4" />
        </button>
      </FloatingMenu>

      <EditorContent editor={editor} className="tiptap-editor-content" />

      {slash.open && (
        <SlashMenu
          items={items}
          selectedIndex={Math.min(slash.selectedIndex, Math.max(items.length - 1, 0))}
          position={slash.position}
          onSelect={runSlashItem}
          onHover={(idx) => setSlash((prev) => ({ ...prev, selectedIndex: idx }))}
        />
      )}

      <PromptDialog
        open={promptState !== null}
        config={promptState?.config ?? null}
        onSubmit={(value) => closePrompt(value)}
        onCancel={() => closePrompt(null)}
      />
    </div>
  );
}

interface ToolbarButtonProps {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({ active, onClick, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-lg transition-colors ${
        active
          ? "bg-accent text-bg"
          : "text-muted hover:text-fg hover:bg-bg/60"
      }`}
    >
      {children}
    </button>
  );
}

// Export the unused import so TS doesn't whine. Actually we use it for typing.
export { SLASH_ITEMS };
