import { $, esc, timeOfDay } from '../core/util.js';
import { resume } from '../data/resume.js';

const SUN = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="5" fill="#FFE11A" stroke="#0B0B0B" stroke-width="2"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4M4 4l3 3M17 17l3 3M4 20l3-3M17 7l3-3" stroke="#0B0B0B" stroke-width="2"/></svg>';
const MOON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 3a9 9 0 1 0 5 15A8 8 0 0 1 16 3z" fill="#F5F5F0" stroke="#0B0B0B" stroke-width="2"/></svg>';
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export function renderDate() {
  const now = new Date();
  const tod = timeOfDay(now);
  $('#hudDate').innerHTML = `
    <div class="hud-date">${now.getMonth() + 1}<small>/</small>${now.getDate()}</div>
    <div class="hud-day"><span class="hud-week">${DAYS[now.getDay()]}</span>
      <span class="hud-tod">${tod.icon === 'sun' ? SUN : MOON}${tod.label}</span></div>
    <div class="hud-meta"><span>${esc(resume.status)}</span><span>${esc(resume.school)}</span></div>`;
  return tod;
}
