import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send, RotateCcw, Sparkles, HardHat } from 'lucide-react';
import { sendAssistantMessage, getAssistantSuggestions } from '../services/api';

const historyKey = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    return `constructops_assistant_${user?._id || user?.id || 'anon'}`;
  } catch {
    return 'constructops_assistant_anon';
  }
};

const loadHistory = () => {
  try {
    const raw = localStorage.getItem(historyKey());
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(-12) : [];
  } catch {
    return [];
  }
};

const renderRichText = (content) =>
  String(content).split('\n').map((line, li) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ')) {
      return (
        <div key={li} className="assistant-li">
          <span className="assistant-dot" />
          <span>{trimmed.slice(2)}</span>
        </div>
      );
    }
    if (!trimmed) return <div key={li} className="assistant-gap" />;
    return <div key={li}>{trimmed}</div>;
  });

const AssistantChat = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(loadHistory);
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open && suggestions.length === 0) {
      getAssistantSuggestions()
        .then((res) => setSuggestions(res.suggestions || []))
        .catch(() => {});
      inputRef.current?.focus();
    }
  }, [open, suggestions.length]);

  useEffect(() => {
    localStorage.setItem(historyKey(), JSON.stringify(messages.slice(-12)));
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || busy) return;
    const next = [...messages, { role: 'user', content }];
    setMessages(next);
    setInput('');
    setBusy(true);
    try {
      const res = await sendAssistantMessage(next.slice(-12));
      setMessages([...next, { role: 'assistant', content: res.reply || 'Sorry, could not answer that.' }]);
    } catch {
      setMessages([...next, { role: 'assistant', content: 'Assistant ab available nahi hai. Internet/connection check kar ke dobara bhejein.' }]);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  const reset = () => {
    setMessages([]);
    localStorage.removeItem(historyKey());
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close assistant' : 'Open ConstructOps assistant'}
        className="assistant-fab"
      >
        {open ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {open && (
        <div className="assistant-panel" role="dialog" aria-label="ConstructOps Assistant">
          {/* Header */}
          <div className="assistant-header">
            <div className="assistant-header-icon">
              <HardHat size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="assistant-title">ConstructOps Assistant</div>
              <div className="assistant-subtitle">
                {busy ? 'Soch raha hai...' : 'Aap ke apne workspace par based — ready to help'}
              </div>
            </div>
            <button type="button" onClick={reset} className="assistant-icon-btn" aria-label="Clear conversation" title="Clear conversation">
              <RotateCcw size={16} />
            </button>
            <button type="button" onClick={() => setOpen(false)} className="assistant-icon-btn" aria-label="Close">
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="assistant-body">
            {messages.length === 0 ? (
              <div className="assistant-empty">
                <div className="assistant-empty-icon"><Sparkles size={26} /></div>
                <h4>Kyai sawal hai? Pooch lein.</h4>
                <p>
                  Main sirf <strong>aap ki company</strong> ka data parh kar jawab deta hoon —
                  budget, approvals, alerts, workers aur billing. Koshish karein:
                </p>
                <div>
                  {suggestions.map((s) => (
                    <button key={s} type="button" onClick={() => send(s)} className="assistant-chip">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={`assistant-row ${m.role === 'user' ? 'assistant-row-user' : ''}`}>
                  {m.role !== 'user' && <div className="assistant-avatar-co"><HardHat size={13} /></div>}
                  <div className={`assistant-bubble ${m.role === 'user' ? 'assistant-bubble-user' : ''}`}>
                    {m.role === 'user' ? m.content : renderRichText(m.content)}
                  </div>
                  {m.role === 'user' && <div className="assistant-avatar-me">Aap</div>}
                </div>
              ))
            )}
            {busy && (
              <div className="assistant-row">
                <div className="assistant-avatar-co"><HardHat size={13} /></div>
                <div className="assistant-bubble assistant-typing">
                  <span /><span /><span />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Composer */}
          <div className="assistant-composer">
            <input
              ref={inputRef}
              className="form-control"
              placeholder="Apna sawal likhein... (Enter bajein)"
              value={input}
              maxLength={1000}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              disabled={busy}
            />
            <button type="button" onClick={() => send()} disabled={busy || !input.trim()} className="assistant-send" aria-label="Send message">
              <Send size={18} />
            </button>
          </div>

          <div className="assistant-footnote">
            Aap ka data sirf aap ki company tak mehdood hai — kisi doosri company ki info kabhi nahi dikhai jati.
          </div>
        </div>
      )}
    </>
  );
};

export default AssistantChat;
