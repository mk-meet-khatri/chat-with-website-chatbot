"use client";

import React, { useState } from 'react';
import { Globe, Settings2, ArrowRight } from 'lucide-react';

interface UrlInputProps {
  onSubmit: (url: string, maxPages: number, maxDepth: number) => void;
  isLoading: boolean;
}

export function UrlInput({ onSubmit, isLoading }: UrlInputProps) {
  const [url, setUrl] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [maxPages, setMaxPages] = useState(30);
  const [maxDepth, setMaxDepth] = useState(2);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    let targetUrl = url.trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = 'https://' + targetUrl;
    }

    onSubmit(targetUrl, maxPages, maxDepth);
  };

  return (
    <div className="glass-panel animate-slide-up" style={{ padding: '2rem' }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="input-group">
          <label className="input-label" htmlFor="url-input">
            Target Website URL
          </label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Globe
              size={20}
              style={{
                position: 'absolute',
                left: '1.25rem',
                color: 'hsl(var(--text-muted))'
              }}
            />
            <input
              id="url-input"
              type="text"
              className="text-input"
              placeholder="e.g. books.toscrape.com or react.dev"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isLoading}
              style={{ paddingLeft: '3.25rem' }}
              required
            />
          </div>
        </div>

        {/* Advanced Settings foldout */}
        <div>
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            style={{
              background: 'none',
              border: 'none',
              color: 'hsl(var(--text-secondary))',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 500,
              padding: '0.25rem 0'
            }}
          >
            <Settings2 size={16} />
            <span>{showSettings ? 'Hide' : 'Show'} Crawler Settings</span>
          </button>

          {showSettings && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1.5rem',
                marginTop: '1.25rem',
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(0,0,0,0.2)',
                border: '1px solid hsl(var(--border))',
                animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
              }}
            >
              <div className="input-group">
                <label className="input-label" htmlFor="max-pages-input">
                  Max Pages to Crawl
                </label>
                <input
                  id="max-pages-input"
                  type="number"
                  className="text-input"
                  min={1}
                  max={200}
                  value={maxPages}
                  onChange={(e) => setMaxPages(parseInt(e.target.value, 10) || 1)}
                  disabled={isLoading}
                />
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="max-depth-input">
                  Max Crawl Depth
                </label>
                <input
                  id="max-depth-input"
                  type="number"
                  className="text-input"
                  min={0}
                  max={10}
                  value={maxDepth}
                  onChange={(e) => setMaxDepth(parseInt(e.target.value, 10) || 0)}
                  disabled={isLoading}
                />
              </div>
            </div>
          )}
        </div>

        <button type="submit" className="btn-primary" disabled={isLoading || !url.trim()}>
          <span>{isLoading ? 'Processing Pipeline...' : 'Crawl & Index Website'}</span>
          {!isLoading && <ArrowRight size={18} />}
        </button>
      </form>
    </div>
  );
}
