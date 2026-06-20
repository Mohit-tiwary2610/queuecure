import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, CheckCircle, ChevronRight, AlertTriangle, Heart, WifiOff, Clock, Users } from 'lucide-react';
import { useSocket } from '../hooks/useSocket.jsx';

export default function DoctorPage() {
  const navigate = useNavigate();
  const { connected, clinicState, emit } = useSocket();
  const [loading, setLoading] = useState('');

  const waitingPatients = (clinicState.queue || []).filter(p => p.status === 'waiting');

  const handleCallNext = async () => {
    setLoading('next');
    const res = await emit('call_next');
    setLoading('');
    if (res.error) toast.error(res.error);
    else if (res.currentToken) toast.success(`Calling Token #${res.currentToken.tokenNumber} — ${res.currentToken.name}`);
    else toast('All patients served!', { icon: '🎉' });
  };

  const handleCompleteCurrent = async () => {
    setLoading('complete');
    const res = await emit('complete_current');
    setLoading('');
    if (res.error) toast.error(res.error);
    else toast.success('Consultation complete');
  };

  return (
    <div className="page-wrapper">
      {/* Nav */}
      <nav style={{ padding:'16px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid var(--border-subtle)', background:'var(--bg-secondary)', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <button onClick={() => navigate('/')} className="btn btn-secondary btn-sm"><ArrowLeft size={14}/> Back</button>
          <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:16 }}>Doctor's View</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {connected ? <><span className="live-dot"/><span style={{ fontSize:12, color:'var(--accent-green)', fontWeight:600 }}>Live</span></> : <><WifiOff size={12} color="var(--accent-red)"/><span style={{ fontSize:12, color:'var(--accent-red)' }}>Offline</span></>}
        </div>
      </nav>

      <div className="container" style={{ padding:'32px 24px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>

        {/* Left: Current Patient */}
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          <h2 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:20 }}>Current Patient</h2>

          <div style={{
            background: clinicState.currentToken
              ? 'linear-gradient(135deg, rgba(0,212,170,0.08), rgba(59,130,246,0.05))'
              : 'var(--bg-card)',
            border: `1px solid ${clinicState.currentToken ? 'rgba(0,212,170,0.4)' : 'var(--border-card)'}`,
            borderRadius:'var(--radius-xl)', padding:40, textAlign:'center',
            animation: clinicState.currentToken ? 'glow-pulse 3s ease-in-out infinite' : 'none',
            minHeight:260, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center'
          }}>
            {clinicState.currentToken ? (
              <>
                <div style={{ fontSize:11, fontWeight:700, letterSpacing:2, color:'var(--text-muted)', textTransform:'uppercase', marginBottom:12 }}>Now Consulting</div>
                <div className="token-number" style={{ marginBottom:12 }}>#{clinicState.currentToken.tokenNumber}</div>
                <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:24, marginBottom:8 }}>{clinicState.currentToken.name}</div>
                {clinicState.currentToken.phone && <div style={{ color:'var(--text-muted)', fontSize:14, marginBottom:12 }}>{clinicState.currentToken.phone}</div>}
                {clinicState.currentToken.notes && (
                  <div style={{ background:'var(--bg-secondary)', border:'1px solid var(--border-card)', borderRadius:'var(--radius-md)', padding:'10px 16px', fontSize:13, color:'var(--text-secondary)', marginBottom:16, maxWidth:280 }}>
                    📋 {clinicState.currentToken.notes}
                  </div>
                )}
                <div style={{ marginBottom:12 }}>
                  {clinicState.currentToken.priority === 'urgent' && <span className="badge badge-red"><AlertTriangle size={10}/> Urgent</span>}
                  {clinicState.currentToken.priority === 'elderly' && <span className="badge badge-purple"><Heart size={10}/> Special Care</span>}
                  {clinicState.currentToken.priority === 'normal' && <span className="badge badge-blue">Normal</span>}
                </div>
                <div style={{ fontSize:12, color:'var(--text-muted)' }}>
                  Called at: {clinicState.currentToken.calledAt ? new Date(clinicState.currentToken.calledAt).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }) : '—'}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize:48, marginBottom:12 }}>🩺</div>
                <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:18, color:'var(--text-secondary)', marginBottom:8 }}>No patient in room</div>
                <div style={{ fontSize:14, color:'var(--text-muted)' }}>Click "Call Next" to bring in the next patient</div>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <button onClick={handleCallNext} disabled={loading === 'next' || waitingPatients.length === 0} className="btn btn-primary btn-lg" style={{ justifyContent:'center', width:'100%' }}>
              <ChevronRight size={18}/> {loading === 'next' ? 'Calling...' : `Call Next Patient`}
              {waitingPatients.length > 0 && <span style={{ background:'rgba(0,0,0,0.2)', borderRadius:100, padding:'2px 8px', fontSize:12 }}>{waitingPatients.length} waiting</span>}
            </button>
            {clinicState.currentToken && (
              <button onClick={handleCompleteCurrent} disabled={loading === 'complete'} className="btn btn-secondary" style={{ justifyContent:'center', width:'100%' }}>
                <CheckCircle size={15}/> {loading === 'complete' ? 'Completing...' : 'Mark Done (Don\'t Call Next)'}
              </button>
            )}
          </div>

          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <MiniCard label="Waiting" value={waitingPatients.length} icon={<Users size={14}/>} color="var(--accent-teal)" />
            <MiniCard label="Served" value={clinicState.totalServed} icon={<CheckCircle size={14}/>} color="var(--accent-green)" />
            <MiniCard label="Avg Time" value={`${clinicState.avgConsultationTime}m`} icon={<Clock size={14}/>} color="var(--accent-blue)" />
            <MiniCard label="Est. Clear" value={`${(clinicState.stats?.estimatedClearTime || 0)}m`} icon={<Clock size={14}/>} color="var(--accent-amber)" />
          </div>
        </div>

        {/* Right: Upcoming patients */}
        <div>
          <h2 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:20, marginBottom:20 }}>Upcoming Patients</h2>
          {waitingPatients.length === 0 ? (
            <div className="card" style={{ padding:48, textAlign:'center', color:'var(--text-muted)' }}>
              <CheckCircle size={36} style={{ marginBottom:12, opacity:.3 }}/>
              <div style={{ fontWeight:600, fontSize:16 }}>Queue is clear</div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {waitingPatients.map((patient, i) => (
                <div key={patient.id} className={`card p-${patient.priority}`} style={{ padding:'16px 20px', display:'flex', alignItems:'center', gap:16 }}>
                  <div style={{ minWidth:32, height:32, background: i === 0 ? 'var(--accent-teal-dim)' : 'var(--bg-secondary)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-display)', fontWeight:800, fontSize:14, color: i === 0 ? 'var(--accent-teal)' : 'var(--text-muted)' }}>{i + 1}</div>
                  <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:20, color:'var(--accent-teal)', minWidth:50 }}>#{patient.tokenNumber}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, fontSize:15, display:'flex', alignItems:'center', gap:8 }}>
                      {patient.name}
                      {patient.priority === 'urgent' && <span className="badge badge-red"><AlertTriangle size={9}/> Urgent</span>}
                      {patient.priority === 'elderly' && <span className="badge badge-purple"><Heart size={9}/> Special</span>}
                    </div>
                    {patient.notes && <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>📋 {patient.notes}</div>}
                    {patient.phone && <div style={{ fontSize:12, color:'var(--text-muted)' }}>{patient.phone}</div>}
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:11, color:'var(--text-muted)' }}>Est. wait</div>
                    <div style={{ fontWeight:700, fontSize:15, color: i === 0 ? 'var(--accent-teal)' : 'var(--text-primary)' }}>
                      {i === 0 ? 'Next' : `~${i * clinicState.avgConsultationTime}m`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniCard({ label, value, icon, color }) {
  return (
    <div className="stat-card">
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
        <span style={{ color }}>{icon}</span>
        <span style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.5px', fontWeight:600 }}>{label}</span>
      </div>
      <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:24, color }}>{value}</div>
    </div>
  );
}
