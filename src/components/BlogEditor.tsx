"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import MarkdownRenderer from "./MarkdownRenderer";
import TiptapEditor from "./TiptapEditor";
import { useTheme } from "next-themes";
import { Save, Eye, Edit3, Image as ImageIcon, Layout, Type, Terminal } from "lucide-react";
import { toast } from "sonner";

const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface BlogEditorProps {
  initialData?: {
    id?: string;
    title: string;
    content: string;
    excerpt: string;
    coverImage: string;
    published: boolean;
  };
  onSave: (data: any) => Promise<void>;
}

export default function BlogEditor({ initialData, onSave }: BlogEditorProps) {
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [content, setContent] = useState(initialData?.content ?? "");
  const [excerpt, setExcerpt] = useState(initialData?.excerpt ?? "");
  const [coverImage, setCoverImage] = useState(initialData?.coverImage ?? "");
  const [published, setPublished] = useState(initialData?.published ?? false);
  const [view, setView] = useState<"edit" | "preview" | "split">("split");
  const [mode, setMode] = useState<"visual" | "code">("visual");
  const [isSaving, setIsSaving] = useState(false);

  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setIsSaving(true);
    try {
      await onSave({ title, content, excerpt, coverImage, published });
      toast.success("Blog post saved!");
    } catch (error) {
      toast.error("Failed to save blog post");
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] min-h-[600px] border border-border rounded-3xl bg-surface overflow-hidden shadow-2xl">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-panel/30">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-bg border border-border rounded-xl p-1">
            <button
              onClick={() => setView("edit")}
              className={`p-2 rounded-lg transition-all ${view === "edit" ? "bg-accent text-bg" : "text-muted hover:text-fg"}`}
              title="Edit Mode"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView("split")}
              className={`p-2 rounded-lg transition-all ${view === "split" ? "bg-accent text-bg" : "text-muted hover:text-fg"}`}
              title="Split View"
            >
              <Layout className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView("preview")}
              className={`p-2 rounded-lg transition-all ${view === "preview" ? "bg-accent text-bg" : "text-muted hover:text-fg"}`}
              title="Preview Mode"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>

          <div className="h-6 w-[1px] bg-border mx-2" />

          <div className="flex items-center gap-1 bg-bg border border-border rounded-xl p-1">
            <button
              onClick={() => setMode("visual")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${mode === "visual" ? "bg-fg text-bg" : "text-muted hover:text-fg"}`}
            >
              <Type className="w-3.5 h-3.5" />
              Visual
            </button>
            <button
              onClick={() => setMode("code")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${mode === "code" ? "bg-fg text-bg" : "text-muted hover:text-fg"}`}
            >
              <Terminal className="w-3.5 h-3.5" />
              Code
            </button>
          </div>
          
          <div className="h-6 w-[1px] bg-border mx-2" />
          
          <label className="flex items-center gap-2 cursor-pointer group">
            <div className={`w-10 h-5 rounded-full p-1 transition-colors ${published ? "bg-accent" : "bg-panel border border-border"}`}>
              <div className={`w-3 h-3 rounded-full transition-transform ${published ? "translate-x-5 bg-bg" : "translate-x-0 bg-muted"}`} />
            </div>
            <input 
              type="checkbox" 
              className="hidden" 
              checked={published} 
              onChange={(e) => setPublished(e.target.checked)} 
            />
            <span className="text-xs font-bold text-muted group-hover:text-fg transition-colors">
              {published ? "Published" : "Draft"}
            </span>
          </label>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-accent text-bg font-bold hover:scale-105 active:scale-95 transition-all shadow-lg disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save Changes"}
          <Save className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Editor Side */}
        {((view === "edit" || view === "split") && mode === "code") && (
          <div className={`flex flex-col flex-1 border-r border-border h-full overflow-hidden ${view === "split" ? "w-1/2" : "w-full"}`}>
            <div className="p-6 space-y-4 bg-bg/50 overflow-y-auto max-h-[300px]">
              <input
                type="text"
                placeholder="Blog Title..."
                className="w-full bg-transparent text-3xl font-black text-fg placeholder:text-muted/30 outline-none border-none p-0"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted">Cover Image URL</label>
                  <div className="flex items-center gap-3 bg-bg border border-border rounded-xl px-4 py-2 focus-within:border-accent transition-colors">
                    <ImageIcon className="w-4 h-4 text-muted" />
                    <input
                      type="text"
                      placeholder="https://images.unsplash.com/..."
                      className="flex-1 bg-transparent text-sm text-fg outline-none"
                      value={coverImage}
                      onChange={(e) => setCoverImage(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted">Excerpt (Summary)</label>
                  <div className="flex items-center gap-3 bg-bg border border-border rounded-xl px-4 py-2 focus-within:border-accent transition-colors">
                    <Edit3 className="w-4 h-4 text-muted" />
                    <input
                      type="text"
                      placeholder="Brief summary..."
                      className="flex-1 bg-transparent text-sm text-fg outline-none"
                      value={excerpt}
                      onChange={(e) => setExcerpt(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 min-h-0 border-t border-border">
              <Editor
                height="100%"
                theme={isDark ? "vs-dark" : "light"}
                language="markdown"
                value={content}
                onChange={(v) => setContent(v ?? "")}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  fontFamily: "'JetBrains Mono', monospace",
                  wordWrap: "on",
                  padding: { top: 20, bottom: 20 },
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  glyphMargin: false,
                  folding: true,
                  lineDecorationsWidth: 10,
                  lineNumbersMinChars: 2,
                }}
              />
            </div>
          </div>
        )}

        {/* Visual Editor Mode */}
        {mode === "visual" && (
          <div className="flex flex-col flex-1 h-full overflow-hidden bg-bg">
            <div className="p-8 pb-4 max-w-4xl mx-auto w-full">
              <input
                type="text"
                placeholder="Enter Title..."
                className="w-full bg-transparent text-4xl md:text-6xl font-black text-fg placeholder:text-muted/10 outline-none border-none p-0 mb-8"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                 <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted/40 px-1">Cover Image</span>
                    <input
                      type="text"
                      placeholder="Image URL..."
                      className="w-full bg-panel border border-border rounded-2xl px-5 py-3 text-sm focus:border-accent outline-none transition-all"
                      value={coverImage}
                      onChange={(e) => setCoverImage(e.target.value)}
                    />
                 </div>
                 <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted/40 px-1">Excerpt</span>
                    <input
                      type="text"
                      placeholder="Short summary..."
                      className="w-full bg-panel border border-border rounded-2xl px-5 py-3 text-sm focus:border-accent outline-none transition-all"
                      value={excerpt}
                      onChange={(e) => setExcerpt(e.target.value)}
                    />
                 </div>
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
               <div className="max-w-5xl mx-auto h-full px-4">
                  <TiptapEditor content={content} onChange={setContent} />
               </div>
            </div>
          </div>
        )}

        {/* Preview Side (Only in Code Mode) */}
        {(view === "preview" || (view === "split" && mode === "code")) && mode === "code" && (
          <div className={`flex-1 h-full overflow-y-auto bg-bg p-8 md:p-12 ${view === "split" ? "w-1/2" : "w-full"}`}>
            <div className="max-w-3xl mx-auto">
              {coverImage && (
                <div className="relative aspect-video w-full mb-12 rounded-3xl overflow-hidden border border-border shadow-2xl group">
                  <img 
                    src={coverImage} 
                    alt="" 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-bg/20 to-transparent" />
                </div>
              )}
              <h1 className="text-4xl md:text-5xl font-black text-fg mb-8 tracking-tight leading-tight">
                {title || "Untitled Masterpiece"}
              </h1>
              <MarkdownRenderer content={content || "_No content yet... Start typing in the editor._"} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
