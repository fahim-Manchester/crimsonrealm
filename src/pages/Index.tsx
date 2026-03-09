import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import gothicHeroBg from "@/assets/gothic-hero-bg.jpg";
import ThemeSwitcher from "@/components/theme/ThemeSwitcher";

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

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={bgStyle} />
      
      {theme === "gothic" && (
        <>
          <div className="absolute inset-0 bg-gradient-fog" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/40 via-transparent to-background/40 animate-fog" />
        </>
      )}

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Navigation */}
        <header className="flex items-center justify-between px-6 md:px-12 py-6">
          <div className="font-cinzel text-2xl md:text-3xl font-bold tracking-widest text-foreground">
            {labels.appName}
          </div>
          <nav className="flex items-center gap-4">
            <ThemeSwitcher />
            <Link to="/auth?mode=login" className="gothic-button-secondary text-xs md:text-sm">
              Sign In
            </Link>
            <Link to="/auth?mode=signup" className="gothic-button-primary text-xs md:text-sm">
              Join Now
            </Link>
          </nav>
        </header>

        {/* Hero Section */}
        <main className="flex-1 flex items-center justify-center px-6 md:px-12">
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

            <div className="flex items-center justify-center gap-4 mt-16">
              <div className="h-px w-24 md:w-32 bg-gradient-to-r from-transparent via-border to-transparent" />
            </div>
          </div>
        </main>

        <footer className="px-6 md:px-12 py-8 text-center">
          <p className="font-crimson text-sm text-muted-foreground">
            © 2026 Realm. All souls reserved.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
