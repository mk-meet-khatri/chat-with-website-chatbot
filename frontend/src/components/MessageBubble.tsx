"use client";

import React from 'react';
import { SourceCitation, Source } from './SourceCitation';
import { Bot, User } from 'lucide-react';

export interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  sources?: Source[];
}

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.sender === 'user';

  // Formatter to render bracket references [Source X] as super-script badges
  const renderFormattedText = (text: string) => {
    const citationRegex = /\[Source (\d+)\]/g;
    const elements: React.ReactNode[] = [];
    let lastIdx = 0;
    let match;

    while ((match = citationRegex.exec(text)) !== null) {
      const matchStart = match.index;
      if (matchStart > lastIdx) {
        elements.push(text.substring(lastIdx, matchStart));
      }

      const sourceIndex = match[1];
      elements.push(
        <sup
          key={matchStart}
          style={{
            color: 'hsl(var(--primary))',
            fontWeight: 700,
            fontSize: '0.7rem',
            padding: '0 0.15rem',
            marginLeft: '0.05rem',
            cursor: 'default'
          }}
          title={`See source citation [${sourceIndex}] below`}
        >
          [{sourceIndex}]
        </sup>
      );

      lastIdx = citationRegex.lastIndex;
    }

    if (lastIdx < text.length) {
      elements.push(text.substring(lastIdx));
    }

    return elements.length > 0 ? elements : text;
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: '0.75rem',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        width: '100%',
        animation: 'slideUp 0.3s ease forwards'
      }}
    >
      {/* Bot Avatar */}
      {!isUser && (
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: 'hsla(var(--primary), 0.1)',
            border: '1px solid hsla(var(--primary), 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          <Bot size={18} style={{ color: 'hsl(var(--primary))' }} />
        </div>
      )}

      {/* Message Content Bubble */}
      <div
        style={{
          maxWidth: '75%',
          display: 'flex',
          flexDirection: 'column',
          padding: '1rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          backgroundColor: isUser ? 'hsla(var(--primary), 0.15)' : 'rgba(255, 255, 255, 0.02)',
          border: isUser ? '1px solid hsla(var(--primary), 0.3)' : '1px solid rgba(255, 255, 255, 0.05)',
          color: 'hsl(var(--text-primary))',
          boxShadow: isUser ? '0 4px 15px -5px hsla(var(--primary), 0.2)' : '0 4px 15px -5px rgba(0,0,0,0.3)'
        }}
      >
        {/* Message body text */}
        <p style={{ whiteSpace: 'pre-wrap', fontSize: '0.95rem', wordBreak: 'break-word', lineHeight: 1.6 }}>
          {renderFormattedText(message.text)}
        </p>

        {/* Source citation links below bot messages */}
        {!isUser && message.sources && (
          <SourceCitation sources={message.sources} />
        )}
      </div>

      {/* User Avatar */}
      {isUser && (
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: 'hsla(var(--secondary), 0.1)',
            border: '1px solid hsla(var(--secondary), 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          <User size={18} style={{ color: 'hsl(var(--secondary))' }} />
        </div>
      )}
    </div>
  );
}
