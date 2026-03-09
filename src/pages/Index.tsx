import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import gothicHeroBg from "@/assets/gothic-hero-bg.jpg";
import ThemeSwitcher from "@/components/theme/ThemeSwitcher";
import { THEMES, THEME_IDS } from "@/lib/themes";
import {
  Castle, Cpu, TreePine, Building2,
  Swords, Target, Scroll, BarChart3,
  BookOpen, FileText, BookMarked, FileSpreadsheet,
  Brain, Zap, Sparkles, LineChart,
  Palette, Play, Download, Smartphone,
  ChevronDown, ArrowRight,
} from "lucide-react";

/* ─── Themed icon sets for the "Purpose" illustration ─── */
const PURPOSE_ICONS: Record<string, React.ElementType> = {
  gothic: Castle,
  neon: Cpu,
  fantasy: TreePine,
  executive: Building2,
};

const FEATURE_ICONS: Record<string, React.ElementType[]> = {
  gothic: [Swords, Scroll, BookOpen, Brain],
  neon: [Target, FileText, FileText, Zap],
  fantasy: [Scroll, BookMarked, BookOpen, Sparkles],
  executive: [BarChart3, LineChart, FileSpreadsheet, LineChart],
};

/* ─── Intersection Observer hook for scroll animations ─── */
const useInView = (threshold = 0.15) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, isVisible };
};

const SectionDivider = () => (
  <div className="flex items-center justify-center py-4">
    <div className="h-px w-24 md:w-48 bg-gradient-to-r from-transparent via-border to-transparent" />
  </div>
);

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const { theme, themeConfig } = useTheme();
  const labels = themeConfig.labels;

  useEffect(() => {
    if (loading) return;
    if (user) {
      const lastRouteKey = `lastRoute:${user.id}`;
      let targetRoute = "/home";
      try {
        const storedRoute = localStorage.getItem(lastRouteKey);
        if (storedRoute && storedRoute !== "/" && storedRoute !== "/auth" && !storedRoute.startsWith("/auth")) {
          targetRoute = storedRoute;
        }
      } catch {}
      setIsRedirecting(true);
      navigate(targetRoute, { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading || isRedirecting) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="font-cinzel text-2xl text-foreground animate-pulse">
          {labels.appName}
        </div>
      </div>
    );
  }

  const bgStyle = theme === "gothic"
    ? { backgroundImage: `url(${gothicHeroBg})` }
    : { background: themeConfig.backgroundCss };

  const PurposeIcon = PURPOSE_ICONS[theme] ?? Castle;
  const featureIcons = FEATURE_ICONS[theme] ?? FEATURE_ICONS.gothic;

  const features = [
    { title: labels.landingFeature1Title, desc: labels.landingFeature1Desc, Icon: featureIcons[0] },
    { title: labels.landingFeature2Title, desc: labels.landingFeature2Desc, Icon: featureIcons[1] },
    { title: labels.landingFeature3Title, desc: labels.landingFeature3Desc, Icon: featureIcons[2] },
    { title: labels.landingFeature4Title, desc: labels.landingFeature4Desc, Icon: featureIcons[3] },
  ];

  return (
    <div className="relative min-h-screen">
      {/* Fixed background */}
      <div className="fixed inset-0 bg-cover bg-center bg-no-repeat -z-10" style={bgStyle} />
      {theme === "gothic" && (
        <>
          <div className="fixed inset-0 bg-gradient-fog -z-10" />
          <div className="fixed inset-0 bg-gradient-to-r from-background/40 via-transparent to-background/40 animate-fog -z-10" />
        </>
      )}
      {/* Scroll-dimming overlay so text is always readable */}
      <div className="fixed inset-0 bg-background/60 -z-10" />

      <div className="relative z-10 flex flex-col">
        {/* ═══════════ HEADER ═══════════ */}
        <header className="sticky top-0 z-50 backdrop-blur-md bg-background/70 border-b border-border/30">
          <div className="flex items-center justify-between px-6 md:px-12 py-4">
            <div className="font-cinzel text-2xl md:text-3xl font-bold tracking-widest text-foreground">
              {labels.appName}
            </div>
            <nav className="flex items-center gap-4">
              <ThemeSwitcher />
              <Link to="/auth?mode=login" className="gothic-button-secondary text-xs md:text-sm">
                {labels.authEnter}
              </Link>
              <Link to="/auth?mode=signup" className="gothic-button-primary text-xs md:text-sm">
                {labels.authJoin}
              </Link>
            </nav>
          </div>
        </header>

        {/* ═══════════ HERO ═══════════ */}
        <section className="min-h-[85vh] flex items-center justify-center px-6 md:px-12">
          <div className="text-center max-w-4xl mx-auto opacity-0 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="h-px w-16 md:w-24 bg-gradient-to-r from-transparent to-primary/60" />
              <div className="w-2 h-2 rotate-45 bg-primary/60" />
              <div className="h-px w-16 md:w-24 bg-gradient-to-l from-transparent to-primary/60" />
            </div>

            <h1 className="text-gothic-title text-4xl md:text-6xl lg:text-7xl mb-6 leading-tight">
              {labels.landingTitle} <span className="text-primary">{labels.landingTitleAccent}</span>
            </h1>

            <p className="font-crimson text-lg md:text-xl lg:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto italic">
              {labels.landingSubtitle}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
              <Link to="/auth?mode=signup" className="gothic-button-primary w-full sm:w-auto animate-float">
                {labels.landingCta}
              </Link>
              <Link to="/auth?mode=login" className="gothic-button-secondary w-full sm:w-auto">
                {labels.landingCtaSecondary}
              </Link>
            </div>

            {/* Scroll indicator */}
            <div className="mt-16 animate-bounce">
              <ChevronDown className="mx-auto text-muted-foreground" size={28} />
            </div>
          </div>
        </section>

        {/* ═══════════ SECTION 1 — PURPOSE ═══════════ */}
        <AnimatedSection>
          <div className="max-w-6xl mx-auto px-6 md:px-12 py-20">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="font-cinzel text-3xl md:text-4xl font-bold text-foreground mb-6">
                  {labels.landingPurposeTitle}
                </h2>
                <p className="font-crimson text-lg text-muted-foreground mb-8 leading-relaxed">
                  {labels.landingPurposeDesc}
                </p>
                <div className="flex items-start gap-4 p-4 rounded-md bg-card/60 border border-border/40">
                  <div className="flex-shrink-0 mt-1">
                    <Smartphone className="text-primary" size={24} />
                  </div>
                  <div>
                    <p className="font-cinzel text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                      <Download size={14} className="text-primary" /> Install as App
                    </p>
                    <p className="font-crimson text-sm text-muted-foreground">
                      {labels.landingPurposeMobile}
                    </p>
                  </div>
                </div>
              </div>

              {/* Themed illustration */}
              <div className="flex items-center justify-center">
                <div className="relative w-64 h-64 md:w-80 md:h-80">
                  <div className="absolute inset-0 rounded-full bg-primary/10 blur-3xl" />
                  <div className="relative w-full h-full flex items-center justify-center">
                    <div className="gothic-card p-8 md:p-12 rounded-lg">
                      <PurposeIcon className="text-primary" size={80} strokeWidth={1.2} />
                      <div className="mt-4 flex justify-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-primary/80" />
                        <div className="w-3 h-3 rounded-full bg-accent/60" />
                        <div className="w-3 h-3 rounded-full bg-muted-foreground/40" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </AnimatedSection>

        <SectionDivider />

        {/* ═══════════ SECTION 2 — FEATURES ═══════════ */}
        <AnimatedSection>
          <div className="max-w-6xl mx-auto px-6 md:px-12 py-20">
            <div className="text-center mb-14">
              <h2 className="font-cinzel text-3xl md:text-4xl font-bold text-foreground mb-4">
                Key Features
              </h2>
              <p className="font-crimson text-lg text-muted-foreground max-w-xl mx-auto italic">
                Everything you need to stay on top of your game
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              {features.map((f, i) => (
                <div key={i} className="gothic-card p-6 group hover:border-primary/40 transition-all duration-300">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <f.Icon className="text-primary" size={24} />
                    </div>
                    <div>
                      <h3 className="font-cinzel text-lg font-semibold text-foreground mb-2">{f.title}</h3>
                      <p className="font-crimson text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </AnimatedSection>

        <SectionDivider />

        {/* ═══════════ SECTION 3 — ADHD / MOTIVATION ═══════════ */}
        <AnimatedSection>
          <div className="max-w-4xl mx-auto px-6 md:px-12 py-20 text-center">
            <div className="inline-block mb-6">
              <Brain className="text-primary mx-auto" size={48} strokeWidth={1.5} />
            </div>
            <h2 className="font-cinzel text-3xl md:text-4xl font-bold text-foreground mb-6">
              {labels.landingADHDTitle}
            </h2>
            <p className="font-crimson text-lg md:text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
              {labels.landingADHDDesc}
            </p>
          </div>
        </AnimatedSection>

        <SectionDivider />

        {/* ═══════════ SECTION 4 — THEMES ═══════════ */}
        <AnimatedSection>
          <div className="max-w-6xl mx-auto px-6 md:px-12 py-20">
            <div className="text-center mb-14">
              <div className="inline-block mb-4">
                <Palette className="text-primary mx-auto" size={40} strokeWidth={1.5} />
              </div>
              <h2 className="font-cinzel text-3xl md:text-4xl font-bold text-foreground mb-4">
                {labels.landingThemesTitle}
              </h2>
              <p className="font-crimson text-lg text-muted-foreground max-w-2xl mx-auto italic">
                {labels.landingThemesDesc}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {THEME_IDS.map((id) => {
                const t = THEMES[id];
                const isActive = theme === id;
                return (
                  <div
                    key={id}
                    className={`gothic-card p-4 text-center transition-all duration-300 ${
                      isActive ? "border-primary/60 shadow-crimson" : "hover:border-primary/30"
                    }`}
                  >
                    <div className="flex justify-center gap-1.5 mb-3">
                      {t.previewColors.map((c, i) => (
                        <div key={i} className="w-6 h-6 rounded-full border border-border/40" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                    <p className="font-cinzel text-sm font-semibold text-foreground">{t.displayName}</p>
                    <p className="font-crimson text-xs text-muted-foreground mt-1">{t.description}</p>
                    {isActive && (
                      <p className="font-crimson text-xs text-primary mt-2 font-semibold">Active</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </AnimatedSection>

        <SectionDivider />

        {/* ═══════════ SECTION 5 — VIDEO / COMING SOON ═══════════ */}
        <AnimatedSection>
          <div className="max-w-4xl mx-auto px-6 md:px-12 py-20">
            <div className="text-center mb-10">
              <h2 className="font-cinzel text-3xl md:text-4xl font-bold text-foreground mb-4">
                {labels.landingVideoTitle}
              </h2>
              <p className="font-crimson text-lg text-muted-foreground max-w-2xl mx-auto italic">
                {labels.landingVideoDesc}
              </p>
            </div>

            {/* Video placeholder — 16:9 */}
            <div className="relative aspect-video rounded-lg overflow-hidden gothic-card">
              <div className="absolute inset-0 bg-card/90 flex flex-col items-center justify-center gap-4">
                <div className="w-20 h-20 rounded-full bg-primary/15 flex items-center justify-center border border-primary/30">
                  <Play className="text-primary ml-1" size={36} />
                </div>
                <p className="font-cinzel text-sm text-muted-foreground tracking-wider uppercase">
                  Tutorial Coming Soon
                </p>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* ═══════════ CTA BANNER ═══════════ */}
        <section className="py-20 px-6 md:px-12">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-cinzel text-2xl md:text-3xl font-bold text-foreground mb-6">
              Ready to Begin?
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/auth?mode=signup" className="gothic-button-primary flex items-center gap-2">
                {labels.landingCta} <ArrowRight size={16} />
              </Link>
              <Link to="/auth?mode=login" className="gothic-button-secondary">
                {labels.landingCtaSecondary}
              </Link>
            </div>
          </div>
        </section>

        {/* ═══════════ FOOTER ═══════════ */}
        <footer className="px-6 md:px-12 py-8 text-center border-t border-border/20">
          <p className="font-crimson text-sm text-muted-foreground">
            © 2026 Realm. All souls reserved.
          </p>
        </footer>
      </div>
    </div>
  );
};

/* ─── Animated wrapper using Intersection Observer ─── */
const AnimatedSection = ({ children }: { children: React.ReactNode }) => {
  const { ref, isVisible } = useInView(0.1);
  return (
    <section
      ref={ref}
      className={`transition-all duration-700 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
    >
      {children}
    </section>
  );
};

export default Index;
