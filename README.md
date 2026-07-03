# CrimeDash — Thoothukudi District Police Crime Map

An interactive crime intelligence dashboard for Thoothukudi District Police. Live crime data is pulled from Google Sheets and plotted on an interactive map with filtering, clustering, heat maps, and atrocity-prone village tracking.

**Live:** https://crimemap-431808955237.asia-south1.run.app/

---

## Features

- **Interactive Map** — Point, Cluster, and Heat map views powered by Leaflet.js
- **Live Data from Google Sheets** — Crime data (100 Calls, Robbery/Theft, Hurt, POCSO, CCTV) fetched on demand
- **Subdivision Filter** — Filter incidents by police sub-division
- **Atrocity-Prone Villages** — Active and Dormant village overlays managed via Google Sheets
- **Custom Markers** — Add lat/lon markers with custom labels, colors, and event types
- **Police Map Overlay** — District police boundary map with adjustable transparency
- **Live Analytics** — Event type and location breakdown for the current map view
- **Dark / Light Theme**
- **Login Protected** — Flask-Login with admin authentication

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python / Flask |
| Frontend | React 19 + Vite |
| Styling | Tailwind CSS v4 |
| Map | Leaflet.js + MarkerCluster + Leaflet.heat |
| Data Source | Google Sheets via gspread |
| Auth | Flask-Login + Flask-WTF |
| Deployment | Gunicorn |

---

## Google Sheets Structure

The app reads from two workbooks:

### `Crime Map` (Workbook 1)
| Tab | Description |
|-----|-------------|
| `100_calls_new` | PCR 100 emergency call log |

### `Crime Map 2` (Workbook 2)
| Tab | Description |
|-----|-------------|
| `Robbrey-theft` | Robbery and theft incidents |
| `Hurt` | Hurt cases |
| `POCSO` | POCSO cases |
| `CCTV` | CCTV camera locations |
| `Atrocity-Active` | Atrocity-prone villages (active) |
| `Atrocity-Dormant` | Atrocity-prone villages (dormant) |
| `Subdivisions` | List of police sub-divisions |

### Atrocity Tab Format
| VillageName | Lat | Long |
|-------------|-----|------|
| Sathankulam | 8.4411 | 77.9094 |

### Subdivisions Tab Format
| SubdivisionName |
|-----------------|
| Kovilpatti |
| Maniyachi |

---

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/<your-org>/crimedash.git
cd crimedash
```

### 2. Python environment

```bash
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
```

### 3. Google Sheets credentials

Create a Google Cloud service account with **Google Sheets API** and **Google Drive API** enabled. Download the JSON key and save it as `credentials.json` in the project root.

Share both Google Sheet workbooks with the service account email.

### 4. Environment variables (optional)

| Variable | Default | Description |
|----------|---------|-------------|
| `SECRET_KEY` | `local-secret-key-for-testing-only` | Flask session secret |
| `ADMIN_PASSWORD` | `password123` | Dashboard login password |
| `GOOGLE_MAPS_API_KEY` | — | Google Maps API key for satellite layer |
| `GSPREAD_SERVICE_ACCOUNT` | — | Service account JSON as string (for cloud deploy) |

### 5. Build the frontend

```bash
cd frontend
npm install
npm run build
cd ..
```

### 6. Run

```bash
python app.py
```

Open `http://localhost:8080` and log in with username `admin`.

---

## Production Deployment

```bash
gunicorn -w 4 -b 0.0.0.0:8080 app:app
```

For cloud platforms (Render, Railway, etc.) set `GSPREAD_SERVICE_ACCOUNT` as an environment variable containing the full service account JSON string instead of using `credentials.json`.

---

## Project Structure

```
crimedash/
├── app.py                  # Flask backend
├── requirements.txt
├── credentials.json        # Google service account (do not commit)
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── constants.js
│   │   └── components/
│   │       ├── FilterPanel.jsx
│   │       ├── MapView.jsx
│   │       ├── Header.jsx
│   │       └── LoadingOverlay.jsx
│   └── package.json
├── static/
│   ├── react/              # Built frontend output
│   ├── geojson/            # Police boundary GeoJSON files
│   ├── images/             # District and subdivision map images
│   └── data/               # Fallback TSV data files
└── templates/
    └── index.html
```

---

## Security Notes

- `credentials.json` must be added to `.gitignore` — never commit it
- Change `ADMIN_PASSWORD` before any production deployment
- Change `SECRET_KEY` to a strong random value in production

---

## License

Internal use — Thoothukudi District Police.
