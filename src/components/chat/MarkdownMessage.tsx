import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';

interface Props {
  content: string;
  className?: string;
  fun?: boolean;
}

// Allow safe inline HTML so AI replies can use richer formatting
// (mark, kbd, details/summary, span/div with limited style, etc.).
const schema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames || []),
    'mark', 'kbd', 'sub', 'sup', 'details', 'summary', 'span', 'div', 'small', 'big', 'u', 'abbr',
  ],
  attributes: {
    ...defaultSchema.attributes,
    span: [...((defaultSchema.attributes as any)?.span || []), ['style', /^(color|background|background-color|font-style|font-weight|text-decoration|font-family|letter-spacing|text-transform|padding|border-radius|border|opacity):[^;]+;?\s*$/i]],
    div: [...((defaultSchema.attributes as any)?.div || []), ['style', /^(color|background|background-color|padding|border|border-radius|text-align|opacity):[^;]+;?\s*$/i]],
    '*': [...((defaultSchema.attributes as any)?.['*'] || []), 'className', 'id'],
  },
};

const MarkdownMessage: React.FC<Props> = ({ content, className = '', fun = false }) => {
  return (
    <div className={`markdown-body ${fun ? 'fun-md' : ''} ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, schema]]}
        components={{
          table: ({ node, ...props }) => (
            <div className="md-table-wrap">
              <table {...props} />
            </div>
          ),
          a: ({ node, ...props }) => <a target="_blank" rel="noreferrer" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownMessage;
