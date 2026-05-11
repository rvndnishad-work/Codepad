"use client";

import ReactMarkdown from "react-markdown";

/**
 * Styled markdown renderer for challenge descriptions.
 * Kept as a client component so we can lean on react-markdown without
 * needing to wire up a server-only renderer.
 */
export default function ChallengeDescription({ markdown }: { markdown: string }) {
  return (
    <div className="challenge-md text-fg">
      <ReactMarkdown
        components={{
          h1: (props) => (
            <h1 className="text-2xl font-black tracking-tight mb-4 mt-2" {...props} />
          ),
          h2: (props) => (
            <h2 className="text-xl font-bold tracking-tight mb-3 mt-6" {...props} />
          ),
          h3: (props) => (
            <h3 className="text-base font-bold tracking-tight mb-2 mt-5" {...props} />
          ),
          p: (props) => <p className="text-sm leading-relaxed mb-3 text-fg/90" {...props} />,
          ul: (props) => <ul className="list-disc pl-6 mb-3 text-sm space-y-1" {...props} />,
          ol: (props) => <ol className="list-decimal pl-6 mb-3 text-sm space-y-1" {...props} />,
          li: (props) => <li className="text-fg/90 leading-relaxed" {...props} />,
          strong: (props) => <strong className="font-bold text-fg" {...props} />,
          em: (props) => <em className="italic text-fg/85" {...props} />,
          a: (props) => (
            <a
              className="text-accent underline underline-offset-2 hover:text-accent-soft"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
          code: ({ className, children, ...props }) => {
            const isInline = !className?.includes("language-");
            if (isInline) {
              return (
                <code
                  className="px-1.5 py-0.5 rounded bg-elevated border border-border text-[0.9em] font-mono text-accent"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code
                className={`block ${className ?? ""} text-[13px] leading-relaxed`}
                {...props}
              >
                {children}
              </code>
            );
          },
          pre: (props) => (
            <pre
              className="bg-panel border border-border rounded-lg p-4 overflow-x-auto mb-4 font-mono text-fg/90"
              {...props}
            />
          ),
          blockquote: (props) => (
            <blockquote
              className="border-l-2 border-accent/40 bg-accent/5 pl-4 py-2 my-3 text-fg/80 italic"
              {...props}
            />
          ),
          hr: () => <hr className="border-border my-6" />,
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
