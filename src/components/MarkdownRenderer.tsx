"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import RunnableSnippet from "./RunnableSnippet";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  return (
    <article className={`prose prose-invert prose-pre:bg-panel/50 prose-pre:border prose-pre:border-border/50 prose-pre:rounded-xl max-w-none 
      prose-headings:text-fg prose-headings:font-black prose-headings:tracking-tight
      prose-p:text-muted prose-a:text-accent hover:prose-a:text-accent-glow prose-a:no-underline hover:prose-a:underline
      prose-strong:text-fg prose-code:text-accent prose-code:bg-panel/50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
      ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || "");
            // Detect 'run' in the meta string (e.g., ```javascript run)
            const meta = (node as any)?.data?.meta || "";
            const isRunnable = meta.split(" ").includes("run");

            if (!inline && isRunnable && match) {
              return (
                <div className="not-prose">
                  <RunnableSnippet 
                    code={String(children).replace(/\n$/, "")} 
                    language={match[1]} 
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
          pre: ({ children }) => (
            <pre className="relative overflow-hidden group">
              {children}
            </pre>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}
