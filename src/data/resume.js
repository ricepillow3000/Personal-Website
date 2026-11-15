/* =====================================================================
   ALL RESUME CONTENT LIVES HERE (plus script.js for John's lines and
   companies.js for ?company= personalization). Edit text here only.
   Never add a phone number to this file — the site is public.
   ===================================================================== */

export const resume = {
  name: 'John Nguyen',
  first: 'JOHN',
  codename: 'PIRATE',
  role: 'AI Solutions Engineer in training',
  hook: "I direct AI agents to build software, then test it like it's going to production.",
  status: 'Status: open to opportunities',
  school: 'GSU · Class of 2029',
  location: 'Atlanta Metropolitan Area',

  links: {
    linkedin: 'https://www.linkedin.com/in/john-n-7978b72b8',
    email: 'john4000.nguyen@gmail.com',
    github: 'https://github.com/ricepillow3000',
    pdf: 'assets/John_Nguyen_Resume.pdf'
  },

  motto: {
    text: "It's not the final judgement of good and evil that's important. What matters is that you come to that decision yourself. That you agonize over it and eventually accept it.",
    by: 'Akane Tsunemori'
  },

  education: {
    school: 'Georgia State University',
    place: 'Atlanta, GA',
    degree: 'Bachelor of Business Administration, Computer Information Systems',
    concentration: 'AI & Analytics',
    dates: 'Aug 2025 — Present',
    grad: 'Class of 2029',
    gpa: '3.88',
    honors: "Dean's List: Fall 2025, Spring 2026"
  },

  /* HUD bars: real proof by default, fun stats on the flip side. */
  bars: {
    proof: [
      { label: 'GPA', value: 3.88, max: 4, text: '3.88' },
      { label: 'CHECKS', value: 727, max: 728, text: '727/728' }
    ],
    fun: [
      { label: 'DRUMS', value: 200, max: 240, text: '200+ BPM' },
      { label: 'BEE FEAR', value: 1, max: 1, text: 'MAX 🐝' }
    ]
  },

  missions: [
    {
      id: 'meliona',
      name: 'Portfolio Risk Engine',
      target: 'Meliona',
      grade: 'S',
      status: 'LIVE',
      dates: 'Jun 2026 — Present',
      stack: ['Python', 'JavaScript', 'Docker'],
      brief: 'How much could a portfolio lose in a bad year? 10,000 simulated years answer it.',
      objectives: [
        'Designed and launched a public web app that estimates how much a portfolio of stocks, ETFs, FX or futures could lose in a bad year.',
        'Runs 10,000 simulated years on live data from Yahoo Finance.',
        'Built 300+ test cases and a live-data audit to cross-verify the risk engine.',
        'Directed AI coding agents in a three-role workflow (orchestrator, researcher, builder) to write 7,700+ lines of Python.'
      ],
      loot: ['727 of 728 checks passed', '7,700+ lines of Python', '6 GitHub Actions workflows', '5-check validation gate'],
      live: 'https://summer-2026-quant-project-risk-engine-blueprint-production.up.railway.app/',
      repo: 'https://github.com/ricepillow3000/Summer-2026-Quant-Project-Risk-Engine-Blueprint'
    },
    {
      id: 'arcas',
      name: 'Excel Add-in',
      target: 'ARCAS',
      grade: 'S',
      status: 'LIVE',
      dates: 'Sep 2026 — Present',
      stack: ['Python', 'Flask', 'JavaScript', 'CI/CD'],
      brief: 'Finds the broken cells in your spreadsheet and explains them in plain English.',
      objectives: [
        'Built and launched a Windows Excel add-in with 21 data checks, plain-language explanations for flagged cells, and suggested fixes.',
        'Powered by a Python Flask REST API and a JavaScript (Office.js) task pane.',
        'Wrote 1,700+ automated tests, plus mutation tests that plant 171 bugs across 70 guards to prove detection works.',
        'Traced false alarms to "NA" codes and blank cells, cutting them sharply while still catching every planted error.'
      ],
      loot: ['199 of 201 hidden errors caught', 'False alarms 5,022 → 710 (−86%)', '1,700+ automated tests', '42 unseen test sheets'],
      bestStat: '199 / 201',
      live: 'https://ricepillow3000.github.io/excel-anomaly-hunter/',
      repo: 'https://github.com/ricepillow3000/excel-anomaly-hunter'
    }
  ],

  /* Ranks 1–10, or 'MAX'. Each one is backed by proof. */
  skills: [
    { id: 'testing', name: 'Testing / QA', rank: 'MAX', proof: '2,000+ automated tests across 2 apps' },
    { id: 'agents', name: 'AI Agents (Claude Code)', rank: 9, proof: '3-role agent workflow: orchestrator, researcher, builder' },
    { id: 'python', name: 'Python', rank: 8, proof: '7,700+ lines in Meliona · ARCAS backend' },
    { id: 'aieval', name: 'AI Evaluation', rank: 8, proof: 'Live-data audits · 727/728 checks passed' },
    { id: 'cicd', name: 'GitHub Actions (CI/CD)', rank: 7, proof: '6 workflows: lint, security scan, 3 test suites' },
    { id: 'flask', name: 'Flask', rank: 7, proof: 'ARCAS REST API' },
    { id: 'git', name: 'Git / GitHub', rank: 7, proof: 'Both projects, public repos' },
    { id: 'js', name: 'JavaScript', rank: 6, proof: 'Office.js task pane · web UIs' },
    { id: 'docker', name: 'Docker', rank: 6, proof: 'Meliona deployment' }
  ],

  different: [
    { title: 'I ship, not just study', fact: 'Two live apps, launched while keeping a 3.88 GPA.' },
    { title: 'I test like it’s production', fact: '2,000+ automated tests. 199 of 201 hidden errors caught. False alarms cut 86%.' },
    { title: 'I manage AI agents', fact: 'I run an orchestrator / researcher / builder agent team — the core skill of an AI Solutions Engineer.' },
    { title: 'I lead under pressure', fact: 'Elected team leader. Ran a banquet floor of new servers on the club’s busiest day of the year.' }
  ],

  sideQuests: [
    {
      title: 'Team Leader (elected)',
      place: 'Business Model Canvas',
      dates: 'Aug 2026 — Present',
      did: [
        'Coordinated 35 assignments across seven weekly rounds for a five-person team.',
        'Spearheaded a pivot to commuters after spotting missed parking-deck opportunities; pitched three high-traffic locations and a contactless sampling plan with geofence advertising.'
      ],
      lesson: 'I can turn five opinions into one plan — and change course when the data says so.'
    },
    {
      title: 'Banquet Server',
      place: 'Dunwoody Country Club',
      dates: 'Feb 2026 — Present',
      did: [
        'Led a section of 5 new servers and temps on July 4th, the club’s busiest day, coaching each one live.',
        'Set up shortcuts and pre-placed supplies for accurate, on-time service at 5 weekly banquets.'
      ],
      lesson: 'I onboard people fast, under real pressure.'
    },
    {
      title: 'Food Server',
      place: 'The Sparrow',
      dates: 'May 2025 — Aug 2025',
      did: ['Mentored new hires on menu, POS and table flow while running a full section; named in six positive Google reviews.'],
      lesson: 'I stay calm and friendly in front of real customers.'
    }
  ],

  funFacts: ['I play drums (200+ BPM on a good day).', 'Favorite band: Pierce the Veil.', 'Genuinely scared of bees and wasps.'],

  skillsLine: ['Python', 'JavaScript', 'Flask', 'Docker', 'Git', 'GitHub Actions (CI/CD)', 'Claude Code (multi-agent workflows)', 'AI Evaluation'],

  /* Asset switches — flip to true once the real files are in public/assets. */
  assets: {
    drumSamples: false, // public/assets/audio/{hat,snare,kick,crash,toms}.ogg
    drumLoop: false // public/assets/audio/loop.ogg
  },

  analytics: { goatcounter: '' } // e.g. 'johnnguyen' → https://johnnguyen.goatcounter.com/count
};
