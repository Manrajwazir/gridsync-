const MAX_CAPACITY = 13000

/*
 * /api/historical-usage — Returns last 24h of Alberta grid demand
 *
 * Strategy: Since AESO's Pool Price Report API is no longer accessible
 * with a free API key, we build historical data by polling the live
 * Current Supply Demand API ourselves.
 *
 * On each call, we fetch the current live value from AESO CSD,
 * append it to an in-memory ring buffer (24 slots, 1 per hour),
 * and return the buffer contents.
 *
 * First load will only have 1 point — the fallback fills gaps
 * with a realistic synthetic curve anchored to the live value.
 */

// ── In-memory ring buffer: survives across requests in the same process ──
// On Vercel serverless, this resets on cold starts (~every 5–15 min of inactivity).
// That's fine — the fallback fills gaps smoothly.
const historicalCache = []
const MAX_POINTS = 25  // ~24h of hourly data + 1 buffer

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
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120')

  const apiKey = process.env.AESO_API_KEY
  const anchor = parseFloat(req.query.anchor) || 11200

  // 1. Try to fetch a fresh live data point
  let liveMw = null
  if (apiKey) {
    liveMw = await fetchCurrentAIL(apiKey)
  }

  // 2. Append to cache if we got a fresh reading (dedup by hour)
  if (liveMw) {
    const now = new Date()
    const hourKey = now.toISOString().slice(0, 13) // "2026-04-20T19"

    const lastEntry = historicalCache[historicalCache.length - 1]
    if (!lastEntry || lastEntry.hourKey !== hourKey) {
      historicalCache.push({
        hourKey,
        timestamp: now.toISOString(),
        usage_mw: liveMw,
      })
      // Trim to max size
      while (historicalCache.length > MAX_POINTS) {
        historicalCache.shift()
      }
    }
  }

  // 3. Build response: real cached points + synthetic backfill for gaps
  const realPoints = historicalCache.map(pt => ({
    timestamp: pt.timestamp,
    usage_mw: pt.usage_mw,
  }))

  if (realPoints.length >= 6) {
    // Enough real data — return it directly
    return res.status(200).json({
      data: realPoints,
      is_mock: false,
      count: realPoints.length,
      cache_size: historicalCache.length,
    })
  }

  // Not enough real data yet — fill the gap with synthetic curve
  // anchored to the most recent real value (or the anchor param)
  const currentMw = liveMw || anchor
  const synthetic = generateBackfill(currentMw, realPoints)

  return res.status(200).json({
    data: synthetic,
    is_mock: realPoints.length === 0,
    real_points: realPoints.length,
    cache_size: historicalCache.length,
  })
}

// Merges real cached points with synthetic backfill to produce 24 points
function generateBackfill(anchorMw, realPoints) {
  const now = new Date()
  const result = []

  // Generate 24 synthetic hourly points
  for (let i = 23; i >= 0; i--) {
    const time = new Date(now - i * 60 * 60 * 1000)
    const hourKey = time.toISOString().slice(0, 13)

    // Check if we have a real data point for this hour
    const real = realPoints.find(
      pt => pt.timestamp.slice(0, 13) === hourKey
    )

    if (real) {
      result.push(real)
    } else {
      // Generate synthetic value based on time-of-day curve
      const hour = time.getHours()
      let baseMW = 9200
      if (hour >= 6 && hour < 10) baseMW = 9200 + (hour - 6) * 350
      if (hour >= 10 && hour < 16) baseMW = 11400 + Math.sin(hour) * 200
      if (hour >= 16 && hour < 21) baseMW = 11400 + (hour - 16) * 250
      if (hour >= 21) baseMW = 11800 - (hour - 21) * 400
      if (hour < 6) baseMW = 9800 + hour * 80

      result.push({
        timestamp: time.toISOString(),
        usage_mw: Math.round(baseMW * (anchorMw / 10500)),
      })
    }
  }

  return result
}
