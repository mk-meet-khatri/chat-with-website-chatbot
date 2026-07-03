"use client";

import { Loader2, CheckCircle2, AlertCircle, Search, Database } from 'lucide-react';
import { CrawlJobStatus } from '../api/client';

interface CrawlStatusProps {
  status: CrawlJobStatus;
}

export function CrawlStatus({ status }: CrawlStatusProps) {
  const getStatusDetails = () => {
    switch (status.status) {
      case 'pending':
        return {
          icon: <Loader2 size={24} className="pulse-glow" style={{ color: 'hsl(var(--primary))', animation: 'spin 2s linear infinite' }} />,
          label: 'Initializing Job',
          description: 'Setting up sandbox folders and validating Weaviate connectivity...',
          color: 'var(--primary)'
        };
      case 'crawling':
        return {
          icon: <Loader2 size={24} style={{ color: 'hsl(var(--primary))', animation: 'spin 2s linear infinite' }} />,
          label: 'Crawling Website',
          description: `Politely discovering links and extracting body content (robots.txt respected)...`,
          color: 'var(--primary)'
        };
      case 'indexing':
        return {
          icon: <Loader2 size={24} style={{ color: 'hsl(var(--secondary))', animation: 'spin 2s linear infinite' }} />,
          label: 'Vectorizing & Indexing',
          description: 'Splitting text into chunks and generating Gemini embeddings...',
          color: 'var(--secondary)'
        };
      case 'done':
        return {
          icon: <CheckCircle2 size={24} style={{ color: 'hsl(var(--success))' }} />,
          label: 'Website Ready',
          description: 'All chunks have been indexed! The chatbot is unlocked.',
          color: 'var(--success)'
        };
      case 'failed':
        return {
          icon: <AlertCircle size={24} style={{ color: 'hsl(var(--error))' }} />,
          label: 'Pipeline Failed',
          description: status.error || 'An error occurred during crawling/indexing.',
          color: 'var(--error)'
        };
    }
  };

  const details = getStatusDetails();
  
  // Calculate crawling progress percentage
  const totalFound = Math.max(status.pagesFound, 1);
  const crawledPct = Math.min(Math.round((status.pagesCrawled / totalFound) * 100), 100);

  return (
    <div className="glass-panel animate-slide-up" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            border: `1px solid hsla(${details.color}, 0.2)`
          }}
        >
          {details.icon}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Phase</span>
          <span style={{ fontSize: '1.25rem', fontWeight: 650 }}>{details.label}</span>
        </div>
      </div>

      <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
        {details.description}
      </p>

      {/* Progress Info Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1.25rem',
          padding: '1.25rem',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'rgba(0, 0, 0, 0.15)',
          border: '1px solid hsl(var(--border))'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Search size={18} style={{ color: 'hsl(var(--primary))' }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>Pages Crawled</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>
              {status.pagesCrawled} <span style={{ fontSize: '0.9rem', color: 'hsl(var(--text-muted))' }}>/ {status.pagesFound}</span>
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Database size={18} style={{ color: 'hsl(var(--secondary))' }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>Vectors Indexed</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>{status.chunksIndexed} chunks</span>
          </div>
        </div>
      </div>

      {/* Progress bar animation */}
      {status.status === 'crawling' && (
        <div style={{ marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'between', fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', marginBottom: '0.5rem' }}>
            <span>Crawling Progress</span>
            <span style={{ marginLeft: 'auto' }}>{crawledPct}%</span>
          </div>
          <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '3px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${crawledPct}%`,
                height: '100%',
                background: 'linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 100%)',
                borderRadius: '3px',
                transition: 'width 0.4s ease'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
