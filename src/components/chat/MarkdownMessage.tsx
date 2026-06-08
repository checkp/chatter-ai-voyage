import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  content: string;
  className?: string;
}

const MarkdownMessage: React.FC<Props> = ({ content, className = '' }) => {
  return (
    <div className={`markdown-body text-card-foreground leading-relaxed ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node, ...props }) => <h1 className="text-xl font-bold mt-3 mb-2" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-lg font-bold mt-3 mb-2" {...props} />,
          h3: ({ node, ...props }) => <h3 className="text-base font-semibold mt-2 mb-1" {...props} />,
          h4: ({ node, ...props }) => <h4 className="text-sm font-semibold mt-2 mb-1" {...props} />,
          p: ({ node, ...props }) => <p className="my-2 whitespace-pre-wrap" {...props} />,
          ul: ({ node, ...props }) => <ul className="list-disc pl-6 my-2 space-y-1" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal pl-6 my-2 space-y-1" {...props} />,
          li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-4 border-primary/40 pl-3 italic text-muted-foreground my-2" {...props} />
          ),
          a: ({ node, ...props }) => (
            <a className="text-primary underline underline-offset-2 hover:opacity-80" target="_blank" rel="noreferrer" {...props} />
          ),
          strong: ({ node, ...props }) => <strong className="font-semibold text-foreground" {...props} />,
          em: ({ node, ...props }) => <em className="italic" {...props} />,
          hr: () => <hr className="my-3 border-border" />,
          code: ({ node, inline, className: cn, children, ...props }: any) =>
            inline ? (
              <code className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono text-[0.85em]" {...props}>
                {children}
              </code>
            ) : (
              <code className={`block ${cn || ''}`} {...props}>
                {children}
              </code>
            ),
          pre: ({ node, ...props }) => (
            <pre className="bg-muted rounded-md p-3 my-2 overflow-x-auto text-xs font-mono" {...props} />
          ),
          table: ({ node, ...props }) => (
            <div className="my-3 overflow-x-auto">
              <table className="w-full border-collapse text-sm" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => <thead className="bg-muted/60" {...props} />,
          tbody: ({ node, ...props }) => <tbody {...props} />,
          tr: ({ node, ...props }) => <tr className="border-b border-border even:bg-muted/20" {...props} />,
          th: ({ node, ...props }) => <th className="border border-border px-3 py-1.5 text-left font-semibold" {...props} />,
          td: ({ node, ...props }) => <td className="border border-border px-3 py-1.5 align-top" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownMessage;
