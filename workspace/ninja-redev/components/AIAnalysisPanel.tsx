'use client';
import { useState, useCallback } from 'react';
import { ModelInputs, ModelOutputs } from '@/lib/model';

interface Props {
  inputs: ModelInputs;
  outputs: ModelOutputs | null;
}

type AnalysisState = 'idle' | 'loading' | 'done' | 'error';

/**
 * Render basic markdown to React elements (bold, bullets, headers only)
 * Keeps it dependency-free.
 */
function SimpleMarkdown({ text }: { text: string }) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // h2 ## header
    if (line.startsWith('## ')) {
      elements.push(
        <h3 key={i} className="text-sm font-bold text-gray-900 mt-4 mb-1.5 border-b border-gray-100 pb-1">
          {line.slice(3)}
        </h3>
      );
    }
    // bullet
    else if (line.startsWith('- ') || line.startsWith('• ')) {
      elements.push(
        <div key={i} className="flex gap-2 text-sm text-gray-700 mb-1 pl-1">
          <span className="text-blue-500 flex-shrink-0 mt-0.5">•</span>
          <span>{renderInline(line.slice(2))}</span>
        </div>
      );
    }
    // empty line
    else if (!line.trim()) {
      if (i > 0 && lines[i - 1].trim()) elements.push(<div key={i} className="mb-1" />);
    }
    // normal paragraph
    else {
      elements.push(
        <p key={i} className="text-sm text-gray-700 mb-1.5 leading-relaxed">
          {renderInline(line)}
        </p>
      );
    }
  }

  return <div>{elements}</div>;
}

function renderInline(text: string): React.ReactNode {
  // Handle **bold** and *italic* inline
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

export default function AIAnalysisPanel({ inputs, outputs }: Props) {
  const [state, setState] = useState<AnalysisState>('idle');
  const [analysis, setAnalysis] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [noKey, setNoKey] = useState(false);

  const runAnalysis = useCallback(async () => {
    if (!outputs) return;
    setState('loading');
    setError('');
    setNoKey(false);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs, outputs }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === 'NO_API_KEY') {
          setNoKey(true);
          setError(data.error ?? 'API key not configured');
          setState('error');
        } else {
          setError(data.error ?? `HTTP ${res.status}`);
          setState('error');
        }
        return;
      }

      setAnalysis(data.analysis ?? '');
      setState('done');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error');
      setState('error');
    }
  }, [inputs, outputs]);

  const reset = () => {
    setState('idle');
    setAnalysis('');
    setError('');
    setNoKey(false);
  };

  if (!outputs) {
    return (
      <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-5 text-center text-sm text-gray-400">
        <div className="text-2xl mb-1">🤖</div>
        Fix model errors to enable AI analysis
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gradient-to-r from-violet-50 to-blue-50">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <div>
            <span className="text-sm font-semibold text-gray-800">AI Deal Analysis</span>
            <span className="ml-2 text-xs text-gray-400">powered by Claude</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {state === 'done' && (
            <button
              onClick={reset}
              className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-100"
            >
              Reset
            </button>
          )}
          {(state === 'idle' || state === 'done') && (
            <button
              onClick={runAnalysis}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.346.316A3.001 3.001 0 0112 15a3.001 3.001 0 01-2.071-.784l-.346-.316z" />
              </svg>
              {state === 'done' ? 'Re-analyze' : 'Analyze Deal'}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-5 py-4">
        {/* Idle */}
        {state === 'idle' && (
          <div className="text-center py-6 space-y-2">
            <div className="text-3xl">✨</div>
            <p className="text-sm font-medium text-gray-700">Get instant AI insights on this deal</p>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              Claude will analyze returns, capital structure, risks, and give you actionable investment committee feedback.
            </p>
          </div>
        )}

        {/* Loading */}
        {state === 'loading' && (
          <div className="text-center py-8 space-y-3">
            <div className="flex justify-center">
              <div className="w-8 h-8 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
            </div>
            <p className="text-sm text-gray-500">Analyzing deal with Claude…</p>
            <p className="text-xs text-gray-400">Reading numbers, comparing benchmarks, drafting insights…</p>
          </div>
        )}

        {/* Error — No API Key */}
        {state === 'error' && noKey && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex gap-3">
                <span className="text-xl">🔑</span>
                <div>
                  <p className="text-sm font-semibold text-amber-800">Anthropic API Key Required</p>
                  <p className="text-xs text-amber-700 mt-1">
                    To enable AI analysis, add your Anthropic API key to <code className="bg-amber-100 px-1 rounded">.env.local</code>:
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-gray-900 rounded-xl p-4">
              <code className="text-xs text-green-400 font-mono block">
                # .env.local (project root)<br />
                ANTHROPIC_API_KEY=sk-ant-api03-...
              </code>
            </div>
            <ol className="text-xs text-gray-600 space-y-1 pl-4 list-decimal">
              <li>Get a key at <span className="text-blue-600">console.anthropic.com</span></li>
              <li>Create <code className="bg-gray-100 px-1 rounded">.env.local</code> in the project root</li>
              <li>Restart the dev server (<code className="bg-gray-100 px-1 rounded">npm run dev</code>)</li>
            </ol>
            <button
              onClick={reset}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              Back
            </button>
          </div>
        )}

        {/* Error — other */}
        {state === 'error' && !noKey && (
          <div className="space-y-3">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-red-800">Analysis failed</p>
              <p className="text-xs text-red-600 mt-1 font-mono">{error}</p>
            </div>
            <button
              onClick={runAnalysis}
              className="text-xs text-violet-600 hover:text-violet-800 font-medium"
            >
              Try again →
            </button>
          </div>
        )}

        {/* Done — Analysis */}
        {state === 'done' && analysis && (
          <div className="space-y-1 max-h-96 overflow-y-auto pr-1">
            <SimpleMarkdown text={analysis} />
            <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-400">Generated by Claude · Not financial advice</span>
              <button
                onClick={() => navigator.clipboard.writeText(analysis)}
                className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-50"
                title="Copy analysis to clipboard"
              >
                📋 Copy
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
