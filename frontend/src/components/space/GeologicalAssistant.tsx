import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Bot, LoaderCircle, MessageSquare, Send, Sparkles, User } from 'lucide-react';
import { apiClient } from '../../api/client';

const SUGGESTIONS = [
  'Why was Candidate Zone 01 prioritized?',
  'Compare Barbil and Bharveli exploration targets',
  'Explain the SWIR spectral band ratio for manganese',
  'What unauthorized mining alerts were triggered?',
];

export function GeologicalAssistant() {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    {
      role: 'assistant',
      text: 'Greetings! I am the **MANGAN-AI Geological Assistant**. I can assist you with spectral band interpretations, target zone prioritization rationale, terrain feasibility, and field verification logistics across India\'s manganese belts.',
    },
  ]);
  const [input, setInput] = useState('');

  const chatMutation = useMutation({
    mutationFn: apiClient.assistantChat,
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { role: 'assistant', text: data.response }]);
    },
  });

  const handleSend = (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim()) return;
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setInput('');
    chatMutation.mutate({ query: text });
  };

  return (
    <div className="geological-assistant-panel panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">GEOSPATIAL INTELLIGENCE & REASONING</p>
          <h2>Geological AI Exploration Assistant</h2>
        </div>
        <span className="live-tag">
          <Bot size={13} /> CONTEXT-AWARE AGENT
        </span>
      </div>

      <div className="chat-container">
        <div className="chat-messages-scroll">
          {messages.map((m, i) => (
            <div className={`chat-bubble-row ${m.role}`} key={i}>
              <div className="chat-avatar">
                {m.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
              </div>
              <div className="chat-bubble">
                <div
                  className="chat-text"
                  dangerouslySetInnerHTML={{
                    __html: m.text
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/\*(.*?)\*/g, '<em>$1</em>')
                      .replace(/\n/g, '<br />'),
                  }}
                />
              </div>
            </div>
          ))}
          {chatMutation.isPending && (
            <div className="chat-bubble-row assistant">
              <div className="chat-avatar">
                <Bot size={16} />
              </div>
              <div className="chat-bubble typing-bubble">
                <LoaderCircle className="spin" size={16} />
                <span>Evaluating spectral telemetry and geological formation records...</span>
              </div>
            </div>
          )}
        </div>

        <div className="chat-suggestions-row">
          <span className="sugg-lbl">
            <Sparkles size={12} /> Suggested Queries:
          </span>
          <div className="sugg-pills">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                className="sugg-pill"
                onClick={() => handleSend(s)}
                disabled={chatMutation.isPending}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <form
          className="chat-input-row"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <input
            placeholder="Ask about candidate zones, spectral ratios, or lease compliance..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={chatMutation.isPending}
          />
          <button className="primary-button send-btn" type="submit" disabled={chatMutation.isPending || !input.trim()}>
            <Send size={15} /> Send
          </button>
        </form>
      </div>
    </div>
  );
}
