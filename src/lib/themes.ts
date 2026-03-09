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
  // Landing page sections
  landingPurposeTitle: string;
  landingPurposeDesc: string;
  landingPurposeMobile: string;
  landingFeature1Title: string;
  landingFeature1Desc: string;
  landingFeature2Title: string;
  landingFeature2Desc: string;
  landingFeature3Title: string;
  landingFeature3Desc: string;
  landingFeature4Title: string;
  landingFeature4Desc: string;
  landingADHDTitle: string;
  landingADHDDesc: string;
  landingThemesTitle: string;
  landingThemesDesc: string;
  landingVideoTitle: string;
  landingVideoDesc: string;
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
      resourcesSubtitle: "Your collection of sacred resources and ancient knowledge",
      tasks: "Forge",
      tasksDesc: "Tasks to be hammered into completion. Organize by territory.",
      tasksSubtitle: "Tasks to be hammered into completion",
      projects: "Territories",
      projectsDesc: "The projects you've claimed in your conquest. Manage your domains.",
      projectsSubtitle: "The projects you've claimed in your conquest",
      campaigns: "Campaign",
      campaignsDesc: "Rally your forces. Combine tasks and territories into epic quests.",
      campaignsSubtitle: "Combine tasks and territories into epic quests",
      campaignsHeroTitle: "Rally Your Forces",
      campaignsHeroDesc: "Combine tasks from the Forge and territories to conquer into epic campaigns. Drag campaigns between sections to organize your quests.",
      achievements: "Achievements",
      achievementsDesc: "Discover patterns in your knowledge. Invoke the Cleave.",
      achievementsSubtitle: "Your trophies, medals, and gems of conquest",
      diary: "Diary",
      diaryDesc: "Your personal collection of tomes and reflections.",
      diarySubtitle: "Your personal collection of tomes and reflections",
      codex: "The Codex",
      codexDesc: "Ancient knowledge to guide your path through the Realm.",
      codexSubtitle: "A tome of knowledge for the weary traveler.",
      settings: "Settings",
      settingsSubtitle: "Configure your sanctuary",
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
      landingPurposeTitle: "The Eternal Chronicle",
      landingPurposeDesc: "Realm is your dark sanctuary for productivity — a place where tasks become quests, projects become territories, and every completed goal is a conquest etched in shadow. Track your progress through an atmospheric interface that makes getting things done feel legendary.",
      landingPurposeMobile: "Carry the Realm in your pocket. Install this app directly from the home page — no app store needed. Your dark chronicle, always at hand.",
      landingFeature1Title: "The Forge & Territories",
      landingFeature1Desc: "Organize tasks and projects with gothic flair. Group, prioritize, and conquer your to-do list.",
      landingFeature2Title: "Epic Campaigns",
      landingFeature2Desc: "Combine tasks into multi-session campaigns. Track time, difficulty, and progress like a true quest.",
      landingFeature3Title: "The Diary",
      landingFeature3Desc: "A personal tome for reflections, notes, and field reports. Your thoughts, bound in digital parchment.",
      landingFeature4Title: "AI-Powered Insights",
      landingFeature4Desc: "Invoke the Cleave to discover patterns in your data and generate intelligent suggestions.",
      landingADHDTitle: "Forged for Restless Souls",
      landingADHDDesc: "Built by someone who understands the chaos. Realm is an app for ADHD-minded people and anyone who wants to have fun with their productivity flow. No sterile spreadsheets — just dark atmosphere, satisfying progress, and a system that works with your brain, not against it.",
      landingThemesTitle: "Shift Between Worlds",
      landingThemesDesc: "Four distinct visual identities await. Tap the palette icon in the top bar to transform your entire experience — from the gothic darkness of Crimson Realm to the neon pulse of the Grid.",
      landingVideoTitle: "A Vision Unfolds",
      landingVideoDesc: "A full tutorial and walkthrough is being forged in the shadows. New features and dark revelations are coming soon.",
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
      resourcesSubtitle: "Classified data and intercepted intelligence",
      tasks: "Hit List",
      tasksDesc: "Targets locked. Execute with precision.",
      tasksSubtitle: "Targets locked. Execute with precision.",
      projects: "Operations",
      projectsDesc: "Active ops in the field. Track and dominate.",
      projectsSubtitle: "Active operations in the field",
      campaigns: "Raids",
      campaignsDesc: "Coordinate your squad. Strike fast, strike hard.",
      campaignsSubtitle: "Coordinate your squad for maximum impact",
      campaignsHeroTitle: "Deploy Your Squad",
      campaignsHeroDesc: "Assemble targets from the Hit List and operations into coordinated raids. Drag raid cards between sections to manage status.",
      achievements: "Trophies",
      achievementsDesc: "Kills confirmed. See what you've unlocked.",
      achievementsSubtitle: "Confirmed kills and unlocked rewards",
      diary: "Logs",
      diaryDesc: "Personal transmissions and field reports.",
      diarySubtitle: "Personal transmissions and field reports",
      codex: "Field Manual",
      codexDesc: "Tactical briefings to keep you combat-ready.",
      codexSubtitle: "Tactical briefings and operational guides.",
      settings: "Settings",
      settingsSubtitle: "Configure your terminal",
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
      landingPurposeTitle: "The Tactical Edge",
      landingPurposeDesc: "Realm is your neon-lit command center for productivity — where targets become tasks, operations become projects, and every completed mission is a confirmed kill. Track your progress through a cyberpunk interface that makes execution feel electric.",
      landingPurposeMobile: "Take the Grid mobile. Install this app straight from the home page — no app store required. Your command center, always in your pocket.",
      landingFeature1Title: "Hit List & Operations",
      landingFeature1Desc: "Lock on targets and track active ops. Organize, prioritize, and execute with lethal precision.",
      landingFeature2Title: "Coordinated Raids",
      landingFeature2Desc: "Assemble targets into multi-session raids. Track time, intensity, and squad status in real-time.",
      landingFeature3Title: "Field Logs",
      landingFeature3Desc: "Personal transmissions and after-action reports. Document your missions in encrypted digital logs.",
      landingFeature4Title: "AI Combat Analysis",
      landingFeature4Desc: "Deploy AI to scan your data for patterns, generate tactical insights, and optimize your operations.",
      landingADHDTitle: "Engineered for Chaotic Energy",
      landingADHDDesc: "Built by someone who gets it. Realm is an app for ADHD-minded people and anyone who wants to have fun with their productivity flow. No boring dashboards — just neon energy, satisfying kills, and a system that channels your chaos into raw output.",
      landingThemesTitle: "Switch Your Frequency",
      landingThemesDesc: "Four distinct visual modes are loaded. Hit the palette icon in the top bar to shift your entire interface — from neon demon-hunter to gothic darkness to fantasy adventure.",
      landingVideoTitle: "Transmission Incoming",
      landingVideoDesc: "A full tactical briefing and walkthrough is being compiled. New features and system upgrades are deploying soon.",
    },
    fonts: {
      heading: "'Orbitron', sans-serif",
      body: "'Rajdhani', sans-serif",
      headingClass: "font-orbitron",
      bodyClass: "font-rajdhani",
    },
    cssVariables: {
      "--radius": "0.375rem",
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
      "--shadow-gothic": "0 10px 40px -10px hsl(270 20% 4% / 0.8), 0 0 15px hsl(330 90% 55% / 0.1)",
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
      resourcesSubtitle: "Ancient scrolls and gathered wisdom",
      tasks: "Quests",
      tasksDesc: "Brave deeds awaiting a hero. Honor and glory lie ahead.",
      tasksSubtitle: "Brave deeds awaiting a hero",
      projects: "Lands",
      projectsDesc: "The kingdoms and territories under your stewardship.",
      projectsSubtitle: "Kingdoms and territories under your stewardship",
      campaigns: "Adventures",
      campaignsDesc: "Grand adventures that span across the realm. Gather your party.",
      campaignsSubtitle: "Grand adventures across the realm",
      campaignsHeroTitle: "Gather Your Party",
      campaignsHeroDesc: "Combine quests and lands into grand adventures. Drag adventure cards between sections to organize your journey.",
      achievements: "Honors",
      achievementsDesc: "Feats of legend. Your name echoes through the halls.",
      achievementsSubtitle: "Feats of legend and earned honors",
      diary: "Journal",
      diaryDesc: "A traveler's journal of tales and discoveries.",
      diarySubtitle: "A traveler's journal of tales and discoveries",
      codex: "Lore Book",
      codexDesc: "The collected lore of Eldergrove and beyond.",
      codexSubtitle: "The collected lore and wisdom of the realm.",
      settings: "Settings",
      settingsSubtitle: "Configure your camp",
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
      landingPurposeTitle: "The Adventurer's Companion",
      landingPurposeDesc: "Realm is your enchanted companion for productivity — where tasks become quests, projects become kingdoms, and every completed goal is an honor earned by firelight. Track your progress through a warm fantasy interface that makes the journey feel like an adventure.",
      landingPurposeMobile: "Take the adventure with you. Install this app from the home page — no app store needed. Your journal and quest log, always by your side.",
      landingFeature1Title: "Quests & Lands",
      landingFeature1Desc: "Organize quests and manage your kingdoms. Group, prioritize, and conquer with the heart of a hero.",
      landingFeature2Title: "Grand Adventures",
      landingFeature2Desc: "Gather quests into epic multi-session adventures. Track time, difficulty, and your party's progress.",
      landingFeature3Title: "Traveler's Journal",
      landingFeature3Desc: "A leather-bound journal for tales, discoveries, and reflections from across the lands.",
      landingFeature4Title: "Enchanted Insights",
      landingFeature4Desc: "Call upon ancient magic to reveal patterns in your knowledge and conjure wise suggestions.",
      landingADHDTitle: "Crafted for Wandering Minds",
      landingADHDDesc: "Built by someone who knows the struggle. Realm is an app for ADHD-minded people and anyone who wants to have fun with their productivity flow. No lifeless tables — just warm adventure, satisfying progress, and a system that embraces the wandering spirit.",
      landingThemesTitle: "Choose Your World",
      landingThemesDesc: "Four enchanted realms await your discovery. Tap the palette icon in the top bar to transform your experience — from the warm forests of Eldergrove to the neon streets of the Grid.",
      landingVideoTitle: "A Tale Being Written",
      landingVideoDesc: "A full guide and walkthrough is being penned by the scribes. New features and enchantments are coming over the horizon.",
    },
    fonts: {
      heading: "'MedievalSharp', cursive",
      body: "'Lora', serif",
      headingClass: "font-medieval",
      bodyClass: "font-lora",
    },
    cssVariables: {
      "--radius": "0.5rem",
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
      "--shadow-gothic": "0 8px 30px -8px hsl(150 20% 4% / 0.6), 0 0 20px hsl(42 80% 50% / 0.08)",
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
      resourcesSubtitle: "Curated intelligence and strategic resources",
      tasks: "Action Items",
      tasksDesc: "Priority deliverables. Execute with excellence.",
      tasksSubtitle: "Priority deliverables requiring execution",
      projects: "Portfolios",
      projectsDesc: "Your portfolio of ventures and strategic initiatives.",
      projectsSubtitle: "Your portfolio of ventures and initiatives",
      campaigns: "Sprints",
      campaignsDesc: "Coordinated sprints to drive results and close deals.",
      campaignsSubtitle: "Coordinated sprints for maximum output",
      campaignsHeroTitle: "Launch Your Sprint",
      campaignsHeroDesc: "Assemble action items and portfolios into focused sprints. Drag sprint cards between sections to manage your pipeline.",
      achievements: "Milestones",
      achievementsDesc: "Key performance milestones. Track your ascent.",
      achievementsSubtitle: "Key performance milestones and metrics",
      diary: "Memos",
      diaryDesc: "Private notes and executive summaries.",
      diarySubtitle: "Private notes and executive summaries",
      codex: "Handbook",
      codexDesc: "Your comprehensive guide to operational excellence.",
      codexSubtitle: "Your comprehensive operational guide.",
      settings: "Settings",
      settingsSubtitle: "Configure your workspace",
      logout: "Clock Out",
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
      landingPurposeTitle: "The Strategic Edge",
      landingPurposeDesc: "Realm is your premium command center for productivity — where deliverables become action items, ventures become portfolios, and every milestone achieved drives your ascent. Track performance through a sleek executive interface that makes excellence feel natural.",
      landingPurposeMobile: "Take command anywhere. Install this app directly from the home page — no app store required. Your boardroom, always in your pocket.",
      landingFeature1Title: "Action Items & Portfolios",
      landingFeature1Desc: "Manage deliverables and strategic initiatives. Prioritize, delegate, and execute with precision.",
      landingFeature2Title: "Focused Sprints",
      landingFeature2Desc: "Assemble action items into coordinated sprints. Track time, output, and pipeline status at a glance.",
      landingFeature3Title: "Executive Memos",
      landingFeature3Desc: "Private notes and strategic summaries. Document decisions and insights with executive clarity.",
      landingFeature4Title: "AI-Powered Analytics",
      landingFeature4Desc: "Leverage AI to surface performance patterns, generate strategic insights, and optimize workflows.",
      landingADHDTitle: "Designed for High-Performers",
      landingADHDDesc: "Built by someone who thinks differently. Realm is an app for ADHD-minded people and anyone who wants to have fun with their productivity flow. No generic project boards — just refined aesthetics, clear metrics, and a system designed to channel restless ambition.",
      landingThemesTitle: "Curate Your Environment",
      landingThemesDesc: "Four premium visual identities are available. Click the palette icon in the top bar to transform your workspace — from executive luxury to gothic atmosphere to neon intensity.",
      landingVideoTitle: "Preview Coming Soon",
      landingVideoDesc: "A comprehensive walkthrough and product demo is in production. New features and enhancements are on the roadmap.",
    },
    fonts: {
      heading: "'Playfair Display', serif",
      body: "'Inter', sans-serif",
      headingClass: "font-playfair",
      bodyClass: "font-inter",
    },
    cssVariables: {
      "--radius": "0.5rem",
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
      "--shadow-gothic": "0 8px 30px -8px hsl(220 25% 4% / 0.6)",
      "--shadow-crimson": "0 0 25px hsl(45 70% 52% / 0.2)",
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
