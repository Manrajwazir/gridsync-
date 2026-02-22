import pickle, json, requests, pandas as pd
from datetime import datetime

with open('model/alberta_model.pkl', 'rb') as f:
    model = pickle.load(f)

# Get fresh weather forecast
url = 'https://api.open-meteo.com/v1/forecast'
params = {
    'latitude': 53.5461,
    'longitude': -113.4938,
    'hourly': 'temperature_2m',
    'timezone': 'America/Edmonton',
    'forecast_days': 3
}
data = requests.get(url, params=params).json()

# Strip timezone info so keys match naive Timestamps in future df
weather = dict(zip(
    pd.to_datetime(data['hourly']['time']).tz_localize(None),
    data['hourly']['temperature_2m']
))

print(f"🌡️  Weather: {len(weather)} hours fetched, sample temp: {list(weather.values())[0]}°C")

# ── Build future dates starting from RIGHT NOW ──
now = pd.Timestamp.now().floor('h')
future_dates = pd.date_range(start=now, periods=48, freq='h')

future = pd.DataFrame({'ds': future_dates})
future['temperature_c'] = future['ds'].apply(lambda x: weather.get(x, None))

# Log how many matched
matched = future['temperature_c'].notna().sum()
print(f"   Matched {matched}/48 hours with weather data")

# Fill any gaps with -10 as fallback
future['temperature_c'] = future['temperature_c'].fillna(-10)
future['is_weekend']    = (future['ds'].dt.dayofweek >= 5).astype(int)

forecast = model.predict(future)

def get_risk(mw):
    if mw > 11500: return 'critical'
    if mw > 10500: return 'warning'
    return 'safe'

results = []
for i, row in forecast.iterrows():
    mw = max(0, round(row['yhat']))
    temp = future.loc[i, 'temperature_c'] if i in future.index else 0
    results.append({
        'timestamp':     row['ds'].isoformat(),
        'predicted_mw':  mw,
        'lower_bound':   max(0, round(row['yhat_lower'])),
        'upper_bound':   round(row['yhat_upper']),
        'capacity_pct':  round((mw / 11700) * 100, 1),
        'risk_level':    get_risk(mw),
        'temperature_c': round(temp, 1),
    })

with open('public/predictions.json', 'w') as f:
    json.dump({'generated_at': datetime.now().isoformat(), 'predictions': results}, f, indent=2)

print(f"✅ Done — {len(results)} predictions generated")
print(f"📅 First: {results[0]['timestamp'][:16]}")
print(f"📅 Last:  {results[-1]['timestamp'][:16]}")
print(f"⚡ Peak:  {max(results, key=lambda x: x['predicted_mw'])['timestamp'][:16]}")