import { useState } from 'react';
import { X, Settings, Eye, EyeOff, Zap } from 'lucide-react';

export default function SettingsModal({ config, onSave, onClose }) {
    const [form, setForm] = useState({ ...config });
    const [showKey, setShowKey] = useState(false);

    const handle = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

    const save = () => {
        if (!form.apiKey.trim()) return alert('API Key is required.');
        if (!form.endpoint.trim()) return alert('Endpoint URL is required.');
        if (!form.deployment.trim()) return alert('Deployment name is required.');
        onSave(form);
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                {/* Header */}
                <div className="modal-header">
                    <h2 className="modal-title">
                        <Settings size={20} color="var(--primary)" />
                        API Configuration
                    </h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={15} />
                    </button>
                </div>

                {/* Info box */}
                <div className="info-box">
                    <span className="info-box-icon">🔒</span>
                    <p className="info-box-text">
                        Your credentials are stored only in your browser's local storage and never sent anywhere except directly to your Azure OpenAI endpoint.
                    </p>
                </div>

                {/* API Key */}
                <div className="form-group">
                    <label className="form-label">
                        API Key <span>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                        <input
                            id="api-key-input"
                            className="form-input password-input"
                            type={showKey ? 'text' : 'password'}
                            placeholder="Enter your Azure OpenAI API key..."
                            value={form.apiKey}
                            onChange={handle('apiKey')}
                            style={{ paddingRight: '44px' }}
                        />
                        <button
                            onClick={() => setShowKey(s => !s)}
                            style={{
                                position: 'absolute', right: '12px', top: '50%',
                                transform: 'translateY(-50%)', background: 'none',
                                border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                                display: 'flex', alignItems: 'center',
                            }}
                        >
                            {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                    </div>
                    <p className="form-hint">Found under your Azure OpenAI resource → Keys and Endpoint.</p>
                </div>

                {/* Endpoint */}
                <div className="form-group">
                    <label className="form-label">
                        Azure Endpoint URL <span>*</span>
                    </label>
                    <input
                        id="endpoint-input"
                        className="form-input"
                        type="url"
                        placeholder="https://your-resource.cognitiveservices.azure.com/"
                        value={form.endpoint}
                        onChange={handle('endpoint')}
                    />
                </div>

                {/* Deployment */}
                <div className="form-group">
                    <label className="form-label">
                        Deployment Name <span>*</span>
                    </label>
                    <input
                        id="deployment-input"
                        className="form-input"
                        type="text"
                        placeholder="e.g. gpt-4o-2024-08-06-project-demo"
                        value={form.deployment}
                        onChange={handle('deployment')}
                    />
                    <p className="form-hint">Your fine-tuned model deployment name from Azure AI Foundry.</p>
                </div>

                <div className="divider" />

                {/* System Prompt + Temperature */}
                <div className="form-group">
                    <label className="form-label">System Prompt</label>
                    <textarea
                        id="system-prompt-input"
                        className="form-input"
                        rows={3}
                        placeholder="You are a helpful customer support assistant..."
                        value={form.systemPrompt}
                        onChange={handle('systemPrompt')}
                        style={{ resize: 'vertical', lineHeight: '1.6' }}
                    />
                </div>

                <div className="form-row">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Temperature</label>
                        <input
                            id="temperature-input"
                            className="form-input"
                            type="number"
                            min="0" max="2" step="0.1"
                            value={form.temperature}
                            onChange={handle('temperature')}
                        />
                        <p className="form-hint">0 = focused, 2 = creative</p>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Bot Name</label>
                        <input
                            id="bot-name-input"
                            className="form-input"
                            type="text"
                            placeholder="Support AI"
                            value={form.botName}
                            onChange={handle('botName')}
                        />
                    </div>
                </div>

                <div className="divider" />

                <div className="modal-actions">
                    <button className="btn-secondary" onClick={onClose}>Cancel</button>
                    <button id="save-config-btn" className="btn-primary" onClick={save}>
                        <Zap size={15} style={{ marginRight: 6, display: 'inline' }} />
                        Save &amp; Connect
                    </button>
                </div>
            </div>
        </div>
    );
}
