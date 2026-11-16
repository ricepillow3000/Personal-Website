import { store } from './store.js';
import { resume } from '../data/resume.js';

/* Saved progress (lives in localStorage through the store, so it survives closing the tab):
   every project cleared (visited its live app or code) + every main section opened. */
export const SECTIONS = [
  ['missions', 'Missions'],
  ['skills', 'Skills'],
  ['different', 'What makes me different'],
  ['stats', 'Stats'],
  ['side-quests', 'Side quests'],
  ['contact', 'Contact']
];

export function progress() {
  const st = store.get();
  const items = [
    ...resume.missions.map((m) => ({ label: `Clear ${m.target}`, done: (st.cleared || []).includes(m.id) })),
    ...SECTIONS.map(([id, label]) => ({ label: `Open ${label}`, done: (st.visited || []).includes(id) }))
  ];
  const done = items.filter((i) => i.done).length;
  return { items, done, total: items.length, all: done === items.length, any: done > 0 || (st.achievements || []).length > 1 };
}
