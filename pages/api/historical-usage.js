/*
 * /api/historical-usage — Returns last 24h of Alberta grid demand
 *
 * Strategy:
 *   1. Fetch current live MW from AESO CSD API
 *   2. Upsert it into Supabase `grid_readings` table (dedup by hour)
 *   3. Query last 24 real readings from Supabase
 *   4. Backfill any gaps with a synthetic curve anchored to live MW
 *
 * This means the historical line:
 *   - Is 100% real AESO data once 24h of traffic has passed
 *   - Survives Vercel cold starts, multiple instances, redeployments
 *   - Degrades gracefully to a realistic synthetic curve on first load
 */

import { supabaseServer } from '../../lib/supabaseServer'

const MAX_CAPACITY = 13000

// ── Step 1: Get current live MW from AESO CSD ──
async function fetchCurrentAIL(apiKey) {
  try {
    const response = await fetch(
      'https://apimgw.aeso.ca/public/currentsupplydemand-api/v2/csd/summary/current',
      { headers: { 'API-Key': apiKey, 'Accept': 'application/json' } }
    )
    if (!response.ok) return null
    const data = await response.json()
    const report = data?.return || data
    const ail = parseFloat(
      report?.alberta_internal_load ??
      report?.totalNet ??
      report?.summary?.alberta_internal_load ?? 0
    )
    return isNaN(ail) || ail === 0 ? null : Math.round(ail)
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=55, stale-while-revalidate=120')

  const apiKey = process.env.AESO_API_KEY
  const anchor = parseFloat(req.query.anchor) || 11200

  // ── 1. Fetch current live reading ──
  let liveMw = null
  if (apiKey) {
    liveMw = await fetchCurrentAIL(apiKey)
  }

  // ── 2. Upsert into Supabase (dedup by hour bucket) ──
  if (liveMw && supabaseServer) {
    const now = new Date()
    // Round down to nearest hour for the dedup key
    const hourTimestamp = new Date(
      now.getFullYear(), now.getMonth(), now.getDate(), now.getHours()
    ).toISOString()

    const { error } = await supabaseServer
      .from('grid_readings')
      .upsert(
        { hour_timestamp: hourTimestamp, usage_mw: liveMw },
        { onConflict: 'hour_timestamp', ignoreDuplicates: false }
      )

    if (error) {
      // Table might not exist yet — log but don't crash
      console.warn('grid_readings upsert failed:', error.message)
    }
  }

  // ── 3. Query last 24 real readings from Supabase ──
  let realPoints = []
  if (supabaseServer) {
    const cutoff = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabaseServer
      .from('grid_readings')
      .select('hour_timestamp, usage_mw')
      .gte('hour_timestamp', cutoff)
      .order('hour_timestamp', { ascending: true })
      .limit(25)

    if (!error && data?.length) {
      realPoints = data.map(row => ({
        timestamp: row.hour_timestamp,
        usage_mw: row.usage_mw,
      }))
    }
  }

  // ── 4. Build final 24-point response ──
  if (realPoints.length >= 6) {
    // Enough real data — return it
    return res.status(200).json({
      data: realPoints,
      is_mock: false,
      count: realPoints.length,
    })
  }

  // Not enough real data yet — backfill gaps with synthetic curve
  const currentMw = liveMw || anchor
  const result = generateBackfill(currentMw, realPoints)

  return res.status(200).json({
    data: result,
    is_mock: realPoints.length === 0,
    real_points: realPoints.length,
  })
}

// Generates a 24-point synthetic curve, substituting any real points we have
function generateBackfill(anchorMw, realPoints) {
  const now = new Date()
  const result = []

  for (let i = 23; i >= 0; i--) {
    const time = new Date(now - i * 60 * 60 * 1000)
    const hourKey = new Date(
      time.getFullYear(), time.getMonth(), time.getDate(), time.getHours()
    ).toISOString()

    // Use real data if we have it for this hour
    const real = realPoints.find(pt => pt.timestamp.slice(0, 13) === hourKey.slice(0, 13))
    if (real) {
      result.push(real)
      continue
    }

    // Synthetic value based on typical Alberta hourly load curve
    const hour = time.getHours()
    let baseMW = 9200
    if (hour >= 6  && hour < 10) baseMW = 9200 + (hour - 6) * 350
    if (hour >= 10 && hour < 16) baseMW = 11400 + Math.sin(hour) * 200
    if (hour >= 16 && hour < 21) baseMW = 11400 + (hour - 16) * 250
    if (hour >= 21)              baseMW = 11800 - (hour - 21) * 400
    if (hour < 6)                baseMW = 9800  + hour * 80

    result.push({
      timestamp: time.toISOString(),
      usage_mw: Math.round(baseMW * (anchorMw / 10500)),
    })
  }

  return result
}
