/* John's lines. {timeOfDay} and {company} are filled in at runtime.
   expr = which face to show: neutral | smirk | excited | thinking | panicked */

export const SECTIONS = ['missions', 'skills', 'different', 'stats', 'side-quests'];

export const script = {
  greeting: {
    expr: 'smirk',
    text: "Oh, a visitor this {timeOfDay}. I'm John, AI Solutions Engineer in training. I direct AI agents to build software, then test it like it's going to production. What do you want to see?"
  },
  companyGreeting: {
    expr: 'smirk',
    text: "Wait, someone from {company}? I've been expecting you. I'm John. I direct AI agents to build software, then test it like it's going to production. What do you want to see?"
  },
  lateNight: { expr: 'excited', text: 'Working late? Respect.' },

  /* The hub. Page 1 always holds the PDF escape. */
  choices: {
    built: { label: "Show me what you've built.", to: 'missions', reply: { expr: 'excited', text: 'Two live apps. 2,000+ tests. Let me show you.' } },
    skills: { label: 'What can you actually do?', to: 'skills', reply: { expr: 'smirk', text: 'Python, Flask, Docker... and I run a team of AI agents.' } },
    different: { label: 'What makes you different?', to: 'different', reply: { expr: 'thinking', text: 'Hmm... four things.' } },
    pdf: { label: "I'm busy. Just the PDF.", to: 'quick', reply: { expr: 'neutral', text: 'Respect. Here you go.' } },
    about: { label: 'Tell me about yourself.', to: 'stats', reply: { expr: 'neutral', text: 'Short version? Drummer, student, builder.' } },
    team: { label: 'Ever led a team?', to: 'side-quests', reply: { expr: 'smirk', text: 'Ever run a banquet floor on July 4th?' } },
    connect: { label: "Let's connect.", to: 'contact', reply: { expr: 'neutral', text: "Here's where to find me." } }
  },
  page1: ['built', 'skills', 'different', 'pdf'],
  page2: ['about', 'team', 'connect'],
  moreLabel: 'Something else...',
  backLabel: '← Back',

  returns: {
    missions: { expr: 'smirk', text: '199 of 201 errors caught. Not bad, right? Want to see the skills behind it?' },
    skills: { expr: 'smirk', text: 'Those ranks come with receipts. Curious what makes me different?' },
    different: { expr: 'neutral', text: "That's the short list. Want the story behind it?" },
    stats: { expr: 'excited', text: 'Now you know the guy. Seen the projects yet?' },
    'side-quests': { expr: 'neutral', text: 'Not everything I learned came from a keyboard.' },
    contact: { expr: 'smirk', text: 'Anything else you want to look at?' },
    quick: { expr: 'neutral', text: 'Back for the fun version? Anything else you want to look at?' },
    default: { expr: 'neutral', text: 'Anything else you want to look at?' }
  },
  allSeen: { expr: 'excited', text: "Thanks for checking it all out. My LinkedIn's right here." },
  allSeenChoice: 'Open LinkedIn ↗',
  bee: { expr: 'panicked', text: 'BEE!! Get it away!' },
  beeAfter: { expr: 'neutral', text: '...I am totally fine. Where were we?' }
};

/* What the hover bubble on the diagonal [MENU] says. */
export const menuTeasers = {
  missions: '2 live apps · 2,000+ tests',
  skills: 'Ranks with receipts · AI agents rank 9',
  stats: 'GSU · 3.88 GPA · Dean’s List ×2',
  'side-quests': 'Elected team leader · July 4th rush',
  system: 'Quick View · PDF · sound · achievements'
};
