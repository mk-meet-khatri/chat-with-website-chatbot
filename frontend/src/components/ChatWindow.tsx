"use client";

import React, { useState, useRef, useEffect } from 'react';
import { MessageBubble, Message } from './MessageBubble';
import { Send, Bot, Sparkles, Loader2 } from 'lucide-react';

interface ChatWindowProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  isBotTyping: boolean;
  domainName: string;
}

export function ChatWindow({ messages, onSendMessage, isBotTyping, domainName }: ChatWindowProps) {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to latest messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isBotTyping]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isBotTyping) return;

    onSendMessage(inputText.trim());
    setInputText('');
  };

  return (
    <div
      className="glass-panel animate-slide-up"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '600px',
        overflow: 'hidden',
        border: '1px solid hsla(var(--border), 0.8)'
      }}
    >
      {/* Header bar of Chat Window */}
      <div
        style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid hsl(var(--border))',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          backgroundColor: 'rgba(0, 0, 0, 0.2)'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            backgroundColor: 'hsla(var(--primary), 0.1)',
            border: '1px solid hsla(var(--primary), 0.2)'
          }}
        >
          <Bot size={16} style={{ color: 'hsl(var(--primary))' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.95rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span>Chatting with {domainName}</span>
            <Sparkles size={12} style={{ color: 'hsl(var(--secondary))' }} />
          </span>
          <span style={{ fontSize: '0.75rem', color: 'hsl(var(--success))', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'currentColor' }} />
            <span>Grounded context active</span>
          </span>
        </div>
      </div>

      {/* Message Feed Area */}
      <div
        style={{
          flex: 1,
          padding: '1.5rem',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem'
        }}
      >
        {messages.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              textAlign: 'center',
              gap: '0.75rem',
              color: 'hsl(var(--text-secondary))',
              maxWidth: '360px',
              margin: '0 auto'
            }}
          >
            <Bot size={36} style={{ color: 'hsl(var(--primary))', marginBottom: '0.5rem' }} />
            <p style={{ fontWeight: 550, color: 'hsl(var(--text-primary))' }}>Ask questions about this website</p>
            <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))' }}>
              Every claim made by the chatbot is validated using chunk similarity and displays direct source citations.
            </p>
          </div>
        ) : (
          messages
            .filter((msg) => msg.text.trim() !== '')
            .map((msg) => <MessageBubble key={msg.id} message={msg} />)
        )}

        {/* Bot Typing Indicator */}
        {isBotTyping && (
          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'center',
              animation: 'fadeIn 0.3s ease'
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: 'hsla(var(--primary), 0.1)',
                border: '1px solid hsla(var(--primary), 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Loader2 size={16} style={{ color: 'hsl(var(--primary))', animation: 'spin 2s linear infinite' }} />
            </div>
            <div
              style={{
                padding: '0.75rem 1.25rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                color: 'hsl(var(--text-muted))',
                fontSize: '0.9rem',
                fontStyle: 'italic'
              }}
            >
              Analyzing vector index and generating answer...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Form */}
      <form
        onSubmit={handleSend}
        style={{
          padding: '1.25rem 1.5rem',
          borderTop: '1px solid hsl(var(--border))',
          display: 'flex',
          gap: '0.75rem',
          backgroundColor: 'rgba(0, 0, 0, 0.1)'
        }}
      >
        <input
          type="text"
          className="text-input"
          placeholder="Ask a question about this site..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={isBotTyping}
          style={{ padding: '0.85rem 1.25rem' }}
        />
        <button
          type="submit"
          className="btn-primary"
          disabled={!inputText.trim() || isBotTyping}
          style={{ padding: '0.85rem 1.25rem' }}
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
