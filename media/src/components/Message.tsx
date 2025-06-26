import ReactMarkdown from 'react-markdown';
import { Highlight, themes } from 'prism-react-renderer';

interface MessageProps {
  role: 'user' | 'assistant';
  content: string;
  isLoading?: boolean;
}

const Message = ({ role, content, isLoading = false }: MessageProps) => {
  return (
    <div className={`message ${role}`}>
      <div className="avatar">
        {role === 'user' ? '👤' : '🤖'}
      </div>
      <div className="content">
        {isLoading ? (
          <div className="loading-indicator">
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
          </div>
        ) : (
          <ReactMarkdown
            components={{
              code({ className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                const language = match ? match[1] : '';
                const code = String(children).replace(/\n$/, '');
                
                return match ? (
                  <Highlight theme={themes.nightOwl} code={code} language={language}>
                    {({ className, style, tokens, getLineProps, getTokenProps }) => (
                      <pre className={className} style={{ ...style, margin: '1em 0', padding: '1em', borderRadius: '4px', overflow: 'auto' }}>
                        {tokens.map((line, i) => (
                          <div key={i} {...getLineProps({ line })}>
                            <span className="line-number">{i + 1}</span>
                            {line.map((token, key) => (
                              <span key={key} {...getTokenProps({ token })} />
                            ))}
                          </div>
                        ))}
                      </pre>
                    )}
                  </Highlight>
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              }
            }}
          >
            {content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
};

export default Message;
