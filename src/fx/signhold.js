/* The departure board's hold (see station.js): set the moment a file is played, so the board keeps its place, or
   stays out, for the whole train shot. A flag on its own, so the main code can set it without downloading the
   station's code (Nov 21, the code split: the station loads with the platform picture). */
let held = false;
export function holdSign(on) { held = Boolean(on); }
export const signHeld = () => held;
