import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
export default function MarkdownCard(props: any) {
  const { message } = props;
  // 这里的message可能不再是字符串了 可能是数组,需要获取成图片
  function findImage(conent) {
    let url = "";
    conent.forEach((item) => {
      if (item.type == "image_url") {
        url = item.image_url;
      }
    });
    return url;
  }
  function findText(conent) {
    let text = "";
    conent.forEach((item) => {
      if (item.type == "text") {
        text = item.text;
      }
    });
    return text;
  }
  return (
    <div className="message-bubble">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // 👇 👇 加这个 img 配置！图片就变小了
          img({ src, alt }) {
            return (
              <img
                src={src}
                alt={alt}
                style={{
                  height: "300px", // 高度自适应
                  borderRadius: "8px", // 圆角好看
                  margin: "10px 0", // 留一点间距
                }}
              />
            );
          },
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
        {typeof message.content == "string"
          ? message.content
          : findText(message.content)}
      </ReactMarkdown>
      {typeof message.content != "string" && (
        <img src={findImage(message.content)} alt="" width={"200px"} />
      )}
    </div>
  );
}
