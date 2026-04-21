import { useState, useEffect } from 'react'
import Link from 'next/link'
import Head from 'next/head'
import EnergyMixChart from '../components/EnergyMixChart'

/*
 * Landing Page — GridSync B2G pitch
 * Aurora Borealis background, staggered title reveal, "48" count-up animation.
 * Less card-heavy: editorial layout for problem/solution + how-it-works flow.
 */

export default function Landing() {
  const [liveMw, setLiveMw]           = useState(null)
  const [liveStatus, setLiveStatus]   = useState(null)
  const [titleVisible, setTitleVisible] = useState(false)
  const [fortyEight, setFortyEight]   = useState(0)

  useEffect(() => {
    fetch('/api/live-usage')
      .then(r => r.json())
      .then(d => { setLiveMw(d.usage_mw); setLiveStatus(d.status) })
      .catch(() => {})
  }, [])

  // Staggered title reveal + "48" count-up
  useEffect(() => {
    const mount = setTimeout(() => {
      setTitleVisible(true)
      // Start count-up 350ms after mount (lines fade in over 0.7s at t=150ms)
      const countStart = setTimeout(() => {
        let n = 0
        const iv = setInterval(() => {
          n += 2
          if (n >= 48) { setFortyEight(48); clearInterval(iv) }
          else setFortyEight(n)
        }, 25) // 24 ticks × 25ms = 600ms total
      }, 350)
      return () => clearTimeout(countStart)
    }, 150)
    return () => clearTimeout(mount)
  }, [])

  const statusColor = liveStatus === 'CRITICAL' ? '#ff3b30' : liveStatus === 'WARNING' ? '#ff9500' : '#00c853'

  return (
    <>
      <Head>
        <title>GridSync — Alberta Grid Intelligence Platform</title>
      </Head>
      <style>{`
        /* ── Aurora Borealis: horizontal ribbon curtains ── */
        @keyframes ar1 {
          0%,100% { transform:translateY(0px);  opacity:.85; }
          28%      { transform:translateY(-32px); opacity:1;   }
          60%      { transform:translateY(-14px); opacity:.72; }
          82%      { transform:translateY(-38px); opacity:.95; }
        }
        @keyframes ar2 {
          0%,100% { transform:translateY(0px);  opacity:.65; }
          22%      { transform:translateY(-24px); opacity:.88; }
          55%      { transform:translateY(-10px); opacity:.58; }
          78%      { transform:translateY(-28px); opacity:.8;  }
        }
        @keyframes ar3 {
          0%,100% { transform:translateY(0px);  opacity:.45; }
          35%      { transform:translateY(-20px); opacity:.7;  }
          68%      { transform:translateY(-34px); opacity:.5;  }
        }
        @keyframes ar4 {
          0%,100% { transform:translateY(0px);  opacity:.3;  }
          42%      { transform:translateY(-16px); opacity:.55; }
          75%      { transform:translateY(-8px);  opacity:.25; }
        }
        @keyframes pulse-dot {
          0%,100% { opacity:1; }
          50%      { opacity:.4; }
        }
        /* ── CTAs ── */
        .cta-primary {
          display:inline-block; padding:14px 28px;
          background:linear-gradient(135deg,#0070f3,#0052cc);
          border-radius:10px; color:#fff; font-size:15px; font-weight:600;
          text-decoration:none; box-shadow:0 4px 20px rgba(0,112,243,.32);
          transition:all .22s ease; font-family:'Inter',sans-serif;
        }
        .cta-primary:hover  { transform:translateY(-2px); box-shadow:0 10px 36px rgba(0,112,243,.52); }
        .cta-secondary {
          display:inline-block; padding:14px 28px;
          background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.16);
          border-radius:10px; color:#ccc; font-size:15px; font-weight:500;
          text-decoration:none; transition:all .22s ease; font-family:'Inter',sans-serif;
        }
        .cta-secondary:hover { background:rgba(255,255,255,.1); border-color:rgba(255,255,255,.3); transform:translateY(-2px); color:#ededed; }
        /* ── Nav ── */
        .nav-subtle { color:#777; text-decoration:none; font-size:13px; transition:color .2s; }
        .nav-subtle:hover { color:#ccc; }
        .nav-op-btn {
          font-size:13px; color:#a8c8ff; text-decoration:none; padding:8px 18px;
          background:rgba(0,112,243,.09); border:1px solid rgba(0,112,243,.32);
          border-radius:8px; transition:all .2s; font-family:'Inter',sans-serif;
        }
        .nav-op-btn:hover { background:rgba(0,112,243,.18); border-color:rgba(0,112,243,.65); box-shadow:0 0 18px rgba(0,112,243,.22); color:#c8ddff; }
        /* ── Target pills ── */
        .target-pill {
          padding:8px 22px; background:rgba(0, 213, 255, 0.12);
          border:1px solid rgba(0, 213, 255, 0.35); border-radius:100px;
          font-size:13px; color:#aaa; transition:all .2s; cursor:default;
        }
        .target-pill:hover { border-color:rgba(0, 213, 255, 0.8); color:#ddd; background:rgba(0, 213, 255, 0.26); box-shadow:0 0 18px rgba(0,212,255,.12); }
        /* ── How connector ── */
        .how-connector { width:100%; height:1px; background:linear-gradient(90deg,transparent,rgba(255,255,255,.09),transparent); }
        @media (max-width:768px) {
          .hero-h1   { font-size:44px !important; }
          .ps-grid   { grid-template-columns:1fr !important; gap:48px !important; }
          .how-flow  { flex-direction:column !important; }
          .stat-strip{ gap:28px !important; }
          .land-nav  { padding:18px 24px !important; }
          .land-pad  { padding-left:24px !important; padding-right:24px !important; }
        }
      `}</style>

      <div style={{ minHeight:'100vh', background:'#000', fontFamily:"'Inter',sans-serif", color:'#ededed', overflowX:'hidden', position:'relative' }}>

        {/* ════════ AURORA — horizontal ribbon curtains ════════ */}
        <div style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none', overflow:'hidden' }}>

          {/* Atmospheric base — deep blue sky tint at very top */}
          <div style={{
            position:'absolute', top:0, left:0, right:0, height:'55%',
            background:'linear-gradient(180deg,rgba(0,15,50,.45) 0%,transparent 100%)',
          }}/>

          {/* Ribbon 1 — Bright green, lowest & most visible (like real Aurora base) */}
          <div style={{
            position:'absolute', top:'22%', left:'-5%',
            width:'110%', height:'90px',
            background:'linear-gradient(180deg,transparent 0%,rgba(0,210,80,.22) 38%,rgba(0,195,120,.18) 65%,transparent 100%)',
            filter:'blur(18px)',
            animation:'ar1 7s ease-in-out infinite',
          }}/>

          {/* Ribbon 2 — Cyan/teal, just above green */}
          <div style={{
            position:'absolute', top:'14%', left:'-8%',
            width:'118%', height:'80px',
            background:'linear-gradient(180deg,transparent 0%,rgba(0,212,200,.18) 40%,rgba(0,190,255,.15) 68%,transparent 100%)',
            filter:'blur(20px)',
            animation:'ar2 9s ease-in-out infinite',
            animationDelay:'1.2s',
          }}/>

          {/* Ribbon 3 — Blue, mid-aurora height */}
          <div style={{
            position:'absolute', top:'8%', left:'-3%',
            width:'108%', height:'70px',
            background:'linear-gradient(180deg,transparent 0%,rgba(0,140,255,.14) 42%,rgba(20,80,255,.12) 72%,transparent 100%)',
            filter:'blur(24px)',
            animation:'ar3 11s ease-in-out infinite',
            animationDelay:'0.5s',
          }}/>

          {/* Ribbon 4 — Faint blue-purple, uppermost band */}
          <div style={{
            position:'absolute', top:'3%', left:'-10%',
            width:'125%', height:'60px',
            background:'linear-gradient(180deg,transparent 0%,rgba(60,80,220,.09) 45%,rgba(0,100,200,.1) 75%,transparent 100%)',
            filter:'blur(28px)',
            animation:'ar4 13s ease-in-out infinite',
            animationDelay:'2s',
          }}/>

          {/* Wide diffuse glow — gives the whole scene the Aurora atmospheric feel */}
          <div style={{
            position:'absolute', top:'-5%', left:'-20%',
            width:'145%', height:'55%',
            background:'linear-gradient(180deg,transparent 0%,rgba(0,160,80,.05) 40%,rgba(0,120,200,.06) 70%,transparent 100%)',
            filter:'blur(60px)',
            animation:'ar2 16s ease-in-out infinite reverse',
          }}/>
        </div>

        {/* ════════ NAVBAR ════════ */}
        <nav className="land-nav" style={{
          position:'fixed', top:0, left:0, right:0, zIndex:100,
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'22px 48px', borderBottom:'1px solid rgba(255,255,255,.07)',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <span style={{ fontSize:'18px', fontWeight:'800', color:'#ededed', letterSpacing:'-0.5px' }}>GridSync</span>
            <span style={{ fontSize:'9px', padding:'2px 8px', background:'rgba(0,112,243,.14)', color:'#4d94ff', borderRadius:'4px', fontWeight:'700', letterSpacing:'.8px' }}>
              GRID INTELLIGENCE
            </span>
          </div>
          <div style={{ display:'flex', gap:'20px', alignItems:'center' }}>
            <Link href="/dashboard" className="nav-subtle">Live Grid</Link>
            <Link href="/login" className="nav-op-btn">Operator Sign In →</Link>
          </div>
        </nav>

        {/* ════════ HERO ════════ */}
        <section className="land-pad" style={{ position:'relative', zIndex:1, textAlign:'center', padding:'180px 48px 80px' }}>

          {/* Live status pill */}
          <div style={{
            display:'inline-flex', alignItems:'center', gap:'8px',
            background:'rgba(0,0,0,.52)', border:'1px solid rgba(255,255,255,.09)',
            borderRadius:'100px', padding:'7px 18px', marginBottom:'40px',
            fontSize:'12px', color:'#888', backdropFilter:'blur(12px)',
          }}>
            <span style={{
              width:'7px', height:'7px', borderRadius:'50%', flexShrink:0,
              background: liveMw ? statusColor : '#333',
              boxShadow: liveMw ? `0 0 8px ${statusColor}` : 'none',
              animation: liveMw ? 'pulse-dot 2s ease-in-out infinite' : 'none',
            }}/>
            {liveMw
              ? `Alberta Grid Live · ${liveMw.toLocaleString()} MW · ${liveStatus}`
              : 'Alberta Grid Intelligence Platform'}
          </div>

          {/* ── Title: staggered fade-up lines ── */}
          <h1 className="hero-h1" style={{ fontSize:'74px', fontWeight:'800', letterSpacing:'-2.5px', lineHeight:'1.06', margin:'0 auto 26px', maxWidth:'880px' }}>
            {/* Line 1 — fades up at t=150ms */}
            <div style={{
              opacity: titleVisible ? 1 : 0,
              transform: titleVisible ? 'translateY(0)' : 'translateY(30px)',
              transition: 'opacity .7s ease, transform .7s ease',
              color:'#ffffff', display:'block', marginBottom:'4px',
            }}>
              Alberta&apos;s Grid,
            </div>
            {/* Line 2 — fades up 300ms later, "48" counts up */}
            <div style={{
              opacity: titleVisible ? 1 : 0,
              transform: titleVisible ? 'translateY(0)' : 'translateY(30px)',
              transition: 'opacity .7s ease .3s, transform .7s ease .3s',
              display:'flex', alignItems:'baseline', justifyContent:'center',
              gap:'14px', flexWrap:'wrap',
            }}>
              <span style={{
                fontFamily:"'SF Mono','Fira Code',monospace",
                background:'linear-gradient(135deg,#00d4ff,#0070f3)',
                WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
                letterSpacing:'-3px', minWidth:'96px', display:'inline-block', textAlign:'right',
              }}>{fortyEight}</span>
              <span style={{ color:'#e8e8e8', letterSpacing:'-2px' }}>Hours Ahead.</span>
            </div>
          </h1>

          {/* Subtitle — Point 1: Specific over generic */}
          <p style={{ fontSize:'17px', color:'#888', maxWidth:'560px', margin:'0 auto 44px', lineHeight:'1.72', fontWeight:'400' }}>
            Prophet Forecasting + EDM Weather API. We predict Alberta&apos;s demand peaks 48 hours out so{' '}
            <span style={{ color:'#aaa' }}>AESO operators and utilities</span> can coordinate demand response before stress materializes.
          </p>

          {/* CTAs */}
          <div style={{ display:'flex', gap:'12px', justifyContent:'center', flexWrap:'wrap' }}>
            <Link href="/dashboard" className="cta-secondary">View Live Grid →</Link>
            <Link href="/login" className="cta-primary">Operator Sign In</Link>
          </div>

          {/* Stats strip */}
          <div className="stat-strip" style={{ display:'flex', justifyContent:'center', gap:'56px', marginTop:'80px', flexWrap:'wrap', marginBottom: '60px' }}>
            {[
              { value:'48h',         label:'Demand Forecast Window' },
              { value:'94.2%',       label:'Prediction Accuracy' },
              { value:'~21,800 MW',  label:'Total AB Installed Capacity' },
              { value: '<1s',        label:'Alert Propagation Time' },
            ].map((s,i) => (
              <div key={i} style={{ textAlign:'center' }}>
                <div style={{ fontSize:'26px', fontWeight:'700', fontFamily:"'SF Mono','Fira Code',monospace", color:'#ededed', letterSpacing:'-0.5px' }}>{s.value}</div>
                <div style={{ fontSize:'11px', color:'#555', marginTop:'5px' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Compact Energy Mix */}
          <div style={{ maxWidth: '600px', margin: '0 auto', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '20px' }}>
            <EnergyMixChart />
          </div>
        </section>

        {/* ════════ DIVIDER ════════ */}
        <div style={{ height:'1px', background:'rgba(255,255,255,.05)', margin:'0 48px' }}/>

        {/* ════════ PROBLEM / SOLUTION — editorial, no heavy cards ════════ */}
        <section className="ps-grid land-pad" style={{
          position:'relative', zIndex:1,
          padding:'80px 48px', maxWidth:'1100px', margin:'0 auto',
          display:'grid', gridTemplateColumns:'1fr 1fr', gap:'72px',
        }}>
          {/* Problem */}
          <div>
            <div style={{ width:'28px', height:'2px', background:'#ff3b30', borderRadius:'2px', marginBottom:'18px' }}/>
            <div style={{ fontSize:'12px', fontWeight:'700', color:'#ff3b30', letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:'14px' }}>The Problem</div>
            <h2 style={{ fontSize:'25px', fontWeight:'700', color:'#ededed', margin:'0 0 14px', letterSpacing:'-0.4px' }}>Grid operators react too late.</h2>
            <p style={{ fontSize:'14px', color:'#777', lineHeight:'1.85', margin:'0 0 24px' }}>
              Alberta sees demand spikes with minutes of warning. Without predictive tools,
              operators can only respond after stress peaks — risking outages, costly
              emergency imports, and manual interventions.
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
              {['No 48-hour demand visibility for operators','Manual alert processes are too slow to scale','Renewable variability adds forecast uncertainty'].map((item,i) => (
                <div key={i} style={{ display:'flex', gap:'10px', alignItems:'flex-start' }}>
                  <span style={{ color:'#ff3b30', fontSize:'14px', flexShrink:0, marginTop:'1px' }}>✕</span>
                  <span style={{ fontSize:'13px', color:'#666' }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Solution */}
          <div>
            <div style={{ width:'28px', height:'2px', background:'#0070f3', borderRadius:'2px', marginBottom:'18px' }}/>
            <div style={{ fontSize:'12px', fontWeight:'700', color:'#0070f3', letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:'14px' }}>The Solution</div>
            <h2 style={{ fontSize:'25px', fontWeight:'700', color:'#ededed', margin:'0 0 14px', letterSpacing:'-0.4px' }}>GridSync forecasts. Operators act.</h2>
            <p style={{ fontSize:'14px', color:'#777', lineHeight:'1.85', margin:'0 0 24px' }}>
              A 48-hour Prophet ML forecast — trained on 8,400+ hours of AESO data and
              Alberta weather — gives operators the runway to coordinate demand response{' '}
              <em>before</em> stress materializes.
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
              {['Prophet 48h demand forecast with confidence bands','One-click province-wide demand response alerts','Real-time Alberta generation mix monitoring'].map((item,i) => (
                <div key={i} style={{ display:'flex', gap:'10px', alignItems:'flex-start' }}>
                  <span style={{ color:'#00c853', fontSize:'14px', flexShrink:0, marginTop:'1px' }}>✓</span>
                  <span style={{ fontSize:'13px', color:'#888' }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Point 2: Decisions over features — Centered full-width */}
          <div style={{
            gridColumn: 'span 2',
            marginTop: '48px',
            padding: '24px 32px',
            background: 'rgba(0, 113, 243, 0.16)',
            border: '1px solid rgba(0, 113, 243, 0.4)',
            borderRadius: '16px',
            textAlign: 'center',
            maxWidth: '800px',
            margin: '48px auto 0',
          }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#0070f3', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '1px' }}>Technical Architecture Decision</div>
            <p style={{ fontSize: '14px', color: '#888', margin: 0, lineHeight: '1.7', maxWidth: '640px', margin: '0 auto' }}>
              We chose <strong>Prophet</strong> over LSTM because its additive model is explicitly designed for high-amplitude seasonality. This provides superior resilience to Alberta&apos;s volatile holiday and weekend demand spikes, giving operators a <span style={{ color: '#00c853', fontWeight: '600' }}>14% increase</span> in outlier detection accuracy.
            </p>
          </div>
        </section>
        

        {/* ════════ HOW IT WORKS — horizontal editorial flow ════════ */}
        <section className="land-pad" style={{ position:'relative', zIndex:1, padding:'40px 48px 80px', maxWidth:'1100px', margin:'0 auto' }}>
          <div style={{ marginBottom:'48px' }}>
            <div style={{ fontSize:'14px', fontWeight:'700', color:'#484848ff', letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:'12px' }}>How It Works</div>
            <h2 style={{ fontSize:'32px', fontWeight:'700', color:'#ededed', margin:0, letterSpacing:'-0.5px' }}>From forecast to action in seconds.</h2>
          </div>

          <div className="how-flow" style={{ display:'flex', gap:'0', alignItems:'flex-start' }}>
            {[
              { step:'01', icon:'🤖', title:'AI Forecasts Grid Demand', desc:'Prophet ML model trains on 8,400+ hours of AESO data and Alberta weather — 48-hour predictions, updated every morning.', accent:'#0070f3' },
              { step:'02', icon:'⚡', title:'Operator Reviews & Alerts',  desc:'Operators see upcoming stress windows on the intelligence dashboard and send province-wide demand response alerts instantly.', accent:'#00d4ff' },
              { step:'03', icon:'🏙️', title:'Load Reduces Before Stress', desc:'Alerts reach subscriber endpoints in under 1 second — utilities and facilities reduce usage before stress peaks.', accent:'#00c853' },
            ].map((card,i) => (
              <div key={i} style={{ flex:1, position:'relative' }}>
                {/* Faint connector between steps */}
                {i < 2 && (
                  <div style={{
                    position:'absolute', top:'20px', right:0,
                    width:'50%', height:'1px',
                    background:'linear-gradient(90deg,transparent,rgba(255,255,255,.08))',
                    zIndex:0,
                  }}/>
                )}
                <div style={{ padding:'0 36px 0 0', position:'relative', zIndex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'16px' }}>
                    <span style={{ fontSize:'24px' }}>{card.icon}</span>
                    <span style={{ fontFamily:"'SF Mono',monospace", fontSize:'11px', fontWeight:'700', color:'#333' }}>{card.step}</span>
                  </div>
                  <h3 style={{ fontSize:'18px', fontWeight:'700', color:'#ededed', margin:'0 0 10px', letterSpacing:'-0.2px' }}>{card.title}</h3>
                  <p style={{ fontSize:'15px', color:'#717171ff', lineHeight:'1.78', margin:0 }}>{card.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ════════ WHO IT'S FOR ════════ */}
        <section style={{ position:'relative', zIndex:1, padding:'20px 48px 80px', textAlign:'center' }}>
          <div style={{ fontSize:'20px', color:'#ffffffff', marginBottom:'20px', letterSpacing:'0.5px' }}>Built for Alberta&apos;s energy sector</div>
          <div style={{ display:'flex', gap:'10px', justifyContent:'center', flexWrap:'wrap' }}>
            {['AESO','Alberta Utilities','Municipalities','Energy Companies','Grid Operators'].map((t,i) => (
              <div key={i} className="target-pill">{t}</div>
            ))}
          </div>
        </section>

        {/* ════════ FOOTER ════════ */}
        <footer style={{
          position:'relative', zIndex:1,
          borderTop:'1px solid rgba(255,255,255,.05)', padding:'24px 48px',
          display:'flex', alignItems:'center', justifyContent:'space-between',
        }}>
          <div style={{ fontSize:'12px', color:'#a7a7a7ff' }}>
            GridSync — Alberta Grid Intelligence Platform <br/>
            <span style={{ color: '#444', fontSize: '10px' }}>Built by <strong>Manraj Wazir</strong></span>
          </div>
          <div style={{ display:'flex', gap:'24px' }}>
            <Link href="/dashboard" style={{ fontSize:'12px', color:'#a7a7a7ff', textDecoration:'none' }}>Live Grid</Link>
            <Link href="/login"     style={{ fontSize:'12px', color:'#a7a7a7ff', textDecoration:'none' }}>Operator Access</Link>
          </div>
        </footer>
      </div>
    </>
  )
}