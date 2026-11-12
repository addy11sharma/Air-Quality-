# Lecture Hall Air Quality Monitor

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyourusername%2Flecture-hall-aq-monitor)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/python-%3E%3D3.9-blue.svg)](https://python.org/)

Real-time air quality monitoring for lecture halls using Indian government environmental data (CPCB/SAFAR via OpenAQ). Tracks CO₂, PM2.5, PM10, TVOC, temperature, and humidity with ventilation guidance.

## 🌟 Features

- **Real-time Data**: Fetches live data from 100+ government monitoring stations across India
- **5 Lecture Halls**: Pre-configured for Delhi with auto nearest-station detection
- **Comprehensive Metrics**: CO₂, PM2.5, PM10, TVOC, Temperature, Humidity, AQI
- **Ventilation Guidance**: Smart recommendations (Good / Needed / Critical) with fan speed
- **Interactive Charts**: 1h/6h/24h/7d trends for any parameter
- **No Build Step**: Plain HTML/CSS/JS - deploys instantly to Vercel
- **Python CLI**: `aq-monitor` for analysis and automation
- **Shared Core**: Identical math in JavaScript (web) and Python (CLI/tests)

## 🏗️ Architecture

```
lecture-hall-aq-monitor/
├── public/                 # Static website (served by Vercel)
│   ├── index.html          # Semantic HTML
│   ├── css/style.css       # CSS variables for light/dark theming
│   ├── js/
│   │   ├── aq-core.js      # Core math (AQI, thresholds, ventilation)
│   │   └── app.js          # UI logic
│   └── site.webmanifest    # PWA manifest
├── api/                    # Vercel serverless functions
│   └── air-quality/
│       ├── index.js        # Current data (proxies OpenAQ)
│       └── history.js      # Historical trends (mock for demo)
├── python/                 # Python package
│   ├── pyproject.toml
│   └── src/aqi/
│       ├── core.py         # Same math as aq-core.js
│       ├── cli.py          # `aq-monitor` command
│       └── __init__.py
├── tests/                  # JavaScript tests (node --test)
│   └── aq-core.test.js
├── python/tests/           # Python tests (pytest)
│   └── test_core.py
├── docs/                   # Documentation
├── vercel.json             # Vercel config (static + functions)
├── package.json            # npm scripts, dev deps
└── README.md
```

## 🚀 Quick Start

### Website (No Build)

```bash
# Clone and run
git clone https://github.com/yourusername/lecture-hall-aq-monitor.git
cd lecture-hall-aq-monitor
npm install
npm run dev          # Opens http://localhost:3000
```

### Python CLI

```bash
cd python
pip install -e ".[dev]"

# Calculate AQI
aq-monitor aqi --pm25 35 --pm10 65

# Parameter status
aq-monitor status pm25 40

# Ventilation recommendation
aq-monitor ventilation --co2 1200 --pm25 45 --aqi 120

# Find nearest hall
aq-monitor nearest 28.6139 77.2090

# List all halls
aq-monitor list-halls
```

## 🧪 Testing

```bash
# JavaScript tests
npm test

# Python tests
cd python && pytest
```

## 📊 Data Sources

| Source | Coverage | Parameters | Access |
|--------|----------|------------|--------|
| **OpenAQ** (CPCB/SAFAR) | 100+ stations across India | PM2.5, PM10, CO₂, NO₂, SO₂, O₃, CO, Temp, Humidity | Free API (optional key for higher limits) |
| **Fallback** | Simulated | All | Built-in (no API key needed) |

The app works **without any API key** - uses realistic simulated data when OpenAQ is unavailable.

## 🔧 Configuration

### Environment Variables (Vercel)

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAQ_API_KEY` | No | Free key at https://openaq.org/api for higher rate limits |

### Adding Lecture Halls

Edit `public/js/aq-core.js` and `python/src/aqi/core.py` (keep in sync):

```javascript
export const LECTURE_HALLS = [
  { id: "lh-001", name: "Lecture Hall A", building: "Engineering Block", floor: "Ground Floor", capacity: 120, lat: 28.6139, lon: 77.2090 },
  // Add more...
];
```

## 📱 PWA Support

Installable as a Progressive Web App on mobile for offline access to cached data.

## ♿ Accessibility

- Semantic HTML5 structure
- ARIA labels and live regions
- Keyboard navigation
- Focus indicators
- WCAG AA color contrast
- Reduced motion support

## 🔒 Security

- API keys server-side only (Vercel functions)
- CORS headers configured
- Security headers (CSP, X-Frame-Options, etc.)
- Input validation on all endpoints

## 🚀 Deploy to Vercel

1. Push to GitHub
2. Import at [vercel.com/new](https://vercel.com/new)
3. Add `OPENAQ_API_KEY` (optional) in Environment Variables
4. Deploy!

```bash
# Or with CLI
npm i -g vercel
vercel --prod
```

`vercel.json` already configures:
- Framework: "other" (static)
- Output: `public/`
- Serverless functions in `api/`
- Security headers

## 📄 License

MIT - see [LICENSE](LICENSE)

## 🙏 Acknowledgments

- [OpenAQ](https://openaq.org/) for free global air quality data access
- [CPCB](https://cpcb.nic.in/) & [SAFAR](https://safar.tropmet.res.in/) for monitoring infrastructure
- [Bricolage Grotesque](https://github.com/Mayenne/Bricolage-Grotesque) font