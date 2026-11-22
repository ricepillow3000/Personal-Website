/* =====================================================================
   ALL RESUME CONTENT LIVES HERE (plus script.js for John's lines and
   companies.js for ?company= personalization). Edit text here only.
   Never add a phone number to this file — the site is public.
   ===================================================================== */

export const resume = {
  name: 'John Nguyen',
  first: 'JOHN',
  role: 'AI Solutions Engineer in training',
  hook: "I direct AI agents to build software, then test it like it's going to production.",
  // the title screen tells the story; the board keeps the job line above
  titleHook: 'Resumes are boring. So I directed AI agents to make mine a game.', // (Nov 22: shortened from "...directed a crew of AI agents to turn mine into a game." so its box stays small on the station)
  status: 'Status: open to opportunities',
  // why this site exists, told as a work story (from DESIGN.md: the problem, the 10-second skim, the scrapped portrait, the agent crew)
  siteStory: [
    ['SETUP', 'Persona 5 has been impactful in my life. Its hero is treated as guilty before he can speak, and I know that frustration of being judged unfairly. A paper resume gets judged in seconds too, so I built mine as a game you play first.'], // (Nov 22, John's own reason)
    ['TENSION', 'I kept hearing that the job market waiting for me was doomed. That fear was loud, and for a while it got to me.'], // (Nov 22, John: "a victim of fearmongering about my future job market")
    ['PIVOT', 'I put all of it behind me and bet everything on what I love, AI. Every project on this site came out of that bet.'], // (John: "put that all behind me and focus everything into my interest, which is AI. And bet everything on it")
    ['LESSON', 'Directing AI agents is its own skill. They wrote the code. I set the plan, checked every step and threw out what was not good enough.']
  ],
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

  missions: [
    {
      id: 'meliona',
      name: 'Portfolio Risk Engine',
      resumeTitle: 'Portfolio Risk Engine (Meliona)',
      target: 'Meliona',
      grade: 'S',
      status: 'LIVE',
      dates: 'Jun 2026 — Sep 2026', // (Nov 22, John: "I finished in September 2026"; it said Present)
      stack: ['Python', 'JavaScript', 'Docker'],
      brief: 'How much could a portfolio lose in a bad year?',
      // the work story (Nov 22, John: "make our website sound like it's telling a story... why I made my projects"): setup, tension,
      // pivot, lesson. Every beat comes from the project's own repo (hero.py STORY, README, PROGRESS.md), nothing invented.
      story: [
        ['SETUP', 'My dad kept asking one question. Which stock can I actually rely on and hold for years? A lot of people ask the same thing.'],
        ['TENSION', 'Nobody can promise that answer, and a risk tool that guesses is worse than none. Every number had to come from live data, checked a second way.'],
        ['PIVOT', 'Steady stocks were only half the plan. People also want what grows fastest, so each high-flyer got a steady anchor carrying the same share of the risk.'],
        ['LESSON', 'A student project can meet a trading desk’s bar if every number is tested twice.']
      ],
      objectives: [
        'Designed and launched a public web app that estimates how much a portfolio of stocks, ETFs, FX or futures could lose in a bad year.',
        'Runs 10,000 simulated years on live data from Yahoo Finance.',
        'Created 300+ test cases and a live-data audit to cross-verify the risk engine.',
        'Directed AI coding agents in a three-role workflow (orchestrator, researcher, builder) to write the Python, every change gated by lint, a security scan and three test suites.'
      ],
      loot: ['727 of 728 checks passed', '7,700+ lines of Python', '6 GitHub Actions workflows', '5-check validation gate'],
      // word for word from the PDF resume (Quick View shows these)
      resume: [
        'Designed and launched a public web app to estimate how a portfolio of stocks, ETFs, FX, or futures could lose in a bad year, using 10,000 simulated years of live data from Yahoo Finance',
        'Created more than 300 test cases and a live-data audit to cross-verify risk engine results; October 2026 runs past with 0 failures (727 of 728 checks)',
        'Directed AI coding agents in a three-role workflow (orchestrator, researcher, builder) to write 7,700+ lines of Python, validated by five checks: lint, security scan, and three test suites, across six GitHub Actions workflows'
      ],
      live: 'https://summer-2026-quant-project-risk-engine-blueprint-production.up.railway.app/',
      repo: 'https://github.com/ricepillow3000/Summer-2026-Quant-Project-Risk-Engine-Blueprint'
    },
    {
      id: 'arcas',
      name: 'Excel Add-in',
      resumeTitle: 'Excel Add-in (ARCAS)',
      target: 'ARCAS',
      grade: 'S',
      status: 'LIVE',
      dates: 'Sep 2026 — Present',
      stack: ['Python', 'Flask', 'JavaScript', 'CI/CD'],
      brief: 'Finds the broken cells in your spreadsheet and explains them in plain English.',
      // the work story: from the repo (README, CLAUDE.md, docs/SYSTEMS-MAP.md)
      story: [
        ['SETUP', 'The longer I spent in Excel, the more boring it got. I did not want to keep worrying whether past data went in right or wrong. I wanted to look forward, so I built a checker to do it for me.'], // (Nov 22, John's own reason)
        ['TENSION', 'A checker that cries wolf gets switched off, and on 30 real public tables mine cried wolf thousands of times.'],
        ['PIVOT', 'I traced the false alarms to “NA” codes and blank cells that were never errors, and taught it the difference, without missing a single planted error.'],
        ['LESSON', 'Test on data you have never seen. Blind tests on unseen tables found bugs my own tests missed.']
      ],
      objectives: [
        'Built and launched a Windows Excel add-in with 21 data checks, plain-language explanations for flagged cells, and suggested fixes, powered by a Python Flask REST API and a JavaScript (Office.js) task pane.',
        'Wrote automated tests covering every safety guard, plus mutation tests that plant 171 bugs across 70 guards to verify detection.'
      ],
      loot: ['199 of 201 planted errors caught', 'Serious false alarms 5,022 → 710 (−86%)', '1,700+ automated tests', '42 unseen test sheets'],
      resume: [
        'Built and launched a Windows Excel add-in with 21 data checks, plain-language explanations for flagged cells, and suggested fixes, powered by a Python Flask REST API and JavaScript (Office.js) task pane',
        'Detected 199 of 201 planted errors across 42 unseen test sheets; wrote 1,700+ automated tests covering every safety guard, plus mutation tests deliberately planting 171 bugs across 70 guards to verify detection',
        'Reduced serious false alarms from 5,022 to 710 across 30 public tables by tracing to “NA” codes and blank cells, while catching every planted error'
      ],
      bestStat: '199 / 201',
      live: 'https://ricepillow3000.github.io/excel-anomaly-hunter/',
      repo: 'https://github.com/ricepillow3000/excel-anomaly-hunter'
    }
  ],

  /* Ranks 1–10, or 'MAX'. Each one is backed by proof. `uses` = which projects the
     red string on the Heist Board connects it to. */
  skills: [
    { id: 'agents', name: 'AI Agents (Claude Code)', rank: 9, proof: 'Both apps and this site, built by a crew I direct', uses: ['meliona'] },
    { id: 'testing', name: 'Testing / QA', rank: 'MAX', proof: 'Every app ships with its own test suite', uses: ['meliona', 'arcas'] },
    { id: 'python', name: 'Python', rank: 5, proof: 'Meliona’s engine · ARCAS backend', uses: ['meliona', 'arcas'] },
    { id: 'aieval', name: 'AI Evaluation', rank: 8, proof: 'Audits the engine against live market data', uses: ['meliona'] },
    { id: 'cicd', name: 'GitHub Actions (CI/CD)', rank: 7, proof: 'Every push linted, security-scanned and tested', uses: ['meliona', 'arcas'] },
    { id: 'flask', name: 'Flask', rank: 7, proof: 'ARCAS REST API', uses: ['arcas'] },
    { id: 'git', name: 'Git / GitHub', rank: 7, proof: 'Both projects, public repos', uses: ['meliona', 'arcas'] },
    { id: 'js', name: 'JavaScript', rank: 6, proof: 'Office.js task pane · web UIs', uses: ['meliona', 'arcas'] },
    { id: 'docker', name: 'Docker', rank: 6, proof: 'Meliona deployment', uses: ['meliona'] }
  ],

  different: [
    { title: 'I ship, not just study', fact: 'What I build goes out on a public link, not into a drawer, while I’m still in school.' },
    { title: 'I test like it’s production', fact: 'Nothing I build ships until it passes its tests.' },
    { title: 'I manage AI agents', fact: 'Each agent gets one job, and I review everything they write.' },
    { title: 'I lead under pressure', fact: 'When the rush hits, I am the one teaching the new people.' }
  ],

  sideQuests: [
    {
      title: 'Team Leader (elected)',
      place: 'Business Model Canvas',
      dates: 'Aug 2026 — Present',
      did: [
        'Coordinated the team’s assignments across seven weekly rounds.',
        'Spearheaded a pivot to commuters after spotting missed parking-deck opportunities, then pitched three high-traffic locations and a contactless sampling plan with geofence advertising.'
      ],
      resume: [
        "Coordinated 35 assignments across seven weekly rounds for a five-person team, addressing customer segments, channels, value proposition, revenue, key activities, and costs; integrated team members' prior ideas",
        'Spearheaded a shift to commuters after uncovering missed parking deck opportunities; pitched three high-traffic locations and a contactless sampling plan with geofence advertising'
      ],
      stat: ['35', 'assignments run for a 5-person team'],
      lesson: 'I can turn five opinions into one plan — and change course when the data says so.'
    },
    {
      title: 'Banquet Server',
      place: 'Dunwoody Country Club',
      dates: 'Feb 2026 — Present',
      did: [
        'On the club’s busiest day of the year, explained the service routine to each new hire as the shift ran.',
        'Set up shortcuts and pre-placed supplies for accurate, on-time orders at 5 weekly banquets and private events.'
      ],
      resume: [
        "Led a section of 5 new servers and temporary workers on July 4th, the club's busiest day of the year, explaining the service routine to each one as the shift ran",
        'Established shortcuts and pre-placed supplies to ensure accurate, on-time orders for 5 weekly banquets and private events'
      ],
      org: 'Dunwoody Country Club Inc',
      stat: ['5', 'new servers and temps led on July 4th'], // (the bullet above no longer repeats it)
      lesson: 'I onboard people fast, under real pressure.'
    },
    {
      title: 'Food Server',
      place: 'The Sparrow',
      dates: 'May 2025 — Aug 2025',
      did: ['Mentored new hires on menu, POS and table flow while running a full section, and was recognized in six positive Google reviews from guests.'],
      resume: ['Mentored new hires on menu, POS, and table flow while managing a full section; recognized in six positive Google reviews from guests'],
      stat: ['6', 'positive Google reviews recognized me'],
      lesson: 'I stay calm and friendly in front of real customers.'
    }
  ],

  funFacts: ['I play drums (200+ BPM on a good day).', 'I love Pierce The Veil.', 'Genuinely scared of bees and wasps.'],

  skillsLine: ['Python', 'JavaScript', 'Flask', 'Docker', 'Git', 'GitHub Actions (CI/CD)', 'Claude Code (multi-agent workflows)', 'AI Evaluation'],

  analytics: { goatcounter: '' } // e.g. 'johnnguyen' → https://johnnguyen.goatcounter.com/count
};
