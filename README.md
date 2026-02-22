# GridSync

### *Predicting stress. Coordinating action. Saving the Alberta Grid.*

![GridSync Dashboard](./Screenshot%202026-02-22%20013951.png)

**Live Application:** [gridsync-ten.vercel.app](https://gridsync-ten.vercel.app/)

---

## The Problem
Alberta's power grid is under increasing pressure. Cold snaps, extreme heat, and industrial growth lead to **demand spikes** that can exceed the grid's capacity (approaching the 13,000 MW threshold). We recently saw a new all-time record of **12,785 MW** in December 2025. When the grid fails, rolling blackouts occur, affecting hospitals, businesses, and homes.

## The Solution
GridSync is an AI-powered coordination platform that turns Albertans into a "virtual power plant." By predicting grid stress **24-48 hours in advance**, we give community members the time they need to shift their usage, preventing blackouts before they happen.

### How it works:
1.  **Monitor**: We pull real-time data directly from the **AESO (Alberta Electric System Operator)**.
2.  **Predict**: Our **Facebook Prophet** ML model forecasts demand based on historical patterns and weather data.
3.  **Alert**: If a crisis is predicted, operators trigger real-time **Supabase** notifications to all users.
4.  **Coordinate**: 10,000 households reducing just 2kW each (delaying a dryer, pre-heating a home) saves **20 MW**—enough to stabilize the grid.

---

## Technical Deep Dive: The ML Brain
GridSync isn't just a dashboard—it's backed by a sophisticated time-series forecasting model.

-   **Algorithm**: Facebook Prophet (Piecewise Linear Trend + Multiplicative Seasonality).
-   **Features**: Daily, Weekly, and Yearly seasonality layers + Temperature regressors.
-   **Accuracy**: ~98% precision within ±200 MW on held-out test data.
-   **Automation**: A **GitHub Action** re-trains and updates the 48-hour forecast daily at midnight UTC.

> [!TIP]
> **Curious about the math?** Check out our detailed [Prophet Math Breakdown](./prophet_math_breakdown.md) for a full look at the Fourier series and piecewise linear equations powering the predictions.

---

## Technical Architecture

| Layer           | Technology           | Role                                                      |
| :-------------- | :------------------- | :-------------------------------------------------------- |
| **Frontend**    | **Next.js 16**       | High-performance React framework for the dashboard.       |
| **Backend**     | **Supabase**         | Real-time WebSockets for emergency alerts & User Auth.    |
| **ML Pipeline** | **Python + Prophet** | The forecasting engine that generates `predictions.json`. |
| **Automation**  | **GitHub Actions**   | Daily automated model runs and data refreshes.            |
| **Data Source** | **AESO API**         | Real government grid data (Live & Historical).            |
| **Mapping**     | **Leaflet**          | Interactive Alberta grid risk visualization.              |

---

## Project Structure

```bash
gridsync/
├── model/                # ML Engine: Prophet scripts & trained model (.pkl)
├── components/           # UI: Live charts, Demand Gauge, Alberta Map
├── pages/                
│   ├── index.js          # Consumer Dashboard (Real-time alerts)
│   └── operator/        # Operator Suite (Emergency control center)
├── public/               # Live Data: predictions.json & accuracy.json
├── .github/workflows/    # Automation: Daily-repredict pipeline
└── lib/supabase.js       # Real-time connection layer
```

---

## Built For
**HACKED 2025** — University of Alberta.

*GridSync: Because a smarter grid starts with a more informed community.*

---

## License
MIT License
