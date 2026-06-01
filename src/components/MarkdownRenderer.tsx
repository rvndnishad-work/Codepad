"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import RunnableSnippet from "./RunnableSnippet";

interface MarkdownRendererProps {
  content: string;
  className?: string;
  forceRunnable?: boolean;
}

export default function MarkdownRenderer({ content, className = "", forceRunnable = false }: MarkdownRendererProps) {
  const extractText = (node: any): string => {
    if (typeof node === 'string') return node;
    if (Array.isArray(node)) return node.map(extractText).join('');
    if (node && node.props && node.props.children) {
      return extractText(node.props.children);
    }
    return '';
  };

  return (
    <article className={`prose prose-invert max-w-none 
      prose-headings:text-fg prose-headings:font-black prose-headings:tracking-tight
      prose-p:text-muted prose-a:text-accent hover:prose-a:text-accent-glow prose-a:no-underline hover:prose-a:underline
      prose-strong:text-fg prose-code:text-accent prose-code:bg-panel/50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
      ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          code({ node, inline, className, children, ...props }: any) {
            // Match both `language-javascript` and `language-javascript-run`
            // (the `-run` suffix is our runnable marker — see blog-editor/SlashMenu for why).
            const match = /language-([\w-]+)/.exec(className || "");
            const rawLang = match?.[1] ?? "";

            // Backwards-compat: legacy code blocks authored as ```javascript run
            // would carry the marker on `node.data.meta` — keep detecting it.
            const meta = (node as any)?.data?.meta || "";
            const isRunnableByMeta = meta.split(" ").includes("run");
            const isRunnableByLang = rawLang.endsWith("-run");
            const isRunnable = isRunnableByLang || isRunnableByMeta || forceRunnable;
            const language = isRunnableByLang ? rawLang.slice(0, -"-run".length) : rawLang;

            if (!inline && isRunnable && language) {
              return (
                <div className="not-prose">
                  <RunnableSnippet
                    code={extractText(children).replace(/\n$/, "")}
                    language={language}
                    autorun={forceRunnable}
                  />
                </div>
              );
            }

            return <code className={className} {...props}>{children}</code>;
          },
          img: ({ ...props }) => (
            <span className="block my-8">
              <img 
                {...props} 
                className="rounded-2xl border border-border/50 shadow-2xl mx-auto" 
                loading="lazy"
              />
              {props.alt && (
                <span className="block text-center text-sm text-muted mt-3 italic">
                  {props.alt}
                </span>
              )}
            </span>
          ),
          pre: ({ children }: any) => {
            const childrenArray = React.Children.toArray(children);
            // Check if any child is our runnable snippet or a code block that will become one
            const hasRunnable = childrenArray.some((child: any) => {
              const className = child?.props?.className || "";
              const hasNotProse = className.includes("not-prose");
              const isRunnableCode = className.includes("-run");
              const innerHasNotProse = child?.props?.children?.props?.className?.includes("not-prose");
              return hasNotProse || isRunnableCode || innerHasNotProse;
            });

            if (hasRunnable) {
              return <>{children}</>;
            }

            return (
              <pre className="relative overflow-hidden group border border-border/50 bg-panel/50 rounded-xl my-8">
                {children}
              </pre>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}
