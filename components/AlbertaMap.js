import { useEffect, useRef } from 'react'

/*
 * AlbertaMap — Interactive risk map for the operator dashboard
 *
 * Shows Alberta's major cities with color-coded risk markers based on
 * current grid status. Uses Leaflet via CDN (loaded in useEffect) to
 * avoid SSR issues with Next.js.
 *
 * Risk colors: green (safe) → amber (warning) → red (critical)
 */

const ALBERTA_CITIES = [
  { name: 'Edmonton',       lat: 53.5461,  lng: -113.4937, population: 1010899, risk: 'warning'  },
  { name: 'Calgary',        lat: 51.0447,  lng: -114.0719, population: 1336000, risk: 'critical' },
  { name: 'Red Deer',       lat: 52.2681,  lng: -113.8112, population: 100402,  risk: 'warning'  },
  { name: 'Lethbridge',     lat: 49.6956,  lng: -112.8451, population: 98406,   risk: 'safe'     },
  { name: 'Fort McMurray',  lat: 56.7265,  lng: -111.3803, population: 88000,   risk: 'warning'  },
  { name: 'Medicine Hat',   lat: 50.0418,  lng: -110.6769, population: 63271,   risk: 'safe'     },
  { name: 'Grande Prairie', lat: 55.1707,  lng: -118.7884, population: 67294,   risk: 'safe'     },
  { name: 'Airdrie',        lat: 51.2917,  lng: -114.0144, population: 73698,   risk: 'critical' },
  { name: 'Sherwood Park',  lat: 53.5244,  lng: -113.3117, population: 76000,   risk: 'warning'  },
  { name: 'St. Albert',     lat: 53.6300,  lng: -113.6253, population: 71000,   risk: 'warning'  },
]

const RISK_COLORS = {
  safe:     { fill: '#00c853', glow: 'rgba(0, 200, 83, 0.4)',   label: 'STABLE'  },
  warning:  { fill: '#ff9500', glow: 'rgba(255, 149, 0, 0.4)',  label: 'ELEVATED'},
  critical: { fill: '#ff3b30', glow: 'rgba(255, 59, 48, 0.4)',  label: 'CRITICAL'},
}

function getMarkerSize(population) {
  if (population > 500000) return 22
  if (population > 100000) return 16
  if (population > 50000) return 13
  return 10
}

export default function AlbertaMap({ riskOverride }) {
  const mapRef = useRef(null)
  const instanceRef = useRef(null)

  useEffect(() => {
    if (instanceRef.current) return // already initialized

    // Dynamically load Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css'
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }

    // Dynamically load Leaflet JS
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => {
      const L = window.L
      if (!mapRef.current || instanceRef.current) return

      // Initialize map centered on Alberta
      const map = L.map(mapRef.current, {
        center: [54.5, -115.0],
        zoom: 6,
        zoomControl: false, // will add custom position below
        scrollWheelZoom: false, // prevents page scroll hijacking
        attributionControl: false,
      })

      // Move zoom control to bottom right so it doesn't cover labels
      L.control.zoom({ position: 'bottomright' }).addTo(map)

      instanceRef.current = map

      // Dark tile layer (CartoDB Dark Matter — free, no API key needed)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 18,
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
      }).addTo(map)

      // Add city markers
      ALBERTA_CITIES.forEach(city => {
        const risk = riskOverride || city.risk
        const colors = RISK_COLORS[risk] || RISK_COLORS.safe
        const size = getMarkerSize(city.population)

        const icon = L.divIcon({
          className: '',
          html: `
            <div style="
              width: ${size}px; height: ${size}px;
              border-radius: 50%;
              background: ${colors.fill};
              box-shadow: 0 0 ${size + 4}px ${colors.glow};
              border: 2px solid rgba(255,255,255,0.3);
              cursor: pointer;
              transition: all 0.2s;
            "></div>
          `,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        })

        const marker = L.marker([city.lat, city.lng], { icon }).addTo(map)

        marker.bindPopup(`
          <div style="
            font-family: 'Inter', sans-serif;
            min-width: 160px;
            background: #0a0a0a;
            border: 1px solid rgba(255,255,255,0.12);
            border-radius: 8px;
            overflow: hidden;
          ">
            <div style="padding: 12px 14px; border-bottom: 1px solid rgba(255,255,255,0.06);">
              <div style="font-size: 14px; font-weight: 700; color: #ededed; margin-bottom: 2px;">${city.name}</div>
              <div style="font-size: 11px; color: #555;">Pop. ${city.population.toLocaleString()}</div>
            </div>
            <div style="padding: 10px 14px;">
              <div style="
                display: inline-flex; align-items: center; gap: 6px;
                padding: 4px 10px;
                background: ${colors.fill}18;
                border: 1px solid ${colors.fill}44;
                border-radius: 5px;
                font-size: 11px; font-weight: 700; color: ${colors.fill};
                letter-spacing: 0.5px;
              ">
                <span style="width:6px; height:6px; border-radius:50%; background:${colors.fill};"></span>
                ${colors.label}
              </div>
            </div>
          </div>
        `, {
          className: 'gridsync-popup',
          closeButton: false,
        })
      })
    }
    document.head.appendChild(script)

    return () => {
      if (instanceRef.current) {
        instanceRef.current.remove()
        instanceRef.current = null
      }
    }
  }, [])

  return (
    <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        zIndex: 1000,
        padding: '14px 18px',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        pointerEvents: 'none',
      }}>
        <div style={{ fontFamily: "'Inter', sans-serif" }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#ededed', letterSpacing: '0.5px' }}>
            ALBERTA GRID — REGIONAL STATUS
          </div>
          <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>
            Click a city for details
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', pointerEvents: 'none' }}>
          {Object.entries(RISK_COLORS).map(([key, val]) => (
            <div key={key} style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              fontSize: '10px', color: '#666', fontFamily: "'Inter', sans-serif",
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: val.fill, flexShrink: 0 }} />
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </div>
          ))}
        </div>
      </div>

      {/* Map container */}
      <div
        ref={mapRef}
        style={{
          width: '100%',
          height: '360px',
          background: '#0a0a0a',
        }}
      />

      {/* Override Leaflet popup background via global style injection */}
      <style>{`
        .gridsync-popup .leaflet-popup-content-wrapper {
          background: transparent;
          border: none;
          box-shadow: none;
          padding: 0;
        }
        .gridsync-popup .leaflet-popup-content {
          margin: 0;
        }
        .gridsync-popup .leaflet-popup-tip {
          background: #0a0a0a;
        }
      `}</style>
    </div>
  )
}
