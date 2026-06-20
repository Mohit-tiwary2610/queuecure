import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Minimize2, Loader, Sparkles } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

const SUGGESTED = [
  'How many patients are waiting?',
  'What is the current wait time?',
  'Who is being served now?',
  'Is the clinic open?',
  'How many patients served today?',
];

export default function AIChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm your QueueCure AI assistant 🏥\nAsk me about wait times, queue status, or anything about the clinic!" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [open]);

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    const userMsg = { role: 'user', content: msg };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    try {
      const history = newMessages.slice(1).slice(-8).map(m => ({ role: m.role, content: m.content }));
      const res = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, conversationHistory: history.slice(0, -1) })
      });
      const data = await res.json();
      const reply = data.reply || 'Sorry, I could not respond.';
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      if (!open) setUnread(u => u + 1);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 200, width: 54, height: 54, background: 'linear-gradient(135deg,var(--accent-teal),var(--accent-blue))', border: 'none', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 24px var(--accent-teal-glow)', transition: 'all .2s', color: '#060A14' }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
        {!open && unread > 0 && (
          <div style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, background: 'var(--accent-red)', borderRadius: '50%', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>{unread}</div>
        )}
      </button>

      {/* Chat Panel */}
      {open && (
        <div className="animate-scale-in" style={{ position: 'fixed', bottom: 88, right: 24, zIndex: 200, width: 370, maxHeight: 540, background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: 'var(--radius-xl)', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,.6)', overflow: 'hidden' }}>

          {/* Header */}
          <div style={{ padding: '14px 18px', background: 'linear-gradient(135deg,rgba(0,212,170,.1),rgba(59,130,246,.06))', borderBottom: '1px solid var(--border-card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, background: 'var(--accent-teal-dim)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <Bot size={18} color="var(--accent-teal)" />
                <div style={{ position: 'absolute', bottom: 1, right: 1, width: 8, height: 8, background: 'var(--accent-green)', borderRadius: '50%', border: '1.5px solid var(--bg-card)' }} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                  QueueCure AI <Sparkles size={12} color="var(--accent-amber)" />
                </div>
                <div style={{ fontSize: 11, color: 'var(--accent-green)' }}>● Online</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}><Minimize2 size={15} /></button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-start' }} className="animate-fade-in">
                <div style={{ width: 28, height: 28, minWidth: 28, borderRadius: '50%', background: msg.role === 'user' ? 'var(--accent-blue-dim)' : 'var(--accent-teal-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {msg.role === 'user' ? <User size={13} color="var(--accent-blue)" /> : <Bot size={13} color="var(--accent-teal)" />}
                </div>
                <div style={{ maxWidth: '80%', padding: '9px 13px', borderRadius: msg.role === 'user' ? '14px 4px 14px 14px' : '4px 14px 14px 14px', background: msg.role === 'user' ? 'var(--accent-blue-dim)' : 'var(--bg-secondary)', border: `1px solid ${msg.role === 'user' ? 'rgba(59,130,246,.15)' : 'var(--border-subtle)'}`, fontSize: 13, lineHeight: 1.6, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-teal-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Bot size={13} color="var(--accent-teal)" /></div>
                <div style={{ padding: '10px 14px', borderRadius: '4px 14px 14px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', display: 'flex', gap: 4, alignItems: 'center' }}>
                  {[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-teal)', animation: `pulse-dot 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions */}
          {messages.length <= 2 && (
            <div style={{ padding: '0 14px 8px', display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {SUGGESTED.map(s => (
                <button key={s} onClick={() => sendMessage(s)}
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-card)', borderRadius: 100, padding: '4px 11px', fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-teal)'; e.currentTarget.style.color = 'var(--accent-teal)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-card)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border-card)', display: 'flex', gap: 8 }}>
            <input ref={inputRef} className="input" style={{ flex: 1, padding: '9px 13px', fontSize: 13 }} placeholder="Ask about the queue..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey} disabled={loading} />
            <button onClick={() => sendMessage()} disabled={!input.trim() || loading} className="btn btn-primary" style={{ padding: '9px 13px', minWidth: 'auto' }}>
              {loading ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
