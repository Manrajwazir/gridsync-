const MAX_CAPACITY = 11700

/*
 * /api/historical-usage — Returns last 24h of real Alberta grid demand
 *
 * Uses the AESO Pool Price Report API which includes hourly
 * alberta_internal_load (AIL) data.
 *
 * Falls back to generating mock data anchored to the current live usage
 * if the API key is missing or the request fails.
 */
export default async function handler(req, res) {
  const apiKey = process.env.AESO_API_KEY
  const anchor = parseFloat(req.query.anchor) || 10500

  if (!apiKey) {
    return res.status(200).json({
      data: generateFallbackData(anchor),
      is_mock: true,
    })
  }

  try {
    // Build date range: last 24 hours
    const now = new Date()
    const yesterday = new Date(now - 24 * 60 * 60 * 1000)

    const startDate = format(yesterday)
    const endDate = format(now)

    // Try multiple possible paths because AESO APIM documentation varies
    const paths = [
      `/public/poolpricereport-api/v1.1/poolprice`,
      `/public/poolpricereport-api/v1/poolprice`,
      `/public/poolpricereport-api/v1.1/price/poolPrice`,
    ]

    let json = null
    let usedUrl = ''

    for (const path of paths) {
      const url = `https://apimgw.aeso.ca${path}?startDate=${startDate}&endDate=${endDate}`
      try {
        const response = await fetch(url, {
          headers: {
            'API-Key': apiKey,
            'Accept': 'application/json',
          },
        })

        if (response.ok) {
          json = await response.json()
          usedUrl = url
          break
        } else {
          console.warn(`AESO Path discovery: 404/Error for ${url}`)
        }
      } catch (err) {
        console.warn(`Fetch error for ${url}: ${err.message}`)
      }
    }

    if (!json) {
      throw new Error(`AESO Pool Price API failed on all attempted paths`)
    }
    const reports = json?.return?.['Pool Price Report'] || json?.return || []

    if (!Array.isArray(reports) || reports.length === 0) {
      throw new Error('No data in AESO Pool Price response')
    }

    const hourlyData = []
    for (const entry of reports) {
      const ail = parseFloat(entry?.alberta_internal_load)
      if (!ail || isNaN(ail)) continue

      const timestamp = entry?.begin_datetime_utc || entry?.begin_datetime_mpt
      if (!timestamp) continue

      hourlyData.push({
        timestamp,
        usage_mw: Math.round(ail),
      })
    }

    const last24 = hourlyData.slice(-24)

    if (last24.length < 6) {
      throw new Error(`Only ${last24.length} data points — insufficient`)
    }

    res.status(200).json({
      data: last24,
      is_mock: false,
      count: last24.length,
    })
  } catch (e) {
    console.error('Historical usage API error:', e.message)
    res.status(200).json({
      data: generateFallbackData(anchor),
      is_mock: true,
      error: e.message,
    })
  }
}

// Fallback: creates a plausible 24h curve anchored to the provided MW value
function generateFallbackData(anchor) {
  const data = []
  const now = new Date()
  
  // Calculate a "base" for the hour=0 point to start roughly somewhere realistic
  // but we'll scale it so the last point (now) matches anchor exactly.
  const rawPoints = []
  for (let i = 23; i >= 0; i--) {
    const time = new Date(now - i * 60 * 60 * 1000)
    const hour = time.getHours()

    let baseMW = 9200
    if (hour >= 6 && hour < 10) baseMW = 9200 + (hour - 6) * 350
    if (hour >= 10 && hour < 16) baseMW = 11400 + Math.sin(hour) * 200
    if (hour >= 16 && hour < 21) baseMW = 11400 + (hour - 16) * 250
    if (hour >= 21) baseMW = 11800 - (hour - 21) * 400
    if (hour < 6) baseMW = 9800 + hour * 80
    
    rawPoints.push({ time, baseMW })
  }

  // Scale rawPoints so the last point matches the anchor exactly
  const lastRaw = rawPoints[rawPoints.length - 1].baseMW
  const scale = anchor / lastRaw

  return rawPoints.map(p => ({
    timestamp: p.time.toISOString(),
    usage_mw: Math.round(p.baseMW * scale + (Math.random() - 0.5) * 100),
  }))
}
