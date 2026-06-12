"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, X, Link2 } from "lucide-react";

const MAX_BYTES = 8 * 1024 * 1024; // matches coverImageSchema cap

export default function ImageDropField({
  label,
  hint,
  value,
  onChange,
  variant = "banner",
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (next: string) => void;
  variant?: "banner" | "avatar";
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [showUrl, setShowUrl] = useState(false);

  function pickFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Pick an image file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Image too large (max 8MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => toast.error("Couldn't read that image.");
    reader.readAsDataURL(file);
  }

  const frame =
    variant === "avatar"
      ? "w-20 h-20 rounded-2xl"
      : "w-full aspect-[3/1] rounded-xl";

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">{label}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowUrl((v) => !v)}
            className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted hover:text-fg transition-colors"
          >
            <Link2 className="w-3 h-3" /> URL
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted hover:text-rose-500 transition-colors"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className={`group relative ${frame} overflow-hidden border border-dashed border-border bg-bg/50 hover:border-accent/50 transition-colors grid place-items-center`}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt={label} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted group-hover:text-accent transition-colors">
            <ImagePlus className={variant === "avatar" ? "w-5 h-5" : "w-6 h-6"} />
            {variant === "banner" && <span className="text-[11px] font-semibold">Upload image</span>}
          </div>
        )}
      </button>
      {hint && <p className="text-[10px] text-muted/70 mt-1.5">{hint}</p>}

      {showUrl && (
        <input
          type="url"
          value={value.startsWith("data:") ? "" : value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={value.startsWith("data:") ? "Uploaded image set" : "https://…"}
          className="mt-2 w-full px-3 py-2 rounded-lg border border-border bg-bg text-fg text-xs focus:outline-none focus:border-accent/50"
        />
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) pickFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
