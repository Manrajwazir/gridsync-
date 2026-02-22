import { supabase } from '../../lib/supabase'
import { useState, useEffect } from 'react'

export default function OperatorAlerts() {
  const [autoAlert, setAutoAlert] = useState(true)
  const [advance24h, setAdvance24h] = useState(true)
  const [sending, setSending] = useState(false)
  const [alerts, setAlerts] = useState([])

  // Fetch alert history
  useEffect(() => {
    async function fetchAlerts() {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false })
      if (!error && data) setAlerts(data)
    }
    fetchAlerts()
  }, [])

  const sendManualAlert = async () => {
    setSending(true)
    try {
      const { data, error } = await supabase
        .from('alerts')
        .insert([{
          message: 'CRITICAL: Alberta grid demand is high. Please reduce usage where possible.',
          type: 'critical',
          is_active: true
        }])
        .select()
      
      if (error) throw error
      
      // Update local state to show new alert at top
      if (data) setAlerts(prev => [data[0], ...prev])
      alert('Alert sent successfully to all users!')
    } catch (err) {
      console.error(err)
      alert('Failed to send alert.')
    } finally {
      setSending(false)
    }
  }

  const toggleStyle = (on) => ({
    width: '36px',
    height: '20px',
    borderRadius: '10px',
    background: on ? '#0070f3' : '#333',
    position: 'relative',
    cursor: 'pointer',
    transition: 'background 0.2s',
    border: 'none',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
  })

  const dotStyle = (on) => ({
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    background: '#fff',
    position: 'absolute',
    left: on ? '18px' : '2px',
    transition: 'left 0.2s',
  })

  return (
    <div style={{ padding: '32px 40px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: '700',
          color: '#ededed',
          margin: 0,
          letterSpacing: '-0.5px',
        }}>
          Alert Management
        </h1>
        <p style={{
          fontSize: '13px',
          color: '#555',
          margin: '6px 0 0',
        }}>
          Configure consumer alerts and review engagement
        </p>
      </div>

      {/* Config panel */}
      <div style={{
        background: '#0a0a0a',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '10px',
        padding: '24px',
        marginBottom: '28px',
      }}>
        <div style={{ fontSize: '14px', color: '#ededed', fontWeight: '600', marginBottom: '20px' }}>
          Alert Settings
        </div>

        {[
          { label: 'Auto-send alerts when usage > 95%', desc: 'Triggers push notifications to all registered consumers', state: autoAlert, set: setAutoAlert },
          { label: 'Notify consumers 24h in advance', desc: 'Sends early warning when Prophet predicts high demand', state: advance24h, set: setAdvance24h },
        ].map((setting, i) => (
          <div key={i} style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 0',
            borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
          }}>
            <div>
              <div style={{ fontSize: '13px', color: '#ccc' }}>{setting.label}</div>
              <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>{setting.desc}</div>
            </div>
            <button
              onClick={() => setting.set(!setting.state)}
              style={toggleStyle(setting.state)}
            >
              <span style={dotStyle(setting.state)} />
            </button>
          </div>
        ))}
      </div>

      {/* Send Alert Now */}
      <button 
        disabled={sending}
        onClick={sendManualAlert}
        style={{
          background: sending ? '#222' : 'rgba(255, 59, 48, 0.1)',
          border: '1px solid rgba(255, 59, 48, 0.2)',
          color: sending ? '#555' : '#ff3b30',
          padding: '12px 28px',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: '600',
          cursor: sending ? 'default' : 'pointer',
          marginBottom: '28px',
          fontFamily: "'Inter', sans-serif",
          opacity: sending ? 0.6 : 1,
        }}>
        {sending ? 'Sending Alert...' : 'Send Manual Alert to All Users'}
      </button>

      {/* Alert history */}
      <div style={{
        background: '#0a0a0a',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '10px',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ fontSize: '14px', color: '#ededed', fontWeight: '600' }}>
            Alert History
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              {['Sent', 'Type', 'Recipients', 'Participation', 'MW Saved'].map(h => (
                <th key={h} style={{
                  padding: '12px 24px',
                  textAlign: 'left',
                  color: '#555',
                  fontWeight: '500',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {alerts.map(alert => (
              <tr key={alert.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <td style={{ padding: '14px 24px', color: '#888' }}>
                  {new Date(alert.created_at).toLocaleString('en-CA', { 
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                  })}
                </td>
                <td style={{ padding: '14px 24px' }}>
                  <span style={{
                    fontSize: '11px',
                    padding: '3px 10px',
                    borderRadius: '4px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.3px',
                    background: alert.type === 'critical'
                      ? 'rgba(255, 59, 48, 0.1)' : 'rgba(255, 149, 0, 0.1)',
                    color: alert.type === 'critical' ? '#ff3b30' : '#ff9500',
                  }}>
                    {alert.type}
                  </span>
                </td>
                <td style={{ padding: '14px 24px', color: '#ccc', fontFamily: "'SF Mono', monospace" }}>
                  12,847
                </td>
                <td style={{ padding: '14px 24px', color: '#00c853', fontWeight: '600' }}>
                  {Math.floor(Math.random() * 20 + 50)}%
                </td>
                <td style={{ padding: '14px 24px', color: '#ccc', fontFamily: "'SF Mono', monospace" }}>
                  {(Math.random() * 5 + 12).toFixed(1)} MW
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
