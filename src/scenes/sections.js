/* The chapter pages: their titles (needed up front: menus, NEXT EPISODE, SAVE DATA) and a loader for each
   page's own code (src/scenes/chapters/*.js). Each chapter is its own file, downloaded the first time it is
   opened, or ahead of time once the page has settled (Nov 21, the code split). A deep link's chapter is
   fetched alongside the main code (vite.config.js adds a preload for the chapter in the address). */
export const SECTION_TITLES = { missions: 'MISSIONS', skills: 'SKILLS', different: 'MY EDGE', stats: 'STATS', 'side-quests': 'SIDE QUESTS', contact: 'CONTACT', system: 'SETTINGS', secret: 'BEHIND THE SCENES' };

const LOADERS = {
  missions: () => import('./chapters/missions.js'),
  skills: () => import('./chapters/skills.js'),
  different: () => import('./chapters/different.js'),
  stats: () => import('./chapters/stats.js'),
  'side-quests': () => import('./chapters/side-quests.js'),
  contact: () => import('./chapters/contact.js'),
  system: () => import('./chapters/system.js'),
  secret: () => import('./chapters/secret.js'),
};
const loaded = {};
const loading = {};
/** a chapter's module once it has arrived (null before) */
export const sectionModule = (id) => loaded[id] || null;
/** fetch a chapter's module (once); resolves to it */
export function loadSection(id) {
  loading[id] ||= LOADERS[id]().then((m) => (loaded[id] = m), (e) => { delete loading[id]; throw e; });
  return loading[id];
}
