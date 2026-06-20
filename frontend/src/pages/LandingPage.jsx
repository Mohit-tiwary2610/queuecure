import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stethoscope, Users, Activity, Clock, Shield, Wifi, Search, X, AlertTriangle, Heart } from 'lucide-react';
import { useSocket } from '../hooks/useSocket.jsx';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export default function LandingPage() {
  const navigate = useNavigate();
  const { connected, clinicState } = useSocket();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
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

  return (
    <div className="page-wrapper">
      {/* Ambient background */}
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, overflow:'hidden' }}>
        <div style={{ position:'absolute', top:'-10%', left:'30%', width:600, height:600, background:'radial-gradient(ellipse, rgba(0,212,170,0.04) 0%, transparent 65%)', borderRadius:'50%' }} />
        <div style={{ position:'absolute', bottom:'10%', right:'20%', width:400, height:400, background:'radial-gradient(ellipse, rgba(59,130,246,0.04) 0%, transparent 65%)', borderRadius:'50%' }} />
      </div>

      {/* Header */}
      <header style={{ position:'sticky', top:0, zIndex:100, padding:'16px 40px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid var(--border-subtle)', background:'rgba(8,12,24,0.9)', backdropFilter:'blur(16px)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:38, height:38, background:'linear-gradient(135deg,var(--accent-teal),var(--accent-blue))', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Activity size={20} color="#060A14" strokeWidth={2.5} />
          </div>
          <span style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:20 }}>
            Queue<span style={{ color:'var(--accent-teal)' }}>Cure</span>
          </span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {connected ? <><span className="live-dot"/><span style={{ fontSize:12, color:'var(--accent-green)', fontWeight:600 }}>Live</span></> : <><span style={{ width:7, height:7, background:'var(--accent-red)', borderRadius:'50%', display:'inline-block' }}/><span style={{ fontSize:12, color:'var(--accent-red)' }}>Offline</span></>}
        </div>
      </header>

      <main style={{ position:'relative', zIndex:1 }}>
        {/* Hero */}
        <section style={{ textAlign:'center', padding:'80px 24px 60px' }}>
          <div className="badge badge-teal" style={{ marginBottom:24, display:'inline-flex', gap:6 }}>
            <span className="live-dot" style={{ width:6, height:6 }} /> Real-time Queue Management
          </div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:'clamp(42px,6vw,78px)', fontWeight:800, lineHeight:1.05, marginBottom:20, letterSpacing:'-1.5px' }}>
            No more paper slips.<br />
            <span style={{ background:'linear-gradient(135deg,var(--accent-teal),var(--accent-blue))', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>No more shouting.</span>
          </h1>
          <p style={{ fontSize:18, color:'var(--text-secondary)', maxWidth:580, margin:'0 auto 48px', lineHeight:1.75 }}>
            QueueCure digitizes your clinic's waiting room with real-time token updates, AI assistance, and smart priority queuing.
          </p>

          {/* Role Cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:16, maxWidth:680, margin:'0 auto 48px' }}>
            <RoleCard icon={<Stethoscope size={26}/>} title="Receptionist" desc="Manage queue, add patients, call tokens" color="var(--accent-teal)" dim="var(--accent-teal-dim)" onClick={() => navigate('/receptionist')} />
            <RoleCard icon={<Users size={26}/>} title="Patient Display" desc="Live waiting room with token announcements" color="var(--accent-blue)" dim="var(--accent-blue-dim)" onClick={() => navigate('/patient')} />
          </div>

          {/* Live Stats Pills */}
          {connected && (
            <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap', marginBottom:48 }}>
              <Pill label="Waiting" value={clinicState.stats?.totalWaiting ?? 0} color="var(--accent-teal)" />
              <Pill label="Served Today" value={clinicState.totalServed} color="var(--accent-blue)" />
              <Pill label="Avg Time" value={`${clinicState.avgConsultationTime}m`} color="var(--accent-amber)" />
              <Pill label="Status" value={clinicState.clinicOpen ? 'Open' : 'Closed'} color={clinicState.clinicOpen ? 'var(--accent-green)' : 'var(--accent-red)'} />
            </div>
          )}
        </section>

        {/* Patient Token Search */}
        <section style={{ maxWidth:560, margin:'0 auto', padding:'0 24px 64px' }}>
          <div className="card" style={{ padding:28 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
              <Search size={18} color="var(--accent-teal)" />
              <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:16 }}>Find Your Token</span>
            </div>
            <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:20 }}>Enter your name or phone number to check your queue position</p>
            <form onSubmit={handleSearch} style={{ display:'flex', gap:10 }}>
              <input className="input" placeholder="Your name or phone number..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setSearchResult(null); }} style={{ flex:1 }} />
              <button type="submit" disabled={searching || !searchQuery.trim()} className="btn btn-primary">
                {searching ? <div style={{ width:14, height:14, border:'2px solid #060A14', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.7s linear infinite' }}/> : <Search size={15} />}
              </button>
              {searchResult && <button type="button" onClick={() => { setSearchResult(null); setSearchQuery(''); }} className="btn btn-secondary"><X size={14} /></button>}
            </form>

            {searchResult && (
              <div className="animate-slide-up" style={{ marginTop:16 }}>
                {searchResult.found ? (
                  searchResult.results.map(p => (
                    <div key={p.id} style={{ background:'var(--bg-secondary)', border:'1px solid var(--border-accent)', borderRadius:'var(--radius-md)', padding:16, marginBottom:8 }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                        <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:28, color:'var(--accent-teal)' }}>Token #{p.tokenNumber}</div>
                        <div style={{ textAlign:'right' }}>
                          <div style={{ fontSize:11, color:'var(--text-muted)' }}>Queue Position</div>
                          <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:22, color:'var(--text-primary)' }}>#{p.position}</div>
                        </div>
                      </div>
                      <div style={{ fontWeight:600, marginBottom:4 }}>{p.name}</div>
                      <div style={{ display:'flex', gap:12, fontSize:13 }}>
                        <span style={{ color:'var(--text-muted)' }}>Est. wait:</span>
                        <span style={{ color: p.estimatedWait === 0 ? 'var(--accent-teal)' : 'var(--text-primary)', fontWeight:700 }}>
                          {p.estimatedWait === 0 ? '🎉 You\'re next!' : `~${p.estimatedWait} minutes`}
                        </span>
                      </div>
                      {p.estimatedCallTime && (
                        <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:4 }}>
                          Expected at: ~{new Date(p.estimatedCallTime).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}
                        </div>
                      )}
                      {p.priority !== 'normal' && (
                        <div style={{ marginTop:8 }}>
                          {p.priority === 'urgent' && <span className="badge badge-red"><AlertTriangle size={9}/> Urgent</span>}
                          {p.priority === 'elderly' && <span className="badge badge-purple"><Heart size={9}/> Special Care</span>}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div style={{ background:'var(--bg-secondary)', border:'1px solid var(--border-card)', borderRadius:'var(--radius-md)', padding:16, textAlign:'center', color:'var(--text-muted)', fontSize:14 }}>
                    {searchResult.error ? 'Connection error. Please try again.' : 'No patient found in current queue. You may not be registered yet.'}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Features */}
        <section style={{ borderTop:'1px solid var(--border-subtle)', padding:'24px 40px', display:'flex', gap:32, justifyContent:'center', flexWrap:'wrap' }}>
          {[['Live WebSocket sync','var(--accent-teal)',<Wifi size={14}/>],['Dynamic wait time','var(--accent-blue)',<Clock size={14}/>],['Priority queuing','var(--accent-purple)',<Shield size={14}/>],['AI assistant','var(--accent-amber)',<Activity size={14}/>]].map(([t, c, i]) => (
            <div key={t} style={{ display:'flex', alignItems:'center', gap:7, color:'var(--text-muted)', fontSize:13 }}>
              <span style={{ color:c }}>{i}</span>{t}
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

function RoleCard({ icon, title, desc, color, dim, onClick }) {
  return (
    <button onClick={onClick} style={{ background:'var(--bg-card)', border:'1px solid var(--border-card)', borderRadius:'var(--radius-xl)', padding:'28px 24px', cursor:'pointer', textAlign:'left', display:'flex', flexDirection:'column', gap:14, transition:'all .2s', width:'100%' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor=color; e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow=`0 8px 32px ${dim}`; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border-card)'; e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='none'; }}>
      <div style={{ width:50, height:50, background:dim, borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', color }}>{icon}</div>
      <div>
        <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:17, marginBottom:5, color:'var(--text-primary)' }}>{title}</div>
        <div style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.5 }}>{desc}</div>
      </div>
      <span style={{ color, fontSize:13, fontWeight:600 }}>Open dashboard →</span>
    </button>
  );
}

function Pill({ label, value, color }) {
  return (
    <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-card)', borderRadius:100, padding:'7px 18px', display:'flex', alignItems:'center', gap:8 }}>
      <span style={{ fontSize:12, color:'var(--text-muted)' }}>{label}</span>
      <span style={{ fontSize:14, fontWeight:800, color, fontFamily:'var(--font-display)' }}>{value}</span>
    </div>
  );
}
