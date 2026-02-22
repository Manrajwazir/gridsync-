import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import GridStatus from '../components/GridStatus'
import DemandGauge from '../components/DemandGauge'
import ThermostatRoundedIcon from '@mui/icons-material/ThermostatRounded'
import KitchenRoundedIcon from '@mui/icons-material/KitchenRounded'
import EvStationRoundedIcon from '@mui/icons-material/EvStationRounded'
import LightbulbRoundedIcon from '@mui/icons-material/LightbulbRounded'

/*
 * Consumer Home — Two-column layout
 * Left: Live grid status chart
 * Right: Demand gauge + collapsible energy tips accordion
 */

const tipCategories = [
  {
    Icon: ThermostatRoundedIcon,
    label: 'Heating & Cooling',
    desc: 'Your furnace is the biggest load.',
    tips: [
      { text: 'Pre-heat to 22°C before a peak period starts', savings: '~1.5 kW' },
      { text: 'Drop thermostat to 19°C during alert window (6–9 PM)', savings: '~2.0 kW' },
      { text: 'Close blinds to retain heat', savings: '~0.5 kW' },
    ],
  },
  {
    Icon: KitchenRoundedIcon,
    label: 'Appliances',
    desc: 'Shift high-draw appliances outside peak hours.',
    tips: [
      { text: 'Delay dishwasher until after 9 PM', savings: '~1.2 kW' },
      { text: 'Delay laundry (washer + dryer) until after 9 PM', savings: '~0.9 kW' },
      { text: 'Use microwave instead of oven — 70% less energy', savings: '~1.0 kW' },
    ],
  },
  {
    Icon: EvStationRoundedIcon,
    label: 'Electric Vehicles',
    desc: 'EV charging is the biggest thing you can shift.',
    tips: [
      { text: "Charge before 6 PM or after 9 PM using your car's schedule", savings: '~7.2 kW' },
      { text: 'Use departure time scheduling in your EV app', savings: '~7.2 kW' },
    ],
  },
  {
    Icon: LightbulbRoundedIcon,
    label: 'Lighting & Electronics',
    desc: 'Small changes add up across thousands of homes.',
    tips: [
      { text: 'Turn off lights in unoccupied rooms', savings: '~0.3 kW' },
      { text: 'Lower monitor brightness during evening hours', savings: '~0.1 kW' },
      { text: 'Unplug device chargers not in use', savings: '~0.2 kW' },
    ],
  },
]

// Shimmer skeleton for loading state
function HomeSkeleton() {
  return (
    <>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .sk { background: linear-gradient(90deg, #111 25%, #1a1a1a 50%, #111 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; border-radius: 6px; }
      `}</style>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>
        {/* Left: chart skeleton */}
        <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '28px 32px' }}>
          <div className="sk" style={{ height: '12px', width: '30%', marginBottom: '20px' }} />
          <div className="sk" style={{ height: '48px', width: '50%', marginBottom: '8px' }} />
          <div className="sk" style={{ height: '12px', width: '38%', marginBottom: '24px' }} />
          <div className="sk" style={{ height: '4px', width: '100%', marginBottom: '28px' }} />
          <div className="sk" style={{ height: '300px', width: '100%' }} />
        </div>
        {/* Right: gauge + tips skeleton */}
        <div>
          <div className="sk" style={{ height: '200px', borderRadius: '12px', marginBottom: '16px' }} />
          {[1,2,3,4].map(i => (
            <div key={i} style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '14px 16px', marginBottom: '8px', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div className="sk" style={{ width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="sk" style={{ height: '13px', width: '55%', marginBottom: '6px' }} />
                <div className="sk" style={{ height: '10px', width: '75%' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

// ... existing icons ...

export default function Home() {
  const [openCategory, setOpenCategory] = useState(null)
  const [gridLoaded, setGridLoaded] = useState(false)
  const [liveStats, setLiveStats] = useState(null)
  const [activeAlert, setActiveAlert] = useState(null)

  // Listen for real-time alerts from Supabase
  useEffect(() => {
    // 1. Fetch any existing active alerts on load
    const fetchExisting = async () => {
      const { data } = await supabase
        .from('alerts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
      if (data?.[0]) setActiveAlert(data[0])
    }
    fetchExisting()

    // 2. Subscribe to new alerts
    const channel = supabase
      .channel('public:alerts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' }, payload => {
        if (payload.new.is_active) {
          setActiveAlert(payload.new)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <div style={{ padding: '20px 24px 100px', maxWidth: '1100px', margin: '0 auto', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', paddingTop: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <span style={{ fontSize: '20px', fontWeight: '700', color: '#ededed', letterSpacing: '-0.3px' }}>
            GridSync
          </span>
          <span style={{
            fontSize: '9px', padding: '2px 7px',
            background: 'rgba(0, 200, 83, 0.1)', color: '#00c853',
            borderRadius: '4px', fontWeight: '700', letterSpacing: '0.5px',
          }}>BETA</span>
        </div>
        <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>
          Alberta grid — live status and energy saving tips
        </p>
      </div>

      {/* Real-time Alert Notification */}
      {activeAlert && (
        <div style={{
          background: 'rgba(255, 59, 48, 0.1)',
          border: '1px solid #ff3b30',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          animation: 'pulse 2s infinite',
        }}>
          <style>{`
            @keyframes pulse {
              0% { box-shadow: 0 0 0 0 rgba(255,59,48,0.4); }
              70% { box-shadow: 0 0 0 10px rgba(255,59,48,0); }
              100% { box-shadow: 0 0 0 0 rgba(255,59,48,0); }
            }
          `}</style>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🚨</span>
            <span style={{ fontWeight: '800', color: '#ff3b30', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Grid Emergency Alert
            </span>
            <button 
              onClick={() => setActiveAlert(null)}
              style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: '12px' }}
            >
              Dismiss
            </button>
          </div>
          <div style={{ fontSize: '14px', color: '#ededed', lineHeight: '1.5', fontWeight: '500' }}>
            {activeAlert.message}
          </div>
        </div>
      )}

      {/* Skeleton until loaded */}
      {!gridLoaded && <HomeSkeleton />}

      {/* Two-column layout */}
      <div style={{
        display: gridLoaded ? 'grid' : 'none',
        gridTemplateColumns: '1fr 340px',
        gap: '24px',
        alignItems: 'start',
      }}>
        {/* LEFT: Live grid status */}
        <GridStatus
          onReady={(stats) => {
            setGridLoaded(true)
            if (stats) setLiveStats(stats)
          }}
        />

        {/* RIGHT: Gauge + Tips */}
        <div>
          {/* Live demand gauge */}
          <div style={{ marginBottom: '16px' }}>
            <DemandGauge
              pct={liveStats?.pct ?? 0}
              status={liveStats?.status ?? 'STABLE'}
              usageMw={liveStats?.usageMw}
            />
          </div>

          {/* Tips section header */}
          <div style={{
            fontSize: '11px', fontWeight: '600', color: '#444',
            letterSpacing: '1px', textTransform: 'uppercase',
            marginBottom: '10px',
          }}>
            Energy Tips
          </div>

          {/* Why banner */}
          <div style={{
            background: 'rgba(0, 112, 243, 0.06)',
            border: '1px solid rgba(0, 112, 243, 0.12)',
            borderRadius: '10px', padding: '10px 14px',
            marginBottom: '12px', fontSize: '12px', color: '#888', lineHeight: '1.6',
          }}>
            <span style={{ color: '#4d94ff', fontWeight: '600' }}>Why this matters: </span>
            10,000 households × 2 kW = <strong style={{ color: '#ededed' }}>20 MW saved</strong>.
          </div>

          {/* Accordion */}
          {tipCategories.map((cat, ci) => {
            const isOpen = openCategory === ci
            return (
              <div key={ci} style={{
                background: '#0a0a0a',
                border: `1px solid ${isOpen ? 'rgba(0,112,243,0.2)' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: '10px', overflow: 'hidden', marginBottom: '8px',
                transition: 'border-color 0.2s',
              }}>
                <button
                  onClick={() => setOpenCategory(isOpen ? null : ci)}
                  style={{
                    width: '100%', padding: '12px 14px',
                    background: 'transparent', border: 'none',
                    display: 'flex', alignItems: 'center', gap: '10px',
                    cursor: 'pointer', textAlign: 'left',
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  <cat.Icon sx={{ fontSize: 20, color: isOpen ? '#0070f3' : '#555', transition: 'color 0.2s' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#ededed' }}>{cat.label}</div>
                    <div style={{ fontSize: '11px', color: '#555', marginTop: '1px' }}>{cat.desc}</div>
                  </div>
                  <span style={{
                    fontSize: '16px', color: isOpen ? '#0070f3' : '#333',
                    transform: isOpen ? 'rotate(90deg)' : 'none',
                    transition: 'transform 0.2s, color 0.2s',
                    display: 'inline-block',
                  }}>›</span>
                </button>

                {isOpen && cat.tips.map((tip, ti) => (
                  <div key={ti} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: '12px', padding: '10px 14px',
                    borderTop: '1px solid rgba(255,255,255,0.04)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', flex: 1 }}>
                      <span style={{ color: '#0070f3', fontSize: '13px', flexShrink: 0, marginTop: '1px' }}>›</span>
                      <span style={{ fontSize: '12px', color: '#aaa', lineHeight: '1.5' }}>{tip.text}</span>
                    </div>
                    <span style={{
                      fontSize: '10px', fontFamily: "'SF Mono', monospace",
                      color: '#00c853', background: 'rgba(0,200,83,0.06)',
                      border: '1px solid rgba(0,200,83,0.15)',
                      padding: '2px 7px', borderRadius: '4px',
                      whiteSpace: 'nowrap', flexShrink: 0,
                    }}>{tip.savings}</span>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}