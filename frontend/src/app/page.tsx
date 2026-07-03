"use client";

import { useState } from 'react';
import { UrlInput } from '../components/UrlInput';
import { CrawlStatus } from '../components/CrawlStatus';
import { ChatWindow } from '../components/ChatWindow';
import { Message } from '../components/MessageBubble';
import { initiateCrawl, sendChatMessageStream } from '../api/client';
import { useCrawlStatus } from '../hooks/useCrawlStatus';
import { RefreshCw, Globe } from 'lucide-react';

export default function Home() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [targetUrl, setTargetUrl] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isBotTyping, setIsBotTyping] = useState(false);

  // Poll progress if jobId is active
  const { jobStatus, pollError } = useCrawlStatus(jobId);

  const handleCrawlSubmit = async (url: string, maxPages: number, maxDepth: number) => {
    setIsSubmitting(true);
    setSubmitError(null);
    setMessages([]); // Reset messages on new crawl
    try {
      setTargetUrl(url);
      const res = await initiateCrawl(url, maxPages, maxDepth);
      setJobId(res.jobId);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to start crawler.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!jobId) return;

    // 1. Add user message
    const userMsgId = Date.now().toString();
    const newUserMsg: Message = {
      id: userMsgId,
      sender: 'user',
      text
    };

    // 2. Add empty placeholder bot message that we will stream text into
    const botMsgId = (Date.now() + 1).toString();
    const newBotMsg: Message = {
      id: botMsgId,
      sender: 'bot',
      text: '', // Start empty
      sources: []
    };

    setMessages((prev) => [...prev, newUserMsg, newBotMsg]);
    setIsBotTyping(true);

    try {
      let accumulatedText = '';
      let gotFirstChunk = false;

      // 3. Initiate response stream
      await sendChatMessageStream(
        jobId,
        text,
        (textChunk) => {
          if (!gotFirstChunk) {
            gotFirstChunk = true;
            setIsBotTyping(false); // Turn off typing indicator when model begins outputting text
          }
          accumulatedText += textChunk;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botMsgId
                ? { ...msg, text: accumulatedText }
                : msg
            )
          );
        },
        (sources) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botMsgId
                ? { ...msg, sources }
                : msg
            )
          );
        }
      );
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMsgId
            ? { ...msg, text: `Error: ${err.message || 'Failed to fetch answers from the vector index.'}` }
            : msg
        )
      );
    } finally {
      setIsBotTyping(false);
    }
  };

  const handleReset = () => {
    setJobId(null);
    setTargetUrl('');
    setSubmitError(null);
    setMessages([]);
  };

  const domainName = targetUrl ? new URL(targetUrl).hostname : '';

  return (
    <div className="app-container">
      {/* Premium Header */}
      <header>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <Globe style={{ color: 'hsl(var(--primary))' }} size={28} />
          <span style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '0.05em' }}>WEBMIND</span>
        </div>
        <h1>
          Chat with any <span className="gradient-text">Website</span>
        </h1>
        <p>
          Submit a URL to trigger a scoped crawl. The site's text is extracted, vectorized, 
          and stored in Weaviate Cloud so you can query it with citation support.
        </p>
      </header>

      {/* Main flow controls */}
      {!jobId && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <UrlInput onSubmit={handleCrawlSubmit} isLoading={isSubmitting} />
          {(submitError || pollError) && (
            <div
              style={{
                padding: '1rem 1.25rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'hsla(var(--error), 0.1)',
                border: '1px solid hsla(var(--error), 0.2)',
                color: 'hsl(var(--error))',
                fontSize: '0.9rem'
              }}
            >
              {submitError || pollError}
            </div>
          )}
        </div>
      )}

      {jobId && jobStatus && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Status Display */}
          <CrawlStatus status={jobStatus} />

          {/* Reset / Go back button if crawler fails or is finished */}
          {(jobStatus.status === 'done' || jobStatus.status === 'failed') && (
            <button
              onClick={handleReset}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                alignSelf: 'center',
                background: 'none',
                border: '1px solid hsl(var(--border))',
                color: 'hsl(var(--text-secondary))',
                padding: '0.6rem 1.25rem',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 500,
                transition: 'var(--transition-all)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'hsla(var(--primary), 0.3)';
                e.currentTarget.style.color = 'hsl(var(--text-primary))';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'hsl(var(--border))';
                e.currentTarget.style.color = 'hsl(var(--text-secondary))';
              }}
            >
              <RefreshCw size={14} />
              <span>Analyze Another Website</span>
            </button>
          )}

          {/* Chat Window - only visible when crawling and indexing are completed */}
          {jobStatus.status === 'done' && (
            <ChatWindow
              messages={messages}
              onSendMessage={handleSendMessage}
              isBotTyping={isBotTyping}
              domainName={domainName}
            />
          )}
        </div>
      )}
    </div>
  );
}
