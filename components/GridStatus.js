'use client'
import { useState, useEffect } from 'react'
import {
  ComposedChart, Line, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, CartesianGrid
} from 'recharts'

const MAX_CAPACITY = 11700

/*
 * GridStatus — The unified "command center" for Alberta's grid
 * 
 * This component COMBINES three previously separate components:
 *   - LiveUsageCard → current MW reading + status
 *   - RiskIndicator → risk level + countdown
 *   - UsageGraph → historical + predicted chart
 * 
 * WHY COMBINE THEM:
 * They all answer the same question: "What's happening with the grid?"
 * Showing them as one unified panel is cleaner and more professional.
 * The data flows naturally: current state → visual trend → what's coming next.
 * 
 * DATA FLOW:
 * 1. Fetches /api/live-usage → current MW + status
 * 2. Fetches /predictions.json → predicted MW for next 48h
 * 3. Generates mock historical data (last 24h) — will be real AESO data later
 * 4. Combines everything into one view
 */

// ── Fetch real historical data from AESO API ──
async function fetchHistorical(anchorMw) {
  try {
    const res = await fetch(`/api/historical-usage?anchor=${anchorMw || 10500}`)
    const json = await res.json()
    if (!json.data || json.data.length === 0) throw new Error('empty')
    return json.data.map(pt => ({
      label: new Date(pt.timestamp).toLocaleDateString('en-CA', { weekday: 'short' }) + ' ' +
             new Date(pt.timestamp).toLocaleTimeString('en-CA', { hour: 'numeric', hour12: true }),
      historical: pt.usage_mw,
      predicted: undefined,
      lower: 0,
      bandWidth: 0,
    }))
  } catch {
    // Fallback: no historical data points
    return []
  }
}

// ── Custom chart tooltip ──
// STRICT FILTER: Only shows series where data is a real number
function ChartTooltip({ active, payload, label: tooltipLabel }) {
  if (!active || !payload?.length) return null

  // Filter to only show real data lines (not the hidden band boundaries)
  const validEntries = payload.filter(
    p => typeof p.value === 'number' && !isNaN(p.value) && p.dataKey !== 'lower' && p.dataKey !== 'upper'
  )
  if (validEntries.length === 0) return null

  const displayLabel = payload[0]?.payload?.label || ''
  const pt = payload[0]?.payload

  return (
    <div style={{
      background: '#0a0a0a',
      border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: '8px',
      padding: '10px 14px',
      fontSize: '13px',
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{ color: '#888', marginBottom: '4px' }}>{displayLabel}</div>
      {validEntries.map((p, i) => (
        <div key={i} style={{
          color: p.color,
          fontWeight: '600',
          fontFamily: "'SF Mono', monospace",
        }}>
          {p.name}: {p.value.toLocaleString()} MW
        </div>
      ))}
      {pt?.lower != null && pt?.upper != null && (
        <div style={{ color: '#555', fontSize: '11px', marginTop: '4px', fontFamily: "'SF Mono', monospace" }}>
          Band: {pt.lower.toLocaleString()}–{pt.upper.toLocaleString()} MW
        </div>
      )}
    </div>
  )
}

export default function GridStatus({ onReady }) {
  const [liveData, setLiveData] = useState(null)
  const [predictions, setPredictions] = useState([])
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(new Date())

  // Fetch live data from AESO
  useEffect(() => {
    const fetchLive = async () => {
      try {
        const res = await fetch('/api/live-usage')
        setLiveData(await res.json())
      } catch { }
      setLoading(false)
    }
    fetchLive()
    const interval = setInterval(fetchLive, 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  // Fire onReady with live stats when loading finishes
  useEffect(() => {
    if (!loading && onReady) {
      onReady({
        pct: Math.round((liveData?.usage_mw ?? 0) / 11700 * 100),
        status: liveData?.status ?? 'STABLE',
        usageMw: liveData?.usage_mw ?? null,
      })
    }
  }, [loading])

  // Fetch historical + predictions and build chart data
  useEffect(() => {
    async function buildChart() {
      const currentMw = liveData?.usage_mw || 10500

      try {
        const [histRes, predsRes] = await Promise.all([
          fetchHistorical(currentMw),
          fetch('/predictions.json')
            .then(r => r.json())
            .then(d => d.predictions ?? [])
            .catch(() => [])
        ])

        setPredictions(predsRes)

        // Use a Map to combine points by timestamp to avoid duplicates and ensure alignment
        // Format of map key: "YYYY-MM-DD HH:00"
        const dataMap = new Map()

        // 1. Add historical data - these are the GROUND TRUTH
        histRes.forEach(pt => {
          dataMap.set(pt.label, {
            ...pt,
            historical: pt.historical,
            predicted: undefined
          })
        })

        // 2. Add predictions
        predsRes.slice(0, 36).forEach(p => {
          const label = new Date(p.timestamp).toLocaleDateString('en-CA', { weekday: 'short' }) + ' ' +
                        new Date(p.timestamp).toLocaleTimeString('en-CA', { hour: 'numeric', hour12: true })
          
          const existing = dataMap.get(label)
          const lower = p.lower_bound ?? undefined
          const upper = p.upper_bound ?? undefined
          
          if (existing) {
            // Overlap: add prediction info to historical point
            existing.predicted = p.predicted_mw
            existing.lower = lower
            existing.upper = upper
            existing.bandWidth = (lower != null && upper != null) ? upper - lower : undefined
          } else {
            // New point (future)
            dataMap.set(label, {
              label,
              historical: undefined, // Predictions don't have historical data
              predicted: p.predicted_mw,
              lower,
              upper,
              bandWidth: (lower != null && upper != null) ? upper - lower : undefined
            })
          }
        })

        // 3. Convert back to array and sort by something more reliable than labels
        // Note: Map preserves insertion order, but we want chronological.
        // For now, index-based assignment is safe because we added entries chronologically.
        const combined = Array.from(dataMap.values()).map((pt, i) => ({
          ...pt,
          idx: i
        }))

        setChartData(combined)
      } catch (err) {
        console.error('Failed to build chart data:', err)
      }
    }

    if (!loading) {
      buildChart()
    }
  }, [loading, liveData?.usage_mw])

  // Tick countdown every second
  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(tick)
  }, [])

  // ── Derived values ──
  const pct = liveData?.capacity_percent ?? 0
  const status = liveData?.status ?? 'STABLE'

  const statusConfig = {
    STABLE:   { color: '#00c853', label: 'STABLE',   bg: 'rgba(0, 200, 83, 0.06)', border: 'rgba(0, 200, 83, 0.15)' },
    WARNING:  { color: '#ff9500', label: 'ELEVATED', bg: 'rgba(255, 149, 0, 0.06)', border: 'rgba(255, 149, 0, 0.15)' },
    CRITICAL: { color: '#ff3b30', label: 'CRITICAL', bg: 'rgba(255, 59, 48, 0.06)', border: 'rgba(255, 59, 48, 0.15)' },
  }
  const config = statusConfig[status] || statusConfig.STABLE

  // Bar gradient
  const barGradient = pct > 95
    ? 'linear-gradient(90deg, #ff3b30, #ff9500)'
    : pct > 85
    ? 'linear-gradient(90deg, #0070f3, #ff9500)'
    : 'linear-gradient(90deg, #0070f3, #00d4ff)'

  // Countdown to next risk
  const nextRisk = predictions.find(p =>
    new Date(p.timestamp) > now && (p.risk_level === 'warning' || p.risk_level === 'critical')
  )
  const countdown = (() => {
    if (!nextRisk) return null
    const diff = new Date(nextRisk.timestamp) - now
    if (diff <= 0) return null
    return {
      hours: Math.floor(diff / 3600000),
      mins: Math.floor((diff % 3600000) / 60000),
      secs: Math.floor((diff % 60000) / 1000),
      risk: nextRisk.risk_level,
    }
  })()

  // ── Loading skeleton ──
  if (loading) return (
    <div style={{
      background: '#0a0a0a',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '12px',
      padding: '28px 32px',
      minHeight: '440px',
    }}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .sk { background: linear-gradient(90deg, #111 25%, #1a1a1a 50%, #111 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; border-radius: 6px; }
      `}</style>
      <div className="sk" style={{ height: '12px', width: '30%', marginBottom: '20px' }} />
      <div className="sk" style={{ height: '48px', width: '50%', marginBottom: '8px' }} />
      <div className="sk" style={{ height: '12px', width: '38%', marginBottom: '24px' }} />
      <div className="sk" style={{ height: '4px', width: '100%', marginBottom: '28px' }} />
      <div className="sk" style={{ height: '300px', width: '100%' }} />
    </div>
  )

  return (
    <div style={{
      background: '#0a0a0a',
      border: `1px solid ${config.border}`,
      borderRadius: '12px',
      overflow: 'hidden',
      fontFamily: "'Inter', sans-serif",
      transition: 'border-color 0.5s',
    }}>
      {/* ═══ TOP: Current Status Bar ═══ */}
      <div style={{
        padding: '28px 32px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '20px',
      }}>
        {/* Left: MW reading */}
        <div>
          <div style={{ fontSize: '12px', color: '#555', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Alberta Grid — Live
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
            <span style={{
              fontSize: '48px',
              fontWeight: '700',
              fontFamily: "'SF Mono', 'Fira Code', monospace",
              color: config.color,
              lineHeight: '1',
              letterSpacing: '-2px',
            }}>
              {liveData?.usage_mw?.toLocaleString()}
            </span>
            <span style={{ fontSize: '18px', color: '#555' }}>MW</span>
          </div>
          <div style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>
            {pct}% of {MAX_CAPACITY.toLocaleString()} MW capacity
          </div>
        </div>

        {/* Right: Status badge + countdown */}
        <div style={{ textAlign: 'right' }}>
          {/* Status badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 18px',
            background: config.bg,
            border: `1px solid ${config.border}`,
            borderRadius: '8px',
            marginBottom: '12px',
          }}>
            <span style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: config.color,
              boxShadow: `0 0 8px ${config.color}`,
            }} />
            <span style={{ fontSize: '15px', fontWeight: '700', color: config.color, letterSpacing: '1px' }}>
              {config.label}
            </span>
          </div>
          {/* Countdown */}
          {countdown && (
            <div style={{ fontSize: '13px', color: '#888' }}>
              Next {countdown.risk === 'critical' ? 'critical' : 'elevated'} period in{' '}
              <span style={{ color: '#ededed', fontFamily: "'SF Mono', monospace", fontWeight: '600' }}>
                {countdown.hours}h {countdown.mins}m {countdown.secs}s
              </span>
            </div>
          )}
          {!countdown && (
            <div style={{ fontSize: '13px', color: '#00c853' }}>
              ✓ No risk periods ahead
            </div>
          )}
        </div>
      </div>

      {/* Capacity bar */}
      <div style={{ padding: '0 32px 24px' }}>
        <div style={{
          width: '100%', height: '4px', background: '#1a1a1a', borderRadius: '2px', overflow: 'hidden',
        }}>
          <div style={{
            width: `${pct}%`, height: '100%', background: barGradient,
            borderRadius: '2px', transition: 'width 0.7s ease',
          }} />
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />

      {/* ═══ MIDDLE: Usage Chart ═══ */}
      <div style={{ padding: '24px 32px 8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <span style={{ fontSize: '14px', color: '#888' }}>
            24h Historical → 24h Predicted
          </span>
          <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'inline-block', width: '16px', height: '2px', background: '#0070f3' }} />
              <span style={{ color: '#555' }}>Actual</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'inline-block', width: '16px', height: '2px', background: '#00d4ff', borderTop: '2px dashed #00d4ff' }} />
              <span style={{ color: '#555' }}>Predicted</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'inline-block', width: '16px', height: '8px', background: 'rgba(0,212,255,0.12)', border: '1px solid rgba(0,212,255,0.25)', borderRadius: '2px' }} />
              <span style={{ color: '#555' }}>Confidence</span>
            </span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={420}>
          <ComposedChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis
              dataKey="idx"
              tick={{ fill: '#555', fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
              interval="preserveStartEnd"
              tickFormatter={(idx) => {
                const pt = chartData[idx]
                return pt?.label || ''
              }}
            />
            <YAxis
              domain={[8000, 12500]}
              tick={{ fill: '#555', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => `${(v / 1000).toFixed(1)}k`}
            />
            <Tooltip content={<ChartTooltip />} />
            <ReferenceLine
              y={MAX_CAPACITY}
              stroke="#ff3b30"
              strokeDasharray="8 4"
              strokeWidth={1}
              label={{ value: 'Max Capacity', fill: '#ff3b30', fontSize: 10, position: 'right' }}
            />
            <Line
              type="monotone"
              dataKey="historical"
              stroke="#0070f3"
              strokeWidth={2}
              dot={false}
              activeDot={false}
              name="Actual"
              connectNulls={false}
            />
            <Area
              type="monotone"
              dataKey="lower"
              stackId="band"
              stroke="none"
              fill="transparent"
              connectNulls={false}
              activeDot={false}
              name="Lower"
            />
            <Area
              type="monotone"
              dataKey="bandWidth"
              stackId="band"
              stroke="none"
              fill="rgba(0,212,255,0.12)"
              connectNulls={false}
              activeDot={false}
              name="Band"
            />
            <Line
              type="monotone"
              dataKey="predicted"
              stroke="#00d4ff"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              activeDot={false}
              name="Predicted"
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* ═══ BOTTOM: Footer info ═══ */}
      <div style={{
        padding: '12px 32px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '12px',
        color: '#555',
      }}>
        <span>
          {liveData?.is_mock && '⚠️ Demo mode — cached data • '}
          Updated {liveData?.last_updated
            ? new Date(liveData.last_updated).toLocaleTimeString()
            : '--'}
        </span>
        <span>
          Source: AESO • Model: Prophet
        </span>
      </div>
    </div>
  )
}
