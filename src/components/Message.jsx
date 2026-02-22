import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function TypingIndicator() {
    return (
        <div className="message-row assistant">
            <div className="msg-avatar ai-av">🤖</div>
            <div className="msg-content">
                <div className="typing-indicator" aria-label="AI is typing">
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                </div>
            </div>
        </div>
    );
}

function CopyBtn({ text }) {
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button className="msg-copy-btn" onClick={copy} title="Copy message">
            {copied ? <Check size={11} /> : <Copy size={11} />}
            {copied ? 'Copied' : 'Copy'}
        </button>
    );
}

function formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function Message({ role, content, timestamp }) {
    const isUser = role === 'user';

    return (
        <div className={`message-row ${isUser ? 'user' : 'assistant'}`}>
            {!isUser && <div className="msg-avatar ai-av">🤖</div>}
            <div className="msg-content">
                <div className={`bubble ${isUser ? 'user' : 'assistant'}`}>
                    {isUser ? (
                        <span style={{ whiteSpace: 'pre-wrap' }}>{content}</span>
                    ) : (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {content}
                        </ReactMarkdown>
                    )}
                </div>
                <div className="msg-meta" style={{ justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
                    <span className="msg-time">{formatTime(timestamp)}</span>
                    {!isUser && <CopyBtn text={content} />}
                </div>
            </div>
            {isUser && <div className="msg-avatar user-av">👤</div>}
        </div>
    );
}
