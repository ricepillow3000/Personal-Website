/* Code only some screens need, downloaded the first time it is asked for, then shared (Nov 21, the code
   split: everything used to arrive in one file whichever page a visitor opened first).
   - the train and the station (subway.js, with station.js and sidegl.js): the title screen only. */
let subway;
export const loadSubway = () => (subway ||= import('./subway.js'));
