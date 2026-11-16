import { unlock } from './achievements.js';

/* A note for the engineers who open dev tools. */
export function installConsole() {
  const red = 'background:#E5191C;color:#F5F5F0;font:900 16px Impact, sans-serif;padding:6px 12px;';
  const blk = 'background:#0B0B0B;color:#FFE11A;font:700 13px monospace;padding:4px 10px;';
  const art = [
    '      _       _           ',
    '     | | ___ | |__  _ __  ',
    '  _  | |/ _ \\| \'_ \\| \'_ \\ ',
    ' | |_| | (_) | | | | | | |',
    '  \\___/ \\___/|_| |_|_| |_|'
  ].join('\n');
  try {
    console.log(`%c${art}`, 'color:#E5191C;font:700 12px monospace;');
    console.log('%cHey dev.%c type john.run() to claim a secret.', red, blk);
  } catch {
    /* consoles can be locked down; never break the page over it */
  }

  const john = {
    run() {
      const lines = [
        '> booting PIRATE.exe ...',
        '> orchestrator agent ....... online',
        '> researcher agent ......... online',
        '> builder agent ............ online',
        '> test suite ............... 727/728 passed',
        '> status ................... open to opportunities',
        '> achievement unlocked: Inspector'
      ];
      lines.forEach((l, i) => setTimeout(() => console.log(`%c${l}`, i === lines.length - 1 ? blk : 'color:#9a9a96;font:12px monospace;'), i * 120));
      unlock('inspector');
      return 'Thanks for looking under the hood. — John';
    },
    toString: () => 'try john.run()'
  };
  Object.defineProperty(window, 'john', { value: john, configurable: true });
}
