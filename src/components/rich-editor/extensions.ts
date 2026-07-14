/**
 * Shared Tiptap extension list — the single source of truth for the rich
 * content schema. Used by BOTH the studio editor (RichEditor) and the public
 * server-side renderer (RichContent), so a document always round-trips.
 */
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Node, mergeAttributes, type AnyExtension } from "@tiptap/core";

/**
 * An embedded reference to the creator's own playground or challenge, stored
 * as an atomic block node. Serializes to an anchor card (`.iq-embed-card`) so
 * the same renderHTML powers the editor preview and the public page.
 */
export const ContentEmbed = Node.create({
  name: "contentEmbed",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      kind: {
        default: "snippet",
        parseHTML: (el: HTMLElement) => el.getAttribute("data-kind") || "snippet",
        renderHTML: (attrs: Record<string, string>) => ({ "data-kind": attrs.kind }),
      },
      refId: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute("data-ref-id"),
        renderHTML: (attrs: Record<string, string>) => ({ "data-ref-id": attrs.refId }),
      },
      slug: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute("data-slug"),
        renderHTML: (attrs: Record<string, string>) => ({ "data-slug": attrs.slug }),
      },
      title: {
        default: "",
        parseHTML: (el: HTMLElement) => el.getAttribute("data-title") || "",
        renderHTML: (attrs: Record<string, string>) => ({ "data-title": attrs.title }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "a[data-content-embed]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const kind = node.attrs.kind as string;
    const href = kind === "challenge" ? `/challenges/${node.attrs.slug}` : `/play/${node.attrs.slug}`;
    const label = kind === "challenge" ? "Challenge" : "Playground";
    return [
      "a",
      mergeAttributes(HTMLAttributes, {
        "data-content-embed": "",
        href,
        class: "iq-embed-card",
        contenteditable: "false",
      }),
      ["span", { class: "iq-embed-kind" }, label],
      ["span", { class: "iq-embed-title" }, String(node.attrs.title || node.attrs.slug || "")],
      ["span", { class: "iq-embed-cta" }, kind === "challenge" ? "Solve it →" : "Run it →"],
    ];
  },
});

/** Extensions shared by editor and renderer. Editor adds Placeholder itself. */
export function baseExtensions(): AnyExtension[] {
  return [
    StarterKit.configure({
      link: { openOnClick: false, autolink: true },
    }),
    Image.configure({ allowBase64: true }),
    ContentEmbed,
  ];
}
