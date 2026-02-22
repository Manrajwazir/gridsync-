import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useUser } from '../hooks/useUser'
import { supabase } from '../lib/supabase'
import BoltRoundedIcon from '@mui/icons-material/BoltRounded'
import HomeRoundedIcon from '@mui/icons-material/HomeRounded'
import PersonRoundedIcon from '@mui/icons-material/PersonRounded'

/*
 * Profile Page — Shows real user data from Supabase
 * If logged in: shows email, role, stats from profiles table
 * If not logged in: shows sign in prompt
 */

export default function ProfilePage() {
  const { user, role, loading, signOut } = useUser()
  const [profile, setProfile] = useState(null)
  const router = useRouter()

  // Fetch full profile from Supabase
  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) setProfile(data)
      })
  }, [user])

  if (loading) {
    return (
      <div style={{ padding: '32px 20px', fontFamily: "'Inter', sans-serif" }}>
        <style>{`
          @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
          .sk { background: linear-gradient(90deg, #111 25%, #1a1a1a 50%, #111 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; border-radius: 6px; }
        `}</style>
        {/* Title */}
        <div className="sk" style={{ height: '22px', width: '80px', marginBottom: '24px' }} />
        {/* Avatar card */}
        <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '24px', marginBottom: '16px' }}>
          <div className="sk" style={{ width: '56px', height: '56px', borderRadius: '50%', marginBottom: '16px' }} />
          <div className="sk" style={{ height: '16px', width: '45%', marginBottom: '8px' }} />
          <div className="sk" style={{ height: '13px', width: '60%', marginBottom: '8px' }} />
          <div className="sk" style={{ height: '22px', width: '70px', borderRadius: '6px' }} />
        </div>
        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '16px' }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
              <div className="sk" style={{ height: '20px', width: '50%', margin: '0 auto 8px' }} />
              <div className="sk" style={{ height: '11px', width: '60%', margin: '0 auto' }} />
            </div>
          ))}
        </div>
      </div>
    )
  }


  // Not logged in
  if (!user) {
    return (
      <div style={{ padding: '32px 20px' }}>
        <h1 style={{
          fontSize: '22px', fontWeight: '700', color: '#ededed',
          margin: '0 0 8px', letterSpacing: '-0.5px',
        }}>
          Profile
        </h1>
        <p style={{ fontSize: '14px', color: '#555', margin: '0 0 24px' }}>
          Sign in to track your energy savings and earn points.
        </p>

        <button
          onClick={() => router.push('/login')}
          style={{
            width: '100%', padding: '14px',
            background: '#0070f3', color: '#fff',
            border: 'none', borderRadius: '10px',
            fontSize: '15px', fontWeight: '600',
            cursor: 'pointer', fontFamily: "'Inter', sans-serif",
          }}
        >
          Sign In / Sign Up
        </button>
      </div>
    )
  }

  const displayName = profile?.display_name ?? user.email?.split('@')[0]

  return (
    <div style={{ padding: '32px 20px' }}>
      <h1 style={{
        fontSize: '22px', fontWeight: '700', color: '#ededed',
        margin: '0 0 24px', letterSpacing: '-0.5px',
      }}>
        Profile
      </h1>

      {/* User card */}
      <div style={{
        background: '#0a0a0a',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '16px',
      }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '50%',
          background: role === 'operator'
            ? 'linear-gradient(135deg, #0070f3, #00d4ff)'
            : 'linear-gradient(135deg, #00c853, #00e676)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '22px', marginBottom: '16px',
        }}>
          {role === 'operator'
            ? <BoltRoundedIcon sx={{ fontSize: 26, color: '#fff' }} />
            : <HomeRoundedIcon sx={{ fontSize: 26, color: '#fff' }} />}
        </div>

        <div style={{ fontSize: '16px', fontWeight: '600', color: '#ededed', marginBottom: '4px' }}>
          {displayName}
        </div>
        <div style={{ fontSize: '13px', color: '#555', marginBottom: '4px' }}>
          {user.email}
        </div>
        <div style={{
          display: 'inline-block',
          padding: '3px 10px', borderRadius: '6px',
          fontSize: '11px', fontWeight: '600',
          letterSpacing: '0.5px', textTransform: 'uppercase',
          background: role === 'operator' ? 'rgba(0,112,243,0.12)' : 'rgba(0,200,83,0.12)',
          color: role === 'operator' ? '#4d94ff' : '#00c853',
          marginTop: '8px',
        }}>
          {role}
        </div>
      </div>

      {/* Stats row — real data from Supabase */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: '10px', marginBottom: '16px',
      }}>
        {[
          { label: 'Role', value: role === 'operator' ? 'Operator' : 'Consumer' },
          { label: 'Joined', value: profile?.created_at
            ? new Date(profile.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
            : '—'
          },
        ].map((s, i) => (
          <div key={i} style={{
            background: '#0a0a0a',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '10px', padding: '16px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#ededed' }}>
              {s.value}
            </div>
            <div style={{ fontSize: '11px', color: '#555', marginTop: '4px' }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Energy Impact Section — Add purpose */}
      <div style={{
        background: '#0a0a0a',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
      }}>
        <div style={{
          fontSize: '13px', fontWeight: '700', color: '#00c853',
          textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px'
        }}>
          Energy Impact
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#ededed' }}>14.2 kW</div>
            <div style={{ fontSize: '12px', color: '#555', marginTop: '2px' }}>Total Grid Reduction</div>
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#ededed' }}>$8.50</div>
            <div style={{ fontSize: '12px', color: '#555', marginTop: '2px' }}>Estimated Savings</div>
          </div>
        </div>
        <div style={{
          marginTop: '20px', padding: '12px',
          background: 'rgba(0,112,243,0.06)', borderRadius: '8px',
          fontSize: '12px', color: '#4d94ff', lineHeight: '1.4'
        }}>
          💡 Your contribution helped stabilize the Alberta grid during 3 critical peaks this month.
        </div>
      </div>

      {/* Actions */}
      <div style={{
        background: '#0a0a0a',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '12px', overflow: 'hidden',
      }}>
        {role === 'operator' && (
          <button onClick={() => router.push('/operator')} style={actionBtnStyle}>
            <span>⚡ Switch to Operator Dashboard</span>
            <span style={{ color: '#333' }}>→</span>
          </button>
        )}
        <button
          onClick={async () => { await signOut(); router.push('/login') }}
          style={{ ...actionBtnStyle, color: '#ff3b30', borderBottom: 'none' }}
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}

const actionBtnStyle = {
  width: '100%', padding: '16px 20px',
  background: 'transparent', border: 'none',
  borderBottom: '1px solid rgba(255,255,255,0.04)',
  color: '#4d94ff', fontSize: '14px',
  cursor: 'pointer', textAlign: 'left',
  fontFamily: "'Inter', sans-serif",
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
}
