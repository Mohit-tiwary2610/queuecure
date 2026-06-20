import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft, UserPlus, ChevronRight, SkipForward, Trash2, Clock, Users,
  Activity, AlertTriangle, Heart, RefreshCw, Power, Settings, CheckCircle,
  WifiOff, BarChart2, Stethoscope, Volume2, VolumeX, MessageSquare
} from 'lucide-react';
import { useSocket } from '../hooks/useSocket.jsx';
import AIChatbot from '../components/AIChatbot.jsx';
import AnalyticsDashboard from '../components/AnalyticsDashboard.jsx';

const PRIORITY_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'urgent', label: '🚨 Urgent' },
  { value: 'elderly', label: '💜 Elderly / Special' },
];

export default function ReceptionistPage() {
  const navigate = useNavigate();
  const { connected, clinicState, emit } = useSocket();
  const [form, setForm] = useState({ name: '', phone: '', priority: 'normal', notes: '' });
  const [loading, setLoading] = useState('');
  const [activeTab, setActiveTab] = useState('queue'); // 'queue' | 'analytics'
  const [showSettings, setShowSettings] = useState(false);
  const [avgTimeInput, setAvgTimeInput] = useState('');
  const [showReset, setShowReset] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [announcementText, setAnnouncementText] = useState('');

  const waitingPatients = (clinicState.queue || []).filter(p => p.status === 'waiting');

  // Voice announcements
  const speak = useCallback((text) => {
    if (!voiceEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9; utterance.pitch = 1; utterance.volume = 1;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.lang.startsWith('en') && v.name.includes('Female')) || voices.find(v => v.lang.startsWith('en')) || voices[0];
    if (preferred) utterance.voice = preferred;
    window.speechSynthesis.speak(utterance);
  }, [voiceEnabled]);

  const handleAddPatient = useCallback(async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Patient name required');
    if (!clinicState.clinicOpen) return toast.error('Clinic is closed');
    setLoading('add');
    const res = await emit('add_patient', form);
    setLoading('');
    if (res.error) { toast.error(res.error); return; }
    toast.success(`Token #${res.patient.tokenNumber} — ${res.patient.name}`);
    speak(`Token number ${res.patient.tokenNumber} issued to ${res.patient.name}`);
    setForm({ name: '', phone: '', priority: 'normal', notes: '' });
  }, [form, clinicState.clinicOpen, emit, speak]);

  const handleCallNext = useCallback(async () => {
    setLoading('next');
    const res = await emit('call_next');
    setLoading('');
    if (res.error) { toast.error(res.error); return; }
    if (res.currentToken) {
      toast.success(`🔔 Token #${res.currentToken.tokenNumber} — ${res.currentToken.name}`, { duration: 4000 });
      speak(`Token number ${res.currentToken.tokenNumber}, ${res.currentToken.name}, please proceed to the doctor's room.`);
    } else {
      toast('Queue is empty — all done!', { icon: '🎉' });
      speak('The queue is now empty. All patients have been served.');
    }
  }, [emit, speak]);

  const handleSkip = useCallback(async (patientId, name) => {
    const res = await emit('skip_patient', { patientId });
    if (res.error) toast.error(res.error);
    else toast(`Skipped ${name}`, { icon: '⏭️' });
  }, [emit]);

  const handleRemove = useCallback(async (patientId, name) => {
    const res = await emit('remove_patient', { patientId });
    if (res.error) toast.error(res.error);
    else toast.success(`Removed ${name}`);
  }, [emit]);

  const handleUpdateAvgTime = useCallback(async () => {
    const mins = parseInt(avgTimeInput);
    if (isNaN(mins) || mins < 1) return toast.error('Enter valid minutes');
    const res = await emit('update_avg_time', { minutes: mins });
    if (res.error) toast.error(res.error);
    else { toast.success(`Avg time set to ${mins} min`); setAvgTimeInput(''); setShowSettings(false); }
  }, [avgTimeInput, emit]);

  const handleToggleClinic = useCallback(async () => {
    const res = await emit('toggle_clinic');
    if (res.clinicOpen !== undefined) {
      toast.success(`Clinic is now ${res.clinicOpen ? 'OPEN' : 'CLOSED'}`);
      speak(`The clinic is now ${res.clinicOpen ? 'open' : 'closed'}.`);
    }
  }, [emit, speak]);

  const handleReset = useCallback(async () => {
    const res = await emit('reset_queue');
    if (!res.error) { toast.success('Queue reset'); setShowReset(false); }
  }, [emit]);

  const handleCompleteCurrent = useCallback(async () => {
    const res = await emit('complete_current');
    if (res.error) toast.error(res.error);
    else toast.success('Consultation complete');
  }, [emit]);

  const handleAnnouncement = useCallback(async (e) => {
    e.preventDefault();
    if (!announcementText.trim()) return;
    await emit('add_announcement', { text: announcementText });
    speak(announcementText);
    toast.success('Announcement sent');
    setAnnouncementText('');
  }, [announcementText, emit, speak]);

  return (
    <div className="page-wrapper">
      {/* Ticker */}
      {clinicState.announcements?.length > 0 && (
        <div className="ticker-wrap">
          <div className="ticker-track">
            {[...clinicState.announcements, ...clinicState.announcements].map((a, i) => (
              <span key={i} className="ticker-item">
                <span style={{ color: a.type === 'called' ? 'var(--accent-teal)' : a.type === 'added' ? 'var(--accent-blue)' : 'var(--accent-amber)' }}>●</span>
                {a.type === 'called' ? `NOW SERVING: Token #${a.token} — ${a.name}` :
                  a.type === 'added' ? `New patient added: ${a.name} (Token #${a.token})` :
                  a.text}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Nav */}
      <nav style={{ padding:'14px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid var(--border-subtle)', background:'var(--bg-secondary)', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <button onClick={() => navigate('/')} className="btn btn-secondary btn-sm"><ArrowLeft size={14}/> Back</button>
          <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:16 }}>Receptionist Dashboard</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {connected ? <div style={{ display:'flex', alignItems:'center', gap:5 }}><span className="live-dot"/><span style={{ fontSize:12, color:'var(--accent-green)', fontWeight:600 }}>Live</span></div> : <div style={{ display:'flex', alignItems:'center', gap:5 }}><WifiOff size={12} color="var(--accent-red)"/><span style={{ fontSize:12, color:'var(--accent-red)' }}>Offline</span></div>}
          <button onClick={() => setVoiceEnabled(v => !v)} className={`btn btn-sm ${voiceEnabled ? 'btn-secondary' : 'btn-amber'}`} title="Toggle voice">
            {voiceEnabled ? <Volume2 size={13}/> : <VolumeX size={13}/>}
          </button>
          <button onClick={() => navigate('/doctor')} className="btn btn-blue btn-sm"><Stethoscope size={13}/> Doctor View</button>
          <button onClick={handleToggleClinic} className={`btn btn-sm ${clinicState.clinicOpen ? 'btn-danger' : 'btn-primary'}`}><Power size={13}/>{clinicState.clinicOpen ? 'Close Clinic' : 'Open Clinic'}</button>
          <button onClick={() => setShowSettings(s => !s)} className="btn btn-secondary btn-sm"><Settings size={13}/></button>
          <button onClick={() => setShowReset(true)} className="btn btn-sm btn-amber"><RefreshCw size={13}/> Reset</button>
        </div>
      </nav>

      {/* Settings Panel */}
      {showSettings && (
        <div className="animate-slide-down" style={{ background:'var(--bg-card)', borderBottom:'1px solid var(--border-card)', padding:'14px 24px', display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Clock size={14} color="var(--accent-teal)"/>
            <span style={{ fontSize:13, color:'var(--text-secondary)' }}>Avg consultation: <strong style={{ color:'var(--accent-teal)' }}>{clinicState.avgConsultationTime} min</strong></span>
            <input className="input" style={{ width:72 }} type="number" min={1} max={60} placeholder="mins" value={avgTimeInput} onChange={e => setAvgTimeInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleUpdateAvgTime()} />
            <button onClick={handleUpdateAvgTime} className="btn btn-primary btn-sm">Update</button>
          </div>
          <div style={{ height:24, width:1, background:'var(--border-card)' }}/>
          <form onSubmit={handleAnnouncement} style={{ display:'flex', alignItems:'center', gap:8 }}>
            <MessageSquare size={14} color="var(--accent-amber)"/>
            <input className="input" style={{ width:260 }} placeholder="Custom announcement..." value={announcementText} onChange={e => setAnnouncementText(e.target.value)} />
            <button type="submit" className="btn btn-amber btn-sm">Announce</button>
          </form>
          <button onClick={() => setShowSettings(false)} className="btn btn-secondary btn-sm">Close</button>
        </div>
      )}

      {/* Reset Confirm Modal */}
      {showReset && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200 }}>
          <div className="animate-scale-in" style={{ background:'var(--bg-card)', border:'1px solid var(--border-card)', borderRadius:'var(--radius-xl)', padding:32, maxWidth:400, width:'90%' }}>
            <AlertTriangle size={32} color="var(--accent-amber)" style={{ marginBottom:14 }}/>
            <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:20, marginBottom:8 }}>Reset Queue?</h3>
            <p style={{ color:'var(--text-secondary)', fontSize:14, marginBottom:24 }}>This clears all patients, analytics, and resets the counter. Cannot be undone.</p>
            <div style={{ display:'flex', gap:12 }}>
              <button onClick={handleReset} className="btn btn-danger" style={{ flex:1 }}>Reset Everything</button>
              <button onClick={() => setShowReset(false)} className="btn btn-secondary" style={{ flex:1 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="container" style={{ padding:'20px 24px', display:'grid', gridTemplateColumns:'360px 1fr', gap:24 }}>

        {/* LEFT PANEL */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <StatCard label="Waiting" value={waitingPatients.length} icon={<Users size={14}/>} color="var(--accent-teal)"/>
            <StatCard label="Served" value={clinicState.totalServed} icon={<CheckCircle size={14}/>} color="var(--accent-green)"/>
            <StatCard label="Avg Time" value={`${clinicState.avgConsultationTime}m`} icon={<Clock size={14}/>} color="var(--accent-blue)"/>
            <StatCard label="Est. Clear" value={`${clinicState.stats?.estimatedClearTime ?? 0}m`} icon={<Activity size={14}/>} color="var(--accent-amber)"/>
          </div>

          {/* Now Serving */}
          <div style={{ background: clinicState.currentToken ? 'linear-gradient(135deg,rgba(0,212,170,.08),rgba(59,130,246,.05))' : 'var(--bg-card)', border:`1px solid ${clinicState.currentToken ? 'rgba(0,212,170,.4)' : 'var(--border-card)'}`, borderRadius:'var(--radius-lg)', padding:20, animation: clinicState.currentToken ? 'glow-pulse 3s ease-in-out infinite' : 'none' }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:1.5, color:'var(--text-muted)', marginBottom:12 }}>Now Serving</div>
            {clinicState.currentToken ? (
              <div>
                <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:44, color:'var(--accent-teal)', lineHeight:1, marginBottom:6 }}>#{clinicState.currentToken.tokenNumber}</div>
                <div style={{ fontWeight:700, fontSize:16, marginBottom:4 }}>{clinicState.currentToken.name}</div>
                {clinicState.currentToken.phone && <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:6 }}>{clinicState.currentToken.phone}</div>}
                {clinicState.currentToken.notes && <div style={{ fontSize:12, color:'var(--accent-amber)', marginBottom:8 }}>📋 {clinicState.currentToken.notes}</div>}
                <PriorityBadge priority={clinicState.currentToken.priority}/>
                <button onClick={handleCompleteCurrent} className="btn btn-secondary btn-sm" style={{ marginTop:12, width:'100%', justifyContent:'center' }}>
                  <CheckCircle size={12}/> Complete (no next call)
                </button>
              </div>
            ) : (
              <div style={{ color:'var(--text-muted)', fontSize:13 }}>No patient currently being served</div>
            )}
          </div>

          {/* Call Next */}
          <button onClick={handleCallNext} disabled={loading === 'next' || waitingPatients.length === 0} className="btn btn-primary btn-lg" style={{ width:'100%', justifyContent:'center', fontSize:15 }}>
            {loading === 'next' ? 'Calling...' : <><ChevronRight size={18}/> Call Next Patient {waitingPatients.length > 0 && <span style={{ background:'rgba(0,0,0,.2)', borderRadius:100, padding:'2px 8px', fontSize:12 }}>{waitingPatients.length}</span>}</>}
          </button>

          {/* Add Patient */}
          <div className="card" style={{ padding:20 }}>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:14, marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
              <UserPlus size={15} color="var(--accent-teal)"/> Add Patient
            </div>
            <form onSubmit={handleAddPatient} style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <input className="input" placeholder="Patient full name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              <input className="input" placeholder="Phone number (optional)" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              <select className="input select" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
              <input className="input" placeholder="Doctor notes (optional)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              <button type="submit" disabled={loading === 'add' || !clinicState.clinicOpen} className="btn btn-primary" style={{ justifyContent:'center' }}>
                <UserPlus size={14}/> {loading === 'add' ? 'Adding...' : 'Add to Queue'}
              </button>
              {!clinicState.clinicOpen && <p style={{ fontSize:12, color:'var(--accent-red)', textAlign:'center' }}>Clinic closed — open it to add patients</p>}
            </form>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div>
          {/* Tab Nav */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <div className="tab-nav" style={{ maxWidth:280 }}>
              <button className={`tab-btn ${activeTab === 'queue' ? 'active' : ''}`} onClick={() => setActiveTab('queue')}>
                <Users size={13}/> Queue {waitingPatients.length > 0 && <span className="badge badge-teal" style={{ fontSize:9, padding:'1px 6px' }}>{waitingPatients.length}</span>}
              </button>
              <button className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>
                <BarChart2 size={13}/> Analytics
              </button>
            </div>
            <span style={{ fontSize:12, color:'var(--text-muted)' }}>
              {activeTab === 'queue' ? `${waitingPatients.length} waiting` : `${clinicState.analytics?.totalToday || 0} today`}
            </span>
          </div>

          {/* Queue Tab */}
          {activeTab === 'queue' && (
            waitingPatients.length === 0 ? (
              <div className="card" style={{ padding:48, textAlign:'center', color:'var(--text-muted)' }}>
                <Users size={40} style={{ marginBottom:12, opacity:.25 }}/>
                <div style={{ fontSize:16, fontWeight:600, marginBottom:4 }}>Queue is empty</div>
                <div style={{ fontSize:13 }}>Add patients using the form on the left</div>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {waitingPatients.map((patient, index) => (
                  <PatientRow
                    key={patient.id}
                    patient={patient}
                    position={index}
                    avgTime={clinicState.avgConsultationTime}
                    onSkip={() => handleSkip(patient.id, patient.name)}
                    onRemove={() => handleRemove(patient.id, patient.name)}
                  />
                ))}
                {/* Done section */}
                {(clinicState.queue || []).filter(p => p.status === 'done').length > 0 && (
                  <details style={{ marginTop:8 }}>
                    <summary style={{ cursor:'pointer', fontSize:12, color:'var(--text-muted)', padding:'6px 0', userSelect:'none' }}>
                      {(clinicState.queue || []).filter(p => p.status === 'done').length} completed patients
                    </summary>
                    <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:10 }}>
                      {(clinicState.queue || []).filter(p => p.status === 'done').map(p => (
                        <div key={p.id} style={{ background:'var(--bg-card)', border:'1px solid var(--border-subtle)', borderRadius:'var(--radius-md)', padding:'10px 16px', display:'flex', alignItems:'center', gap:12, opacity:.55 }}>
                          <span style={{ fontFamily:'var(--font-display)', fontWeight:700, color:'var(--text-muted)', minWidth:32 }}>#{p.tokenNumber}</span>
                          <span style={{ fontSize:13, flex:1 }}>{p.name}</span>
                          <CheckCircle size={13} color="var(--accent-green)"/>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <AnalyticsDashboard analytics={clinicState.analytics} clinicState={clinicState} />
          )}
        </div>
      </div>

      <AIChatbot />
    </div>
  );
}

function StatCard({ label, value, icon, color }) {
  return (
    <div className="stat-card">
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
        <span style={{ color }}>{icon}</span>
        <span style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.5px', fontWeight:600 }}>{label}</span>
      </div>
      <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:26, color }}>{value}</div>
    </div>
  );
}

function PatientRow({ patient, position, avgTime, onSkip, onRemove }) {
  const waitMins = position * avgTime;
  const isNext = position === 0;
  return (
    <div className={`animate-slide-up card p-${patient.priority}`} style={{ padding:'14px 18px', display:'flex', alignItems:'center', gap:14, background: isNext ? 'linear-gradient(135deg,rgba(0,212,170,.06),rgba(59,130,246,.03))' : 'var(--bg-card)', borderColor: isNext ? 'rgba(0,212,170,.25)' : patient.priority === 'urgent' ? 'rgba(239,68,68,.25)' : 'var(--border-card)' }}>
      <div style={{ minWidth:30, height:30, background: isNext ? 'var(--accent-teal-dim)' : 'var(--bg-secondary)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-display)', fontWeight:800, fontSize:13, color: isNext ? 'var(--accent-teal)' : 'var(--text-muted)' }}>{position + 1}</div>
      <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:20, color:'var(--accent-teal)', minWidth:46 }}>#{patient.tokenNumber}</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight:600, fontSize:14, display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
          {patient.name}
          <PriorityBadge priority={patient.priority}/>
        </div>
        {patient.notes && <div style={{ fontSize:11, color:'var(--accent-amber)', marginTop:2 }}>📋 {patient.notes}</div>}
        {patient.phone && <div style={{ fontSize:11, color:'var(--text-muted)' }}>{patient.phone}</div>}
      </div>
      <div style={{ textAlign:'right', minWidth:68 }}>
        <div style={{ fontSize:10, color:'var(--text-muted)' }}>Est. wait</div>
        <div style={{ fontWeight:700, fontSize:14, color: waitMins === 0 ? 'var(--accent-teal)' : waitMins > 30 ? 'var(--accent-amber)' : 'var(--text-primary)' }}>
          {waitMins === 0 ? 'Next' : `~${waitMins}m`}
        </div>
        {patient.estimatedCallTime && (
          <div style={{ fontSize:10, color:'var(--text-muted)' }}>~{new Date(patient.estimatedCallTime).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</div>
        )}
      </div>
      <div style={{ display:'flex', gap:6 }}>
        <button onClick={onSkip} className="btn btn-amber btn-xs" title="Skip"><SkipForward size={12}/></button>
        <button onClick={onRemove} className="btn btn-danger btn-xs" title="Remove"><Trash2 size={12}/></button>
      </div>
    </div>
  );
}

function PriorityBadge({ priority }) {
  if (priority === 'urgent') return <span className="badge badge-red"><AlertTriangle size={9}/> Urgent</span>;
  if (priority === 'elderly') return <span className="badge badge-purple"><Heart size={9}/> Special</span>;
  return null;
}
