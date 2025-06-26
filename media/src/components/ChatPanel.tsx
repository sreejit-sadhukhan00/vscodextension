import { useState, useRef, useEffect } from 'react';
import Message from './Message.tsx';
import { useVsCodeApi } from '../hooks/useVsCodeApi';
import { completeFilePath } from '../utils/fileCompletion';

interface MessageItem {
  role: 'user' | 'assistant';
  content: string;
}

const ChatPanel = () => {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileCompletion, setFileCompletion] = useState<{
    active: boolean;
    prefix: string;
    suggestions: string[];
  }>({ active: false, prefix: '', suggestions: [] });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const vscode = useVsCodeApi();

  useEffect(() => {
    // Scroll to bottom whenever messages change
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    // Listen for messages from extension
    const messageHandler = (event: MessageEvent) => {
      const message = event.data;
      switch (message.type) {
        case 'fileList':
          setFileCompletion(prev => ({
            ...prev,
            suggestions: message.payload
          }));
          break;
        case 'response':
          setMessages(prev => [...prev, { role: 'assistant', content: message.payload }]);
          setIsProcessing(false);
          break;
      }
    };

    window.addEventListener('message', messageHandler);
    return () => window.removeEventListener('message', messageHandler);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);

    // Check if there's a file completion request (@)
    const match = value.match(/@([^\\s]*)$/);
    if (match) {
      const prefix = match[1];
      setFileCompletion({
        active: true,
        prefix,
        suggestions: []
      });

      // Request file list from extension
      vscode.postMessage({
        command: 'requestFileList',
        prefix
      });
    } else if (fileCompletion.active) {
      setFileCompletion({
        active: false,
        prefix: '',
        suggestions: []
      });
    }
  };

  const handleSendMessage = () => {
    if (!input.trim() || isProcessing) return;

    const userMessage = input;
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setIsProcessing(true);

    // Send the message to the extension
    vscode.postMessage({
      command: 'generateCode',
      prompt: userMessage
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    const newInput = completeFilePath(input, fileCompletion.prefix, suggestion);
    setInput(newInput);
    setFileCompletion({
      active: false,
      prefix: '',
      suggestions: []
    });
    inputRef.current?.focus();
  };

  return (
    <div className="chat-panel">
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-state">
            <h2>Coding Junior AI Chat</h2>
            <p>Ask questions about your code, request new features, or get help debugging.</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <Message key={idx} role={msg.role} content={msg.content} />
          ))
        )}
        {isProcessing && <Message role="assistant" content="Thinking..." isLoading={true} />}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-container">
        {fileCompletion.active && fileCompletion.suggestions.length > 0 && (
          <div className="file-suggestions">
            {fileCompletion.suggestions.map((suggestion, idx) => (
              <div 
                key={idx} 
                className="suggestion" 
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion}
              </div>
            ))}
          </div>
        )}
        <textarea
          ref={inputRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question or request help..."
          disabled={isProcessing}
          rows={3}
        />
        <button 
          onClick={handleSendMessage}
          disabled={!input.trim() || isProcessing}
        >
          {isProcessing ? "Processing..." : "Send"}
        </button>
      </div>
    </div>
  );
};

export default ChatPanel;
