import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Settings, Trash2, Plus, Send, Square,
  MessageSquare, RotateCcw, Zap, Bot
} from 'lucide-react';
import { useAzureOpenAI } from './hooks/useAzureOpenAI';
import { Message, TypingIndicator } from './components/Message';
import SettingsModal from './components/SettingsModal';
import { useToast, ToastContainer } from './components/Toast';

// ─── localStorage helpers ────────────────────────────────────────────────────
const STORAGE_KEY = 'supportai_config';
const loadConfig = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) { }
  return null;
};
const saveConfig = (cfg) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)); } catch (_) { }
};

const DEFAULT_CONFIG = {
  apiKey: '',
  endpoint: 'https://sudhanshugusain45-9835-resource.cognitiveservices.azure.com/',
  deployment: 'gpt-4o-2024-08-06-project-demo',
  systemPrompt: 'You are a professional and friendly customer support assistant. Provide clear, concise, and helpful responses. If you are unsure about something, be honest and offer to escalate the issue.',
  temperature: '1.0',
  botName: 'SupportAI',
};

// ─── Suggestion chips ─────────────────────────────────────────────────────────
const SUGGESTIONS = [
  '👋 How can I get started?',
  '📦 Where is my order?',
  '💳 What payment methods are accepted?',
  '🔧 I need help troubleshooting an issue',
  '🔄 How do I request a refund?',
  '📞 How do I contact a human agent?',
];

// ─── Conversation factory ─────────────────────────────────────────────────────
let convCounter = 1;
const newConv = () => ({
  id: Date.now(),
  title: `Conversation ${convCounter++}`,
  messages: [],
  createdAt: new Date(),
});

export default function App() {
  const saved = loadConfig();
  const [config, setConfig] = useState(saved || DEFAULT_CONFIG);
  const [showSettings, setShowSettings] = useState(!saved?.apiKey);

  const [conversations, setConversations] = useState([newConv()]);
  const [activeId, setActiveId] = useState(conversations[0].id);

  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [pendingResponse, setPendingResponse] = useState(false);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const { toasts, addToast } = useToast();
  const { sendMessage, stop } = useAzureOpenAI(config);

  // ── active conversation ────────────────────────────────────────────────────
  const activeConv = conversations.find(c => c.id === activeId);
  const messages = activeConv?.messages ?? [];

  const updateConv = useCallback((id, updater) => {
    setConversations(cs => cs.map(c => c.id === id ? updater(c) : c));
  }, []);

  // ── auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pendingResponse]);

  // ── textarea auto-resize ───────────────────────────────────────────────────
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
  }, [input]);

  // ── send ───────────────────────────────────────────────────────────────────
  const handleSend = useCallback(async (text) => {
    const content = (text || input).trim();
    if (!content || streaming) return;

    if (!config.apiKey) {
      setShowSettings(true);
      addToast('Please configure your API settings first.', 'error');
      return;
    }

    const userMsg = { role: 'user', content, timestamp: new Date() };
    let convId = activeId;

    // Title first conv with first message
    updateConv(convId, c => ({
      ...c,
      title: c.messages.length === 0 ? content.slice(0, 40) + (content.length > 40 ? '…' : '') : c.title,
      messages: [...c.messages, userMsg],
    }));

    setInput('');
    setStreaming(true);
    setPendingResponse(true);

    // Build messages array for API
    const history = [...messages, userMsg];
    const apiMessages = [
      { role: 'system', content: config.systemPrompt || DEFAULT_CONFIG.systemPrompt },
      ...history.map(m => ({ role: m.role, content: m.content })),
    ];

    // Placeholder for streaming assistant message
    const assistantMsgId = Date.now() + 1;
    updateConv(convId, c => ({
      ...c,
      messages: [...c.messages, userMsg, { id: assistantMsgId, role: 'assistant', content: '', timestamp: new Date() }],
    }));
    setPendingResponse(false);

    await sendMessage(
      apiMessages,
      // onChunk
      (delta) => {
        updateConv(convId, c => ({
          ...c,
          messages: c.messages.map(m =>
            m.id === assistantMsgId ? { ...m, content: m.content + delta } : m
          ),
        }));
      },
      // onDone
      () => {
        setStreaming(false);
      },
      // onError
      (err) => {
        addToast(err, 'error', 5000);
        // Remove the empty assistant placeholder on error
        updateConv(convId, c => ({
          ...c,
          messages: c.messages.filter(m => m.id !== assistantMsgId),
        }));
        setStreaming(false);
      }
    );
  }, [input, streaming, config, activeId, messages, sendMessage, updateConv, addToast]);

  const handleStop = () => {
    stop();
    setStreaming(false);
    setPendingResponse(false);
  };

  // ── keyboard shortcut ──────────────────────────────────────────────────────
  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── new conversation ───────────────────────────────────────────────────────
  const createNewConv = () => {
    const c = newConv();
    setConversations(cs => [c, ...cs]);
    setActiveId(c.id);
    setInput('');
    setStreaming(false);
  };

  // ── clear messages ─────────────────────────────────────────────────────────
  const clearChat = () => {
    updateConv(activeId, c => ({ ...c, messages: [], title: 'New Conversation' }));
    addToast('Chat cleared', 'info');
  };

  // ── save config ────────────────────────────────────────────────────────────
  const handleSaveConfig = (cfg) => {
    setConfig(cfg);
    saveConfig(cfg);
    addToast('Settings saved! Connected to Azure OpenAI.', 'success');
  };

  const isConfigured = !!config.apiKey;

  return (
    <div className="app-wrapper">
      {/* Background effects */}
      <div className="bg-grid" />
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />

      {/* ── SIDEBAR ─────────────────────────────────────────────────────── */}
      <aside className="sidebar">
        {/* Brand */}
        <div className="sidebar-header">
          <div className="brand">
            <div className="brand-icon">🤖</div>
            <span className="brand-name">SupportAI</span>
          </div>
          <p className="brand-tagline">Powered by Azure OpenAI GPT-4o</p>
        </div>

        {/* API status */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">Connection</div>
          <div
            id="api-status-badge"
            className="config-status"
            onClick={() => setShowSettings(true)}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => e.key === 'Enter' && setShowSettings(true)}
          >
            <div className={`config-status-dot ${isConfigured ? 'connected' : 'disconnected'}`} />
            <span className="config-status-label">
              {isConfigured ? 'API Connected' : 'Not configured'}
            </span>
            <span className="config-status-action">
              {isConfigured ? 'Edit' : 'Setup →'}
            </span>
          </div>
        </div>

        {/* Conversations */}
        <div className="sidebar-section" style={{ flex: 1, overflowY: 'auto' }}>
          <div className="sidebar-section-title">Conversations</div>
          <div className="conv-list">
            {conversations.map(c => (
              <div
                key={c.id}
                className={`conv-item ${c.id === activeId ? 'active' : ''}`}
                onClick={() => setActiveId(c.id)}
                role="button"
                tabIndex={0}
                onKeyPress={(e) => e.key === 'Enter' && setActiveId(c.id)}
              >
                <span className="conv-item-icon">
                  <MessageSquare size={13} />
                </span>
                <span className="conv-item-text">{c.title}</span>
              </div>
            ))}
          </div>
        </div>

        <button id="new-chat-btn" className="new-chat-btn" onClick={createNewConv}>
          <Plus size={16} /> New Conversation
        </button>

        {/* Model info */}
        <div className="sidebar-footer">
          <div className="model-info">
            <span className="model-info-icon"><Zap size={15} color="var(--primary)" /></span>
            <div className="model-info-details">
              <div className="model-info-name" title={config.deployment}>{config.deployment || 'Not set'}</div>
              <div className="model-info-sub">Fine-tuned GPT-4o</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── MAIN CHAT AREA ─────────────────────────────────────────────── */}
      <main className="chat-area">
        {/* Chat Header */}
        <header className="chat-header">
          <div className="chat-header-left">
            <div className="ai-avatar">
              <Bot size={20} color="#fff" />
              <div className="ai-avatar-status" />
            </div>
            <div className="chat-header-info">
              <div className="chat-header-name">{config.botName || 'SupportAI'}</div>
              <div className="chat-header-subtitle">
                <div className="chat-header-dot" />
                {streaming ? 'Typing…' : 'Online • Ready to help'}
              </div>
            </div>
          </div>
          <div className="chat-header-actions">
            <button
              id="clear-chat-btn"
              className="header-btn danger"
              onClick={clearChat}
              title="Clear conversation"
            >
              <RotateCcw size={15} />
            </button>
            <button
              id="settings-btn"
              className="header-btn"
              onClick={() => setShowSettings(true)}
              title="Settings"
            >
              <Settings size={15} />
            </button>
          </div>
        </header>

        {/* Messages */}
        <div className="messages-container" id="messages-container" role="log" aria-live="polite">
          {messages.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🤖</div>
              <h1 className="empty-title">How can I help you today?</h1>
              <p className="empty-subtitle">
                I'm your AI-powered support assistant, trained on your custom dataset.
                Ask me anything!
              </p>
              {!isConfigured && (
                <button
                  className="btn-primary"
                  style={{ padding: '12px 28px', borderRadius: '99px', fontSize: '14px', cursor: 'pointer' }}
                  onClick={() => setShowSettings(true)}
                  id="configure-api-btn"
                >
                  ⚙️ Configure API Settings
                </button>
              )}
              <div className="suggestion-chips">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    className="chip"
                    id={`suggestion-chip-${i}`}
                    onClick={() => handleSend(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <Message
                  key={msg.id || i}
                  role={msg.role}
                  content={msg.content}
                  timestamp={msg.timestamp || new Date()}
                />
              ))}
              {pendingResponse && <TypingIndicator />}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="input-area">
          <div className="input-wrapper">
            <textarea
              ref={textareaRef}
              id="chat-input"
              className="chat-input"
              placeholder={
                isConfigured
                  ? 'Type your message… (Enter to send, Shift+Enter for new line)'
                  : 'Configure your API key to start chatting…'
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              disabled={streaming && !pendingResponse}
              aria-label="Type your message"
            />
            {streaming ? (
              <button
                id="stop-btn"
                className="stop-btn"
                onClick={handleStop}
                title="Stop generating"
                aria-label="Stop generating"
              >
                <Square size={16} fill="currentColor" />
              </button>
            ) : (
              <button
                id="send-btn"
                className="send-btn"
                onClick={() => handleSend()}
                disabled={!input.trim() || !isConfigured}
                title="Send message"
                aria-label="Send message"
              >
                <Send size={16} />
              </button>
            )}
          </div>
          <p className="input-hint">
            {isConfigured
              ? `Connected to ${config.deployment || 'Azure OpenAI'}`
              : '⚠️ API not configured — click Settings to get started'}
          </p>
        </div>
      </main>

      {/* ── SETTINGS MODAL ─────────────────────────────────────────────── */}
      {showSettings && (
        <SettingsModal
          config={config}
          onSave={handleSaveConfig}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* ── TOASTS ─────────────────────────────────────────────────────── */}
      <ToastContainer toasts={toasts} />
    </div>
  );
}
