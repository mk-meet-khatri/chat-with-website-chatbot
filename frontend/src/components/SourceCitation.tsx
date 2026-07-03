"use client";

import { ExternalLink } from 'lucide-react';

export interface Source {
  url: string;
  title: string;
}

interface SourceCitationProps {
  sources: Source[];
}

export function SourceCitation({ sources }: SourceCitationProps) {
  if (!sources || sources.length === 0) return null;

  return (
    <div
      style={{
        marginTop: '0.75rem',
        paddingTop: '0.75rem',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.35rem'
      }}
    >
      <span
        style={{
          fontSize: '0.75rem',
          color: 'hsl(var(--text-muted))',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}
      >
        Cited Sources
      </span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {sources.map((src, index) => {
          // Extract nice display hostname/pathname
          let label = src.title || 'Source Page';
          if (label.length > 35) {
            label = label.slice(0, 32) + '...';
          }

          return (
            <a
              key={index}
              href={src.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.35rem 0.6rem',
                borderRadius: '6px',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                color: 'hsl(var(--primary))',
                fontSize: '0.8rem',
                textDecoration: 'none',
                transition: 'var(--transition-all)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.07)';
                e.currentTarget.style.borderColor = 'hsla(var(--primary), 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
              }}
            >
              <span>[{index}] {label}</span>
              <ExternalLink size={12} />
            </a>
          );
        })}
      </div>
    </div>
  );
}
