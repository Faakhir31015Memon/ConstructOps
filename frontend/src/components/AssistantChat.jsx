import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MessageCircle, X, Send, RotateCcw, Sparkles, HardHat, Mic, MicOff, Volume2, VolumeX, Play } from 'lucide-react';
import { sendAssistantMessage, getAssistantSuggestions } from '../services/api';
import { useLang } from '../i18n/LanguageContext';

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

const Recognition = typeof window !== 'undefined'
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null;

const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

const clockTime = (ms, locale) =>
  new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(new Date(ms));

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
  const { lang, setLang, t, languages, speechLocale, locale, dir } = useLang();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(loadHistory);
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [speakingId, setSpeakingId] = useState(null);

  const inputRef = useRef(null);
  const bottomRef = useRef(null);
  const recognitionRef = useRef(null);
  const transcriptRef = useRef('');
  const speakSeq = useRef(0);

  useEffect(() => {
    if (!open || suggestions.length > 0) return;
    getAssistantSuggestions(lang)
      .then((res) => setSuggestions(res.suggestions || []))
      .catch(() => {});
    inputRef.current?.focus();
  }, [open, suggestions.length, lang]);

  // Starter questions follow the assistant language.
  const reloadSuggestions = useCallback((nextLang) => {
    getAssistantSuggestions(nextLang).then((res) => setSuggestions(res.suggestions || [])).catch(() => {});
  }, []);

  useEffect(() => {
    localStorage.setItem(historyKey(), JSON.stringify(messages.slice(-12)));
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const stopSpeaking = useCallback(() => {
    speakSeq.current += 1;
    if (canSpeak) window.speechSynthesis.cancel();
    setSpeakingId(null);
  }, []);

  useEffect(() => stopSpeaking, [stopSpeaking]);

  const speak = useCallback((text, id) => {
    if (!canSpeak) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(String(text).replace(/^- /gm, '').replace(/\n+/g, '. '));
    utterance.lang = speechLocale;
    utterance.rate = 1;
    utterance.pitch = 1;
    const match = window.speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith(speechLocale.slice(0, 2)));
    if (match) utterance.voice = match;
    const seq = speakSeq.current;
    utterance.onstart = () => setSpeakingId(id);
    utterance.onend = () => { if (speakSeq.current === seq) setSpeakingId(null); };
    utterance.onerror = () => { if (speakSeq.current === seq) setSpeakingId(null); };
    window.speechSynthesis.speak(utterance);
  }, [speechLocale]);

  const send = async (text, viaVoice = false) => {
    const content = (text ?? input).trim();
    if (!content || busy) return;
    const next = [...messages, { role: 'user', content, at: Date.now(), voice: viaVoice }];
    setMessages(next);
    setInput('');
    setBusy(true);
    try {
      const res = await sendAssistantMessage(next.slice(-12), lang);
      const reply = {
        role: 'assistant',
        content: res.reply || t('Sorry, could not answer that.'),
        at: Date.now(),
        spoken: viaVoice && autoSpeak,
      };
      const merged = [...next, reply];
      setMessages(merged);
      if (reply.spoken) speak(reply.content, merged.length - 1);
    } catch {
      setMessages([...next, { role: 'assistant', content: t('Assistant is unavailable right now. Check your connection and try again.'), at: Date.now() }]);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  const toggleMic = () => {
    if (!Recognition) {
      setVoiceError(t('Voice input needs Chrome or Edge (Web Speech API).'));
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    setVoiceError('');
    stopSpeaking();
    const rec = new Recognition();
    rec.lang = speechLocale;
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    rec.onresult = (event) => {
      let text = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        text += event.results[i][0].transcript;
      }
      transcriptRef.current = text.trim();
      setInput(transcriptRef.current);
    };
    rec.onerror = (event) => {
      setListening(false);
      setVoiceError(
        event.error === 'not-allowed' || event.error === 'service-not-allowed'
          ? t('Microphone permission was blocked. Allow it in the browser to ask by voice.')
          : t('Could not hear that clearly — try again.')
      );
    };
    rec.onend = () => {
      setListening(false);
      const asked = transcriptRef.current;
      transcriptRef.current = '';
      if (asked) send(asked, true);
    };
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  };

  const reset = () => {
    stopSpeaking();
    setMessages([]);
    localStorage.removeItem(historyKey());
  };

  const changeLang = (next) => {
    stopSpeaking();
    setSuggestions([]);
    setLang(next);
    reloadSuggestions(next);
  };

  const panelDir = dir;
  const voiceHint = useMemo(() => (listening ? t('Listening... speak now') : t('Ask by voice')), [listening, t]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? t('Close assistant') : t('Open ConstructOps assistant')}
        className={`assistant-fab ${listening ? 'assistant-fab-live' : ''}`}
      >
        {open ? <X size={24} /> : listening ? <Mic size={24} /> : <MessageCircle size={24} />}
      </button>

      {open && (
        <div className="assistant-panel" role="dialog" aria-label={t('ConstructOps Assistant')} dir={panelDir}>
          {/* Header */}
          <div className="assistant-header">
            <div className="assistant-header-icon">
              <HardHat size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="assistant-title">ConstructOps Assistant</div>
              <div className="assistant-subtitle">
                {busy ? t('Thinking...') : t('Answers from your own workspace')}
              </div>
            </div>
            <select
              className="assistant-lang"
              value={lang}
              onChange={(e) => changeLang(e.target.value)}
              aria-label={t('Assistant language')}
              title={t('Assistant language')}
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => { setAutoSpeak((v) => !v); if (autoSpeak) stopSpeaking(); }}
              className={`assistant-icon-btn ${autoSpeak ? 'assistant-icon-on' : ''}`}
              aria-label={autoSpeak ? t('Turn voice replies off') : t('Turn voice replies on')}
              title={autoSpeak ? t('Voice replies on') : t('Voice replies off')}
            >
              {autoSpeak ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            <button type="button" onClick={reset} className="assistant-icon-btn" aria-label={t('Clear conversation')} title={t('Clear conversation')}>
              <RotateCcw size={16} />
            </button>
            <button type="button" onClick={() => setOpen(false)} className="assistant-icon-btn" aria-label={t('Close')}>
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="assistant-body">
            {messages.length === 0 ? (
              <div className="assistant-empty">
                <div className="assistant-empty-icon"><Sparkles size={26} /></div>
                <h4>{t('What would you like to know?')}</h4>
                <p>{t('I answer only from your own company data — budgets, approvals, alerts, workers and billing. Try:')}</p>
                <div>
                  {suggestions.map((s) => (
                    <button key={s} type="button" onClick={() => send(s)} className="assistant-chip">
                      {s}
                    </button>
                  ))}
                </div>
                <p className="assistant-voice-note">
                  {Recognition ? t('Tip: press the mic to ask by voice — I will reply out loud.') : t('Voice input is not supported in this browser; typing works fully.')}
                </p>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={`assistant-row ${m.role === 'user' ? 'assistant-row-user' : ''}`}>
                  {m.role !== 'user' && <div className="assistant-avatar-co"><HardHat size={13} /></div>}
                  <div className={`assistant-bubble ${m.role === 'user' ? 'assistant-bubble-user' : ''}`}>
                    {m.role === 'user' ? m.content : renderRichText(m.content)}
                    <div className="assistant-meta">
                      <span>{clockTime(m.at || Date.now(), locale)}</span>
                      {m.role === 'user' && m.voice && <span>· {t('voice')}</span>}
                      {m.role !== 'user' && canSpeak && (
                        <button
                          type="button"
                          className="assistant-play"
                          onClick={() => (speakingId === i ? stopSpeaking() : speak(m.content, i))}
                          aria-label={t('Read aloud')}
                          title={t('Read aloud')}
                        >
                          <Play size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                  {m.role === 'user' && <div className="assistant-avatar-me">{t('You')}</div>}
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

          {voiceError && <div className="assistant-voice-error">{voiceError}</div>}

          {/* Composer */}
          <div className="assistant-composer">
            <button
              type="button"
              onClick={toggleMic}
              className={`assistant-mic ${listening ? 'assistant-mic-live' : ''}`}
              disabled={busy}
              aria-label={voiceHint}
              title={voiceHint}
            >
              {listening ? <Mic size={18} /> : <MicOff size={18} />}
            </button>
            <input
              ref={inputRef}
              className="form-control"
              placeholder={listening ? t('Listening...') : t('Type your question... (press Enter)')}
              value={input}
              maxLength={1000}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              disabled={busy || listening}
            />
            <button type="button" onClick={() => send()} disabled={busy || listening || !input.trim()} className="assistant-send" aria-label={t('Send message')}>
              <Send size={18} />
            </button>
          </div>

          <div className="assistant-footnote">
            {t('Your data stays inside your own company — no other company is ever shown.')}
          </div>
        </div>
      )}
    </>
  );
};

export default AssistantChat;
