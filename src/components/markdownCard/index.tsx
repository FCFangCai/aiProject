import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
export default function MarkdownCard(props: any) {
  const {message} = props;
  return (
    <div className="message-bubble">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const isBlock = Boolean(match);
            return isBlock ? (
              <SyntaxHighlighter
                style={oneDark}
                language={match?.[1]}
                PreTag="div"
                customStyle={{ margin: 0, borderRadius: 8 }}
              >
                {String(children).replace(/\n$/, "")}
              </SyntaxHighlighter>
            ) : (
              <code className="inline-code" {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {message.content}
      </ReactMarkdown>
    </div>
  );
}
