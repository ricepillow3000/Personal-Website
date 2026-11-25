import { $, esc, timeOfDay } from '../core/util.js';
import { resume } from '../data/resume.js';
import { loadWeather } from './weather.js';
import { cutType } from './cuttype.js';

/* Weather and sky icons, drawn for the site: black ink, white and yellow fills (no emoji). */
const ICONS = {
  sun: '<circle cx="12" cy="12" r="5" fill="#FFE11A" stroke="#0B0B0B" stroke-width="2"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4M4 4l3 3M17 17l3 3M4 20l3-3M17 7l3-3" stroke="#0B0B0B" stroke-width="2"/>',
  moon: '<path d="M16 3a9 9 0 1 0 5 15A8 8 0 0 1 16 3z" fill="#F5F5F0" stroke="#0B0B0B" stroke-width="2"/>',
  cloud: '<path d="M7 18h11a4 4 0 0 0 0-8 6 6 0 0 0-11.4-1.6A4.8 4.8 0 0 0 7 18z" fill="#F5F5F0" stroke="#0B0B0B" stroke-width="2" stroke-linejoin="round"/>',
  rain: '<path d="M2.5 12a9.5 9.5 0 0 1 19 0c-1.6-1.4-3.2-1.4-4.75 0-1.6-1.4-3.2-1.4-4.75 0-1.6-1.4-3.2-1.4-4.75 0-1.6-1.4-3.2-1.4-4.75 0z" fill="#E5191C" stroke="#0B0B0B" stroke-width="2" stroke-linejoin="round"/><path d="M12 12v7a2 2 0 0 1-4 0M12 2.5V1" fill="none" stroke="#0B0B0B" stroke-width="2" stroke-linecap="round"/>',
  snow: '<path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7M9 3.5l3 2.5 3-2.5M9 20.5l3-2.5 3 2.5" fill="none" stroke="#0B0B0B" stroke-width="2" stroke-linecap="round"/>',
  storm: '<path d="M6 14h11a4 4 0 0 0 0-8 6 6 0 0 0-11.4-1.6A4.6 4.6 0 0 0 6 14z" fill="#F5F5F0" stroke="#0B0B0B" stroke-width="2" stroke-linejoin="round"/><path d="M12 12l-3 6h3l-2 5 6-8h-3l2-3z" fill="#FFE11A" stroke="#0B0B0B" stroke-width="1.6" stroke-linejoin="round"/>',
  fog: '<path d="M3 8c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0M3 13c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0M3 18c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0" fill="none" stroke="#0B0B0B" stroke-width="2" stroke-linecap="round"/>',
};
const icon = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[k] || ICONS.sun}</svg>`;
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

let weather = null; // Atlanta's weather once it has loaded: { kind, word, temp }

/* The title's calendar (Nov 19, John's game-calendar references "5/02 Morning FRIDAY", an original
   take): one die-cut sticker. Black letters on a thick white cut edge with a thin black outer line:
   the month small in a heavy serif, the day huge, the sky (sun or moon on the visitor's clock) in
   black on its own jagged white burst, the time of day in heavy type, the weekday in mixed
   magazine letters on a tilted white strip, and Atlanta's live weather on a small red tag. */
export function renderDate() {
  const now = new Date();
  const tod = timeOfDay(now);
  const day = WEEKDAYS[now.getDay()];
  const wx = weather
    ? `<span class="cal-wx">${icon(weather.kind)}<span>ATL · ${esc(weather.word)} · ${weather.temp}°</span></span>`
    : '';
  $('#hudDate').innerHTML = `
    <div class="hud-cal" role="group" aria-label="${day}, ${MONTHS[now.getMonth()]} ${now.getDate()}, ${tod.label}${weather ? `. Atlanta weather: ${weather.word.toLowerCase()}, ${weather.temp} degrees` : ''}">
      <span class="cal-date hud-date" aria-hidden="true"><span class="cal-m">${now.getMonth() + 1}</span><span class="cal-sl">/</span><span class="cal-d">${String(now.getDate()).padStart(2, '0')}</span></span>
      <span class="cal-sky" aria-hidden="true">${icon(tod.icon)}</span>
      <span class="cal-tod" aria-hidden="true">${tod.label}</span>
      <span class="cal-week" aria-hidden="true">${cutType(day.toUpperCase(), now.getDay() + 3, { mixCase: true })}</span>
      ${wx ? wx.replace('<span class="cal-wx">', '<span class="cal-wx" aria-hidden="true">') : ''}
    </div>
`; // (Nov 22: the status line and "GSU · Class of 2029" left the calendar: the status is on the CONNECT card, the class year on STATS; nothing is said twice)
  return tod;
}

let started = false;
/** Draw the calendar now, keep it on the clock (the time of day turns over while you read), and
    add Atlanta's weather when it arrives. */
export function startCalendar() {
  const tod = renderDate();
  if (started) return tod;
  started = true;
  let last = `${new Date().getDate()}|${timeOfDay().key}`;
  setInterval(() => {
    const now = `${new Date().getDate()}|${timeOfDay().key}`;
    if (now !== last) { last = now; renderDate(); }
  }, 60 * 1000);
  loadWeather((w) => { weather = w; renderDate(); });
  return tod;
}
