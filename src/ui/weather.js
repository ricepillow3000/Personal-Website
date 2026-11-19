/* Live weather for the title's calendar (Nov 19, John: "a day and date counter, the time of day
   and the weather", from his game-calendar references). It is Atlanta's weather, John's city, not
   the visitor's: no location is asked for or sent, only Atlanta's fixed coordinates. Open-Meteo is
   free, keyless and cookie-free. Fetched after the page is idle, cached for 30 minutes, given 5
   seconds; if anything fails the badge simply stays hidden. */

const URL = 'https://api.open-meteo.com/v1/forecast?latitude=33.749&longitude=-84.388&current=temperature_2m,weather_code,is_day&temperature_unit=fahrenheit&timezone=auto';
const KEY = 'jn-wx';
const FRESH = 30 * 60 * 1000;

/** WMO weather code -> what the calendar shows */
export function weatherFor(code, isDay = 1) {
  const c = Number(code);
  if (c === 0 || c === 1) return { kind: isDay ? 'sun' : 'moon', word: 'CLEAR' };
  if (c === 2 || c === 3) return { kind: 'cloud', word: 'CLOUDY' };
  if (c === 45 || c === 48) return { kind: 'fog', word: 'FOGGY' };
  if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82)) return { kind: 'rain', word: 'RAIN' };
  if ((c >= 71 && c <= 77) || c === 85 || c === 86) return { kind: 'snow', word: 'SNOW' };
  if (c >= 95 && c <= 99) return { kind: 'storm', word: 'STORM' };
  return null;
}

function cached() {
  try {
    const v = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    return v && Date.now() - v.at < FRESH ? v.data : null;
  } catch {
    return null;
  }
}

/** Calls back once with { kind, word, temp } (or never, if the weather can't be had). */
export function loadWeather(cb) {
  const use = (cur) => {
    const w = cur && weatherFor(cur.weather_code, cur.is_day);
    if (w && Number.isFinite(cur.temperature_2m)) cb({ ...w, temp: Math.round(cur.temperature_2m) });
  };
  const hit = cached();
  if (hit) {
    use(hit);
    return;
  }
  const go = () => {
    if (!window.fetch) return;
    const ctl = window.AbortController ? new AbortController() : null;
    const stop = setTimeout(() => ctl?.abort(), 5000);
    fetch(URL, { signal: ctl?.signal, credentials: 'omit', referrerPolicy: 'no-referrer' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.current) return;
        try { sessionStorage.setItem(KEY, JSON.stringify({ at: Date.now(), data: d.current })); } catch { /* private mode */ }
        use(d.current);
      })
      .catch(() => {})
      .finally(() => clearTimeout(stop));
  };
  (window.requestIdleCallback || setTimeout)(go, { timeout: 3000 });
}
