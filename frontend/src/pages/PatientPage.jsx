import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Users, AlertTriangle, Heart, WifiOff, Volume2, Search, X } from 'lucide-react';
import { useSocket } from '../hooks/useSocket.jsx';
import AIChatbot from '../components/AIChatbot.jsx';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export default function PatientPage() {
  const navigate = useNavigate();
  const { connected, clinicState, lastCalledToken } = useSocket();
  const [showAnnounce, setShowAnnounce] = useState(false);
  const [announcedToken, setAnnouncedToken] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const tickerRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Token announcement + voice
  useEffect(() => {
    if (!lastCalledToken) return;
    setAnnouncedToken(lastCalledToken);
    setShowAnnounce(true);

    // Chime
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [[523, 0], [659, 0.18], [784, 0.36], [1047, 0.54]].forEach(([freq, delay]) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = freq; osc.type = 'sine';
        gain.gain.setValueAtTime(0.35, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.4);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.4);
      });
    } catch {}

    // Voice
    try {
      window.speechSynthesis?.cancel();
      const u = new SpeechSynthesisUtterance(
        `Attention please. Token number ${lastCalledToken.tokenNumber}, ${lastCalledToken.name}, please proceed to the doctor's room.`
      );
      u.rate = 0.85; u.pitch = 1;
      const voices = window.speechSynthesis?.getVoices() || [];
      const v = voices.find(v => v.lang.startsWith('en') && v.name.includes('Female')) || voices.find(v => v.lang.startsWith('en'));
      if (v) u.voice = v;
      window.speechSynthesis?.speak(u);
    } catch {}

    const t = setTimeout(() => setShowAnnounce(false), 10000);
    return () => clearTimeout(t);
  }, [lastCalledToken]);

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/lookup?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResult(data);
    } catch {
      setSearchResult({ found: false, error: true });
    } finally {
      setSearching(false);
    }
  };

  const waitingPatients = (clinicState.queue || []).filter(p => p.status === 'waiting');

  return (
    <div className="page-wrapper" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Token Announcement Overlay */}
      {showAnnounce && announcedToken && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }} className="animate-fade-in">
          <div style={{ textAlign: 'center', animation: 'token-pop .5s cubic-bezier(.34,1.56,.64,1) forwards', padding: '0 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 20 }}>
              <Volume2 size={22} color="var(--accent-teal)" />
              <span style={{ fontSize: 16, color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 2 }}>Now Calling</span>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(80px,16vw,160px)', fontWeight: 800, lineHeight: 1, background: 'linear-gradient(135deg,var(--accent-teal),var(--accent-blue))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', marginBottom: 16 }}>
              #{announcedToken.tokenNumber}
            </div>
            <div style={{ fontSize: 'clamp(20px,4vw,32px)', fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)' }}>
              {announcedToken.name}
            </div>
            {announcedToken.priority === 'urgent' && <span className="badge badge-red" style={{ fontSize: 14, padding: '6px 18px', marginBottom: 20, display: 'inline-flex' }}><AlertTriangle size={13} /> Urgent</span>}
            {announcedToken.priority === 'elderly' && <span className="badge badge-purple" style={{ fontSize: 14, padding: '6px 18px', marginBottom: 20, display: 'inline-flex' }}><Heart size={13} /> Special Care</span>}
            <div style={{ marginTop: 24, padding: '12px 28px', background: 'var(--accent-teal-dim)', border: '1px solid rgba(0,212,170,.2)', borderRadius: 100, display: 'inline-block' }}>
              <span style={{ color: 'var(--accent-teal)', fontWeight: 600, fontSize: 15 }}>Please proceed to the Doctor's Room →</span>
            </div>
            <div style={{ marginTop: 32 }}>
              <button onClick={() => setShowAnnounce(false)} className="btn btn-secondary">Dismiss</button>
            </div>
          </div>
        </div>
      )}

      {/* Ticker */}
      {clinicState.announcements?.length > 0 && (
        <div className="ticker-wrap">
          <div className="ticker-track" ref={tickerRef}>
            {[...clinicState.announcements, ...clinicState.announcements].map((a, i) => (
              <span key={i} className="ticker-item">
                <span style={{ color: a.type === 'called' ? 'var(--accent-teal)' : 'var(--accent-blue)' }}>●</span>
                {a.type === 'called' ? `NOW SERVING: Token #${a.token} — ${a.name}` :
                  a.type === 'added' ? `New patient registered: ${a.name} (Token #${a.token})` : a.text}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <header style={{ padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(8,12,24,0.95)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={() => navigate('/')} className="btn btn-secondary btn-sm"><ArrowLeft size={14} /> Back</button>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>Patient Waiting Room</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => { setShowSearch(s => !s); setSearchResult(null); setSearchQuery(''); }} className={`btn btn-sm ${showSearch ? 'btn-primary' : 'btn-secondary'}`}>
            <Search size={13} /> Find My Token
          </button>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--text-secondary)' }}>
            {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          {connected
            ? <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span className="live-dot" /><span style={{ fontSize: 12, color: 'var(--accent-green)', fontWeight: 600 }}>Live</span></div>
            : <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><WifiOff size={12} color="var(--accent-red)" /><span style={{ fontSize: 12, color: 'var(--accent-red)' }}>Reconnecting…</span></div>}
        </div>
      </header>

      {/* Token Search Panel */}
      {showSearch && (
        <div className="animate-slide-down" style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-card)', padding: '16px 24px' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, maxWidth: 480 }}>
            <input className="input" placeholder="Enter your name or phone number..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setSearchResult(null); }} style={{ flex: 1 }} autoFocus />
            <button type="submit" disabled={searching || !searchQuery.trim()} className="btn btn-primary btn-sm">
              {searching ? <div style={{ width: 13, height: 13, border: '2px solid #060A14', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .7s linear infinite' }} /> : <Search size={13} />}
            </button>
            <button type="button" onClick={() => { setShowSearch(false); setSearchResult(null); setSearchQuery(''); }} className="btn btn-secondary btn-sm"><X size={13} /></button>
          </form>
          {searchResult && (
            <div className="animate-slide-up" style={{ marginTop: 12, maxWidth: 480 }}>
              {searchResult.found ? searchResult.results.map(p => (
                <div key={p.id} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-accent)', borderRadius: 'var(--radius-md)', padding: '14px 18px', display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Your Token</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 32, color: 'var(--accent-teal)' }}>#{p.tokenNumber}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Queue Position</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, color: 'var(--text-primary)' }}>#{p.position}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Est. Wait</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: p.estimatedWait === 0 ? 'var(--accent-teal)' : 'var(--accent-amber)' }}>
                      {p.estimatedWait === 0 ? '🎉 Next!' : `~${p.estimatedWait}m`}
                    </div>
                  </div>
                  {p.estimatedCallTime && (
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Expected At</div>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{new Date(p.estimatedCallTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  )}
                </div>
              )) : (
                <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '10px 0' }}>
                  {searchResult.error ? 'Connection error. Try again.' : 'Not found in current queue.'}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Clinic closed banner */}
      {!clinicState.clinicOpen && (
        <div style={{ background: 'var(--accent-red-dim)', borderBottom: '1px solid rgba(239,68,68,.2)', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertTriangle size={16} color="var(--accent-red)" />
          <span style={{ fontSize: 14, color: 'var(--accent-red)', fontWeight: 600 }}>Clinic is currently closed. No new patients being accepted.</span>
        </div>
      )}

      {/* Main content */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 0 }}>

        {/* LEFT — Now Serving */}
        <div style={{ padding: 32, borderRight: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{
            flex: 1,
            background: clinicState.currentToken ? 'linear-gradient(135deg,rgba(0,212,170,.07),rgba(59,130,246,.04))' : 'var(--bg-card)',
            border: `1px solid ${clinicState.currentToken ? 'rgba(0,212,170,.35)' : 'var(--border-card)'}`,
            borderRadius: 'var(--radius-2xl)', padding: '48px 36px',
            textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            animation: clinicState.currentToken ? 'glow-pulse 3s ease-in-out infinite' : 'none',
            minHeight: 320
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 3, color: 'var(--text-muted)', marginBottom: 20 }}>NOW SERVING</div>
            {clinicState.currentToken ? (
              <>
                <div className="token-number" style={{ fontSize: 'clamp(64px,10vw,120px)', marginBottom: 16 }}>#{clinicState.currentToken.tokenNumber}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(18px,3vw,28px)', marginBottom: 12 }}>{clinicState.currentToken.name}</div>
                {clinicState.currentToken.priority === 'urgent' && <span className="badge badge-red" style={{ marginBottom: 12 }}><AlertTriangle size={10} /> Urgent</span>}
                {clinicState.currentToken.priority === 'elderly' && <span className="badge badge-purple" style={{ marginBottom: 12 }}><Heart size={10} /> Special Care</span>}
                <div style={{ marginTop: 20, padding: '10px 24px', background: 'var(--accent-teal-dim)', border: '1px solid rgba(0,212,170,.15)', borderRadius: 100 }}>
                  <span style={{ color: 'var(--accent-teal)', fontSize: 13, fontWeight: 600 }}>Please proceed to Doctor's Room</span>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 52, marginBottom: 16 }}>🏥</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  {waitingPatients.length > 0 ? 'Waiting for call…' : 'Queue is clear!'}
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                  {waitingPatients.length > 0 ? 'The receptionist will call you shortly' : 'All patients have been seen today 🎉'}
                </div>
              </>
            )}
          </div>

          {/* Mini Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            {[
              { label: 'Waiting', value: waitingPatients.length, color: 'var(--accent-teal)' },
              { label: 'Avg Time', value: `${clinicState.avgConsultationTime}m`, color: 'var(--accent-blue)' },
              { label: 'Served', value: clinicState.totalServed, color: 'var(--accent-green)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: 'var(--radius-md)', padding: '14px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24, color, marginBottom: 4 }}>{value}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.5px' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — Queue List */}
        <div style={{ padding: 32, overflowY: 'auto', maxHeight: 'calc(100vh - 130px)', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20 }}>Upcoming Queue</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Users size={13} color="var(--text-muted)" />
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{waitingPatients.length} patients</span>
            </div>
          </div>

          {waitingPatients.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', textAlign: 'center', padding: 48 }}>
              <div style={{ fontSize: 48, marginBottom: 14 }}>✅</div>
              <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 6 }}>All clear!</div>
              <div style={{ fontSize: 14 }}>No patients currently waiting</div>
            </div>
          ) : (
            waitingPatients.map((patient, index) => {
              const waitMins = index * clinicState.avgConsultationTime;
              const isNext = index === 0;
              return (
                <div key={patient.id} className="animate-slide-up" style={{
                  background: isNext ? 'linear-gradient(135deg,rgba(0,212,170,.07),rgba(59,130,246,.04))' : 'var(--bg-card)',
                  border: `1px solid ${isNext ? 'rgba(0,212,170,.3)' : patient.priority === 'urgent' ? 'rgba(239,68,68,.2)' : 'var(--border-card)'}`,
                  borderRadius: 'var(--radius-lg)', padding: '16px 20px',
                  display: 'flex', alignItems: 'center', gap: 16,
                  borderLeft: patient.priority === 'urgent' ? '3px solid var(--accent-red)' : patient.priority === 'elderly' ? '3px solid var(--accent-purple)' : undefined
                }}>
                  <div style={{ minWidth: 36, height: 36, background: isNext ? 'var(--accent-teal-dim)' : 'var(--bg-secondary)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: isNext ? 'var(--accent-teal)' : 'var(--text-muted)' }}>
                    {index + 1}
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: isNext ? 'var(--accent-teal)' : 'var(--text-secondary)', minWidth: 54 }}>
                    #{patient.tokenNumber}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                      {patient.name}
                      {patient.priority === 'urgent' && <span className="badge badge-red" style={{ fontSize: 9 }}><AlertTriangle size={8} /> Urgent</span>}
                      {patient.priority === 'elderly' && <span className="badge badge-purple" style={{ fontSize: 9 }}><Heart size={8} /> Special</span>}
                    </div>
                    {isNext && <div style={{ fontSize: 12, color: 'var(--accent-teal)', fontWeight: 600, marginTop: 2 }}>You're next! Get ready →</div>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'flex-end', marginBottom: 2 }}>
                      <Clock size={10} color="var(--text-muted)" />
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Est. wait</span>
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: waitMins === 0 ? 'var(--accent-teal)' : waitMins > 30 ? 'var(--accent-amber)' : 'var(--text-primary)' }}>
                      {waitMins === 0 ? 'Next' : `~${waitMins}m`}
                    </div>
                    {patient.estimatedCallTime && (
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        ~{new Date(patient.estimatedCallTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <AIChatbot />
    </div>
  );
}
