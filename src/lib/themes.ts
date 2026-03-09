export type ThemeId = "gothic" | "neon" | "fantasy" | "executive";

export interface ThemeLabels {
  appName: string;
  homeName: string;
  homeSubtitle: string;
  resources: string;
  resourcesDesc: string;
  resourcesSubtitle: string;
  tasks: string;
  tasksDesc: string;
  tasksSubtitle: string;
  projects: string;
  projectsDesc: string;
  projectsSubtitle: string;
  campaigns: string;
  campaignsDesc: string;
  campaignsSubtitle: string;
  campaignsHeroTitle: string;
  campaignsHeroDesc: string;
  achievements: string;
  achievementsDesc: string;
  achievementsSubtitle: string;
  diary: string;
  diaryDesc: string;
  diarySubtitle: string;
  codex: string;
  codexDesc: string;
  codexSubtitle: string;
  settings: string;
  settingsSubtitle: string;
  logout: string;
  landingTitle: string;
  landingTitleAccent: string;
  landingSubtitle: string;
  landingCta: string;
  landingCtaSecondary: string;
  authWelcomeBack: string;
  authJoin: string;
  authEnter: string;
  authCreate: string;
  authBackLink: string;
}

export interface ThemeConfig {
  id: ThemeId;
  displayName: string;
  description: string;
  previewColors: [string, string, string]; // 3 hex colors for preview swatches
  labels: ThemeLabels;
  fonts: {
    heading: string;
    body: string;
    headingClass: string;
    bodyClass: string;
  };
  cssVariables: Record<string, string>;
  backgroundCss: string; // CSS gradient or image for page backgrounds
}

export const THEMES: Record<ThemeId, ThemeConfig> = {
  gothic: {
    id: "gothic",
    displayName: "Crimson Realm",
    description: "Dark, atmospheric, mysterious",
    previewColors: ["#8b1a1a", "#1a1a2e", "#d4c5a9"],
    labels: {
      appName: "REALM",
      homeName: "Crimson Keep",
      homeSubtitle: "The Keep stands ready. Your domains await.",
      resources: "Chronicles",
      resourcesDesc: "Your collection of sacred resources. Knowledge to guide your journey.",
      tasks: "Forge",
      tasksDesc: "Tasks to be hammered into completion. Organize by territory.",
      projects: "Territories",
      projectsDesc: "The projects you've claimed in your conquest. Manage your domains.",
      campaigns: "Campaign",
      campaignsDesc: "Rally your forces. Combine tasks and territories into epic quests.",
      achievements: "Achievements",
      achievementsDesc: "Discover patterns in your knowledge. Invoke the Cleave.",
      diary: "Diary",
      diaryDesc: "Your personal collection of tomes and reflections.",
      codex: "The Codex",
      codexDesc: "Ancient knowledge to guide your path through the Realm.",
      logout: "Leave Realm",
      landingTitle: "Enter the",
      landingTitleAccent: "Dark Realm",
      landingSubtitle: "Where shadows whisper secrets and legends are forged in the eternal twilight. Your destiny awaits beyond the gates.",
      landingCta: "Begin Your Journey",
      landingCtaSecondary: "Return to Realm",
      authWelcomeBack: "Welcome back, traveler",
      authJoin: "Join the eternal night",
      authEnter: "Enter the Realm",
      authCreate: "Create Your Legacy",
      authBackLink: "Return to Gates",
    },
    fonts: {
      heading: "'Cinzel', serif",
      body: "'Crimson Text', serif",
      headingClass: "font-cinzel",
      bodyClass: "font-crimson",
    },
    cssVariables: {},
    backgroundCss: "",
  },

  neon: {
    id: "neon",
    displayName: "Neon Slayers",
    description: "Edgy, vibrant, demon-hunter energy",
    previewColors: ["#e6198a", "#1a0a2e", "#00e5ff"],
    labels: {
      appName: "REALM",
      homeName: "Neon Hub",
      homeSubtitle: "Systems online. Ready to deploy.",
      resources: "Intel Files",
      resourcesDesc: "Intercepted data and classified intel. Stay sharp.",
      tasks: "Hit List",
      tasksDesc: "Targets locked. Execute with precision.",
      projects: "Operations",
      projectsDesc: "Active ops in the field. Track and dominate.",
      campaigns: "Raids",
      campaignsDesc: "Coordinate your squad. Strike fast, strike hard.",
      achievements: "Trophies",
      achievementsDesc: "Kills confirmed. See what you've unlocked.",
      diary: "Logs",
      diaryDesc: "Personal transmissions and field reports.",
      codex: "Field Manual",
      codexDesc: "Tactical briefings to keep you combat-ready.",
      logout: "Log Off",
      landingTitle: "Enter the",
      landingTitleAccent: "Neon Grid",
      landingSubtitle: "The city pulses with electric energy. Demons lurk in neon shadows. Only the bold survive the hunt.",
      landingCta: "Jack In",
      landingCtaSecondary: "Resume Session",
      authWelcomeBack: "Welcome back, hunter",
      authJoin: "Register your signal",
      authEnter: "Access Terminal",
      authCreate: "Initialize Profile",
      authBackLink: "Back to Grid",
    },
    fonts: {
      heading: "'Orbitron', sans-serif",
      body: "'Rajdhani', sans-serif",
      headingClass: "font-orbitron",
      bodyClass: "font-rajdhani",
    },
    cssVariables: {
      "--background": "270 15% 6%",
      "--foreground": "200 20% 92%",
      "--card": "270 12% 10%",
      "--card-foreground": "200 20% 92%",
      "--popover": "270 12% 8%",
      "--popover-foreground": "200 20% 92%",
      "--primary": "330 90% 55%",
      "--primary-foreground": "0 0% 100%",
      "--secondary": "270 15% 18%",
      "--secondary-foreground": "200 15% 85%",
      "--muted": "270 10% 15%",
      "--muted-foreground": "260 20% 60%",
      "--accent": "185 90% 45%",
      "--accent-foreground": "0 0% 100%",
      "--destructive": "0 72% 50%",
      "--destructive-foreground": "0 0% 100%",
      "--border": "270 15% 20%",
      "--input": "270 12% 18%",
      "--ring": "330 90% 55%",
      "--gothic-crimson": "330 90% 55%",
      "--gothic-blood": "330 90% 40%",
      "--gothic-stone": "270 10% 25%",
      "--gothic-fog": "260 20% 70%",
      "--gothic-moon": "185 90% 80%",
      "--gothic-shadow": "270 20% 4%",
      "--sidebar-background": "270 12% 8%",
      "--sidebar-foreground": "200 15% 85%",
      "--sidebar-primary": "330 90% 55%",
      "--sidebar-primary-foreground": "0 0% 100%",
      "--sidebar-accent": "270 15% 15%",
      "--sidebar-accent-foreground": "200 15% 85%",
      "--sidebar-border": "270 15% 18%",
      "--sidebar-ring": "330 90% 55%",
    },
    backgroundCss: "radial-gradient(ellipse at 20% 50%, hsl(330 90% 55% / 0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, hsl(185 90% 45% / 0.1) 0%, transparent 50%), radial-gradient(ellipse at 60% 80%, hsl(270 60% 30% / 0.2) 0%, transparent 50%), linear-gradient(180deg, hsl(270 15% 6%) 0%, hsl(270 20% 4%) 100%)",
  },

  fantasy: {
    id: "fantasy",
    displayName: "Eldergrove",
    description: "Classic fantasy, warm adventure",
    previewColors: ["#d4a017", "#0d2818", "#2d8a4e"],
    labels: {
      appName: "REALM",
      homeName: "The Tavern",
      homeSubtitle: "The hearth is warm. Choose your path.",
      resources: "Scrolls",
      resourcesDesc: "Ancient scrolls and gathered wisdom from across the lands.",
      tasks: "Quests",
      tasksDesc: "Brave deeds awaiting a hero. Honor and glory lie ahead.",
      projects: "Lands",
      projectsDesc: "The kingdoms and territories under your stewardship.",
      campaigns: "Adventures",
      campaignsDesc: "Grand adventures that span across the realm. Gather your party.",
      achievements: "Honors",
      achievementsDesc: "Feats of legend. Your name echoes through the halls.",
      diary: "Journal",
      diaryDesc: "A traveler's journal of tales and discoveries.",
      codex: "Lore Book",
      codexDesc: "The collected lore of Eldergrove and beyond.",
      logout: "Depart",
      landingTitle: "Enter the",
      landingTitleAccent: "Eldergrove",
      landingSubtitle: "Beyond the ancient trees lies a world of wonder. Heroes are forged in firelight and friendship. Will you answer the call?",
      landingCta: "Begin Your Quest",
      landingCtaSecondary: "Return to Camp",
      authWelcomeBack: "Welcome back, adventurer",
      authJoin: "Register at the guild",
      authEnter: "Enter the Tavern",
      authCreate: "Create Your Character",
      authBackLink: "Back to Crossroads",
    },
    fonts: {
      heading: "'MedievalSharp', cursive",
      body: "'Lora', serif",
      headingClass: "font-medieval",
      bodyClass: "font-lora",
    },
    cssVariables: {
      "--background": "150 20% 7%",
      "--foreground": "40 25% 88%",
      "--card": "30 15% 11%",
      "--card-foreground": "40 25% 88%",
      "--popover": "150 15% 8%",
      "--popover-foreground": "40 25% 88%",
      "--primary": "42 80% 50%",
      "--primary-foreground": "30 20% 10%",
      "--secondary": "30 15% 18%",
      "--secondary-foreground": "40 20% 82%",
      "--muted": "150 10% 14%",
      "--muted-foreground": "80 15% 52%",
      "--accent": "150 55% 35%",
      "--accent-foreground": "40 25% 95%",
      "--destructive": "0 65% 45%",
      "--destructive-foreground": "40 25% 95%",
      "--border": "30 12% 20%",
      "--input": "30 12% 17%",
      "--ring": "42 80% 50%",
      "--gothic-crimson": "42 80% 50%",
      "--gothic-blood": "42 80% 35%",
      "--gothic-stone": "30 12% 25%",
      "--gothic-fog": "80 15% 65%",
      "--gothic-moon": "42 60% 80%",
      "--gothic-shadow": "150 20% 4%",
      "--sidebar-background": "150 15% 8%",
      "--sidebar-foreground": "40 20% 82%",
      "--sidebar-primary": "42 80% 50%",
      "--sidebar-primary-foreground": "30 20% 10%",
      "--sidebar-accent": "30 15% 15%",
      "--sidebar-accent-foreground": "40 20% 82%",
      "--sidebar-border": "30 12% 18%",
      "--sidebar-ring": "42 80% 50%",
    },
    backgroundCss: "radial-gradient(ellipse at 30% 70%, hsl(42 80% 50% / 0.08) 0%, transparent 50%), radial-gradient(ellipse at 70% 30%, hsl(150 55% 35% / 0.12) 0%, transparent 50%), radial-gradient(ellipse at 50% 50%, hsl(30 30% 15% / 0.3) 0%, transparent 70%), linear-gradient(180deg, hsl(150 20% 7%) 0%, hsl(30 15% 6%) 100%)",
  },

  executive: {
    id: "executive",
    displayName: "The Pinnacle",
    description: "Sleek, powerful, luxurious",
    previewColors: ["#c8a84e", "#0a1628", "#4a7cb5"],
    labels: {
      appName: "REALM",
      homeName: "The Boardroom",
      homeSubtitle: "Your empire awaits.",
      resources: "Briefs",
      resourcesDesc: "Curated intelligence and strategic resources at your disposal.",
      tasks: "Action Items",
      tasksDesc: "Priority deliverables. Execute with excellence.",
      projects: "Portfolios",
      projectsDesc: "Your portfolio of ventures and strategic initiatives.",
      campaigns: "Sprints",
      campaignsDesc: "Coordinated sprints to drive results and close deals.",
      achievements: "Milestones",
      achievementsDesc: "Key performance milestones. Track your ascent.",
      diary: "Memos",
      diaryDesc: "Private notes and executive summaries.",
      codex: "Handbook",
      codexDesc: "Your comprehensive guide to operational excellence.",
      logout: "Sign Out",
      landingTitle: "Welcome to",
      landingTitleAccent: "The Pinnacle",
      landingSubtitle: "Where ambition meets execution. Command your empire with precision, clarity, and relentless drive.",
      landingCta: "Get Started",
      landingCtaSecondary: "Sign In",
      authWelcomeBack: "Welcome back",
      authJoin: "Create your account",
      authEnter: "Sign In",
      authCreate: "Create Account",
      authBackLink: "Back to Home",
    },
    fonts: {
      heading: "'Playfair Display', serif",
      body: "'Inter', sans-serif",
      headingClass: "font-playfair",
      bodyClass: "font-inter",
    },
    cssVariables: {
      "--background": "220 25% 7%",
      "--foreground": "40 10% 92%",
      "--card": "220 18% 11%",
      "--card-foreground": "40 10% 92%",
      "--popover": "220 20% 9%",
      "--popover-foreground": "40 10% 92%",
      "--primary": "45 70% 52%",
      "--primary-foreground": "220 25% 8%",
      "--secondary": "220 15% 18%",
      "--secondary-foreground": "40 8% 82%",
      "--muted": "220 12% 15%",
      "--muted-foreground": "220 10% 55%",
      "--accent": "210 40% 45%",
      "--accent-foreground": "40 10% 95%",
      "--destructive": "0 65% 48%",
      "--destructive-foreground": "40 10% 95%",
      "--border": "220 15% 20%",
      "--input": "220 15% 17%",
      "--ring": "45 70% 52%",
      "--gothic-crimson": "45 70% 52%",
      "--gothic-blood": "45 70% 38%",
      "--gothic-stone": "220 12% 25%",
      "--gothic-fog": "220 10% 68%",
      "--gothic-moon": "45 50% 82%",
      "--gothic-shadow": "220 25% 4%",
      "--sidebar-background": "220 20% 9%",
      "--sidebar-foreground": "40 8% 82%",
      "--sidebar-primary": "45 70% 52%",
      "--sidebar-primary-foreground": "220 25% 8%",
      "--sidebar-accent": "220 15% 15%",
      "--sidebar-accent-foreground": "40 8% 82%",
      "--sidebar-border": "220 15% 18%",
      "--sidebar-ring": "45 70% 52%",
    },
    backgroundCss: "radial-gradient(ellipse at 50% 0%, hsl(45 70% 52% / 0.06) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, hsl(210 40% 45% / 0.08) 0%, transparent 50%), linear-gradient(180deg, hsl(220 25% 7%) 0%, hsl(220 20% 5%) 100%)",
  },
};

export const THEME_IDS: ThemeId[] = ["gothic", "neon", "fantasy", "executive"];
