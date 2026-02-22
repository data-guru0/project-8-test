import { useState, useRef, useCallback } from 'react';

const AZURE_API_VERSION = '2024-12-01-preview';

export function useAzureOpenAI(config) {
    const abortRef = useRef(null);

    const sendMessage = useCallback(async (messages, onChunk, onDone, onError) => {
        if (!config.apiKey || !config.endpoint || !config.deployment) {
            onError('Please configure your Azure OpenAI settings first.');
            return;
        }

        // Build the endpoint URL
        const url = `${config.endpoint.replace(/\/$/, '')}/openai/deployments/${config.deployment}/chat/completions?api-version=${AZURE_API_VERSION}`;

        abortRef.current = new AbortController();

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'api-key': config.apiKey,
                },
                body: JSON.stringify({
                    messages,
                    max_tokens: 4096,
                    temperature: parseFloat(config.temperature) || 1.0,
                    top_p: 1.0,
                    stream: true,
                }),
                signal: abortRef.current.signal,
            });

            if (!response.ok) {
                const errBody = await response.text();
                let errMsg = `API Error ${response.status}`;
                try {
                    const parsed = JSON.parse(errBody);
                    errMsg = parsed.error?.message || errMsg;
                } catch (_) { }
                onError(errMsg);
                return;
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop(); // keep incomplete line

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed || trimmed === 'data: [DONE]') continue;
                    if (!trimmed.startsWith('data: ')) continue;

                    try {
                        const json = JSON.parse(trimmed.slice(6));
                        const delta = json.choices?.[0]?.delta?.content;
                        if (delta) onChunk(delta);
                    } catch (_) { }
                }
            }

            onDone();
        } catch (err) {
            if (err.name === 'AbortError') {
                onDone(); // graceful stop
            } else {
                onError(err.message || 'Network error. Check your endpoint and API key.');
            }
        }
    }, [config]);

    const stop = useCallback(() => {
        abortRef.current?.abort();
    }, []);

    return { sendMessage, stop };
}
