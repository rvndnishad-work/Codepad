"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Image } from "@tiptap/extension-image";
import { Link } from "@tiptap/extension-link";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { FontFamily } from "@tiptap/extension-font-family";
import { TextAlign } from "@tiptap/extension-text-align";
import { Highlight } from "@tiptap/extension-highlight";
import { Underline } from "@tiptap/extension-underline";

import { 
  Bold, Italic, List, Quote, Code, 
  Heading1, Heading2, Type, Underline as UnderlineIcon,
  AlignCenter, AlignLeft, AlignRight, AlignJustify,
  Highlighter, Palette, MonitorPlay, Link as LinkIcon,
  Eraser, ListOrdered, Undo, Redo
} from "lucide-react";

interface TiptapEditorProps {
  content: string;
  onChange: (markdown: string) => void;
}

const COLORS = [
  { name: "Default", color: "inherit" },
  { name: "Accent", color: "#FACC15" },
  { name: "Red", color: "#EF4444" },
  { name: "Blue", color: "#3B82F6" },
  { name: "Green", color: "#10B981" },
  { name: "Purple", color: "#A855F7" },
];

export default function TiptapEditor({ content, onChange }: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: {
          HTMLAttributes: {
            class: 'rounded-xl bg-panel border border-border p-4 font-mono text-sm my-4',
          },
        },
      }),
      Markdown,
      TextStyle,
      Color,
      FontFamily,
      Underline,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder: "Write something brilliant...",
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-2xl border border-border shadow-2xl my-8 mx-auto',
        },
      }),
      Link.configure({
        openOnClick: false,
      }),
    ],
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      // @ts-ignore
      const markdown = editor.storage.markdown.getMarkdown();
      onChange(markdown);
    },
    editorProps: {
      attributes: {
        class: "prose prose-banana dark:prose-invert max-w-none focus:outline-none min-h-[500px] px-8 py-12",
      },
    },
  });

  if (!editor) return null;

  return (
    <div className="flex flex-col w-full bg-bg min-h-full border border-border rounded-3xl overflow-hidden shadow-2xl">
      {/* Fixed Pro Toolbar */}
      <div className="sticky top-0 z-20 flex flex-wrap items-center gap-1 p-2 bg-panel/95 backdrop-blur-xl border-b border-border">
        {/* History */}
        <div className="flex items-center gap-0.5 pr-1 border-r border-border">
          <button onClick={() => editor.chain().focus().undo().run()} className="p-2 rounded-lg text-muted hover:text-fg hover:bg-bg"><Undo className="w-4 h-4" /></button>
          <button onClick={() => editor.chain().focus().redo().run()} className="p-2 rounded-lg text-muted hover:text-fg hover:bg-bg"><Redo className="w-4 h-4" /></button>
        </div>

        {/* Basic Formatting */}
        <div className="flex items-center gap-0.5 px-1 border-r border-border">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-2 rounded-lg transition-all ${editor.isActive("bold") ? "bg-accent text-bg" : "text-muted hover:text-fg hover:bg-bg"}`}
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-2 rounded-lg transition-all ${editor.isActive("italic") ? "bg-accent text-bg" : "text-muted hover:text-fg hover:bg-bg"}`}
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-2 rounded-lg transition-all ${editor.isActive("underline") ? "bg-accent text-bg" : "text-muted hover:text-fg hover:bg-bg"}`}
          >
            <UnderlineIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Heading Controls */}
        <div className="flex items-center gap-0.5 px-1 border-r border-border">
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`p-2 rounded-lg transition-all ${editor.isActive("heading", { level: 1 }) ? "bg-accent text-bg" : "text-muted hover:text-fg hover:bg-bg"}`}
          >
            <Heading1 className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-2 rounded-lg transition-all ${editor.isActive("heading", { level: 2 }) ? "bg-accent text-bg" : "text-muted hover:text-fg hover:bg-bg"}`}
          >
            <Heading2 className="w-4 h-4" />
          </button>
        </div>

        {/* Alignment */}
        <div className="flex items-center gap-0.5 px-1 border-r border-border">
          <button onClick={() => editor.chain().focus().setTextAlign('left').run()} className={`p-2 rounded-lg ${editor.isActive({ textAlign: 'left' }) ? "bg-accent text-bg" : "text-muted hover:text-fg hover:bg-bg"}`}><AlignLeft className="w-4 h-4" /></button>
          <button onClick={() => editor.chain().focus().setTextAlign('center').run()} className={`p-2 rounded-lg ${editor.isActive({ textAlign: 'center' }) ? "bg-accent text-bg" : "text-muted hover:text-fg hover:bg-bg"}`}><AlignCenter className="w-4 h-4" /></button>
          <button onClick={() => editor.chain().focus().setTextAlign('right').run()} className={`p-2 rounded-lg ${editor.isActive({ textAlign: 'right' }) ? "bg-accent text-bg" : "text-muted hover:text-fg hover:bg-bg"}`}><AlignRight className="w-4 h-4" /></button>
        </div>

        {/* Color & Highlight */}
        <div className="flex items-center gap-0.5 px-1 border-r border-border group/color relative">
          <button className="p-2 rounded-lg text-muted hover:text-fg hover:bg-bg flex items-center gap-1">
             <Palette className="w-4 h-4" />
          </button>
          <div className="absolute top-full left-0 mt-1 p-2 bg-surface border border-border rounded-xl shadow-2xl hidden group-hover/color:flex gap-1">
             {COLORS.map(c => (
               <button 
                 key={c.name}
                 onClick={() => editor.chain().focus().setColor(c.color).run()}
                 className="w-6 h-6 rounded-md border border-border" 
                 style={{ backgroundColor: c.color === 'inherit' ? 'transparent' : c.color }}
               />
             ))}
          </div>
          <button
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            className={`p-2 rounded-lg transition-all ${editor.isActive("highlight") ? "bg-accent text-bg" : "text-muted hover:text-fg hover:bg-bg"}`}
          >
            <Highlighter className="w-4 h-4" />
          </button>
        </div>

        {/* Interactive Features */}
        <div className="flex items-center gap-1 pl-2 ml-auto">
          <button
            onClick={() => {
              // NOTE: We use a single-token language id (`javascript-run`) rather than
              // a code-fence meta (` ```javascript run `). tiptap-markdown only keeps
              // the first whitespace-separated token of the info string, so a meta
              // flag like "run" gets stripped on save. The `-run` suffix survives the
              // round-trip and is recognised by MarkdownRenderer.
              const runnableBlock = "\n\n```javascript-run\n// Your interactive code here\nconsole.log('Hello from Codepad!');\n```\n\n";
              editor.chain().focus().insertContent(runnableBlock).run();
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent/10 text-accent hover:bg-accent hover:text-bg transition-all text-[10px] font-black uppercase tracking-widest border border-accent/20"
          >
            <MonitorPlay className="w-3.5 h-3.5" />
            Add Playground
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
         <div className="max-w-4xl mx-auto min-h-full bg-bg">
            <EditorContent editor={editor} />
         </div>
      </div>
      
      {/* Visual Indicator */}
      <div className="p-4 border-t border-border flex items-center justify-between bg-panel/30">
        <div className="flex items-center gap-2">
          <Type className="w-3 h-3 text-muted" />
          <span className="text-[10px] font-black uppercase tracking-widest text-muted">Visual Editor Active</span>
        </div>
        <div className="text-[10px] font-bold text-muted/40 uppercase tracking-widest">
           {editor.storage.characterCount?.characters?.() ?? 0} characters
        </div>
      </div>
    </div>
  );
}
