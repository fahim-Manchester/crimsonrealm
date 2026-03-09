import { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";
import gothicHeroBg from "@/assets/gothic-hero-bg.jpg";
import InstallButton from "@/components/pwa/InstallButton";
import ThemeSwitcher from "@/components/theme/ThemeSwitcher";

interface PageLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

const PageLayout = ({ children, title, subtitle }: PageLayoutProps) => {
  const navigate = useNavigate();
  const { theme, themeConfig } = useTheme();
  const labels = themeConfig.labels;

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Failed to sign out. Please try again.");
    } else {
      toast.success("Until we meet again.");
      navigate("/");
    }
  };

  const bgStyle = theme === "gothic"
    ? { backgroundImage: `url(${gothicHeroBg})` }
    : { background: themeConfig.backgroundCss };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={bgStyle} />
      <div className="absolute inset-0 bg-background/80" />
      {theme === "gothic" && <div className="absolute inset-0 bg-gradient-fog opacity-30" />}

      <div className="relative z-10 flex flex-col min-h-screen">
        <header className="flex items-center justify-between px-6 md:px-12 py-6 border-b border-border/30">
          <Link to="/home" className="font-cinzel text-2xl md:text-3xl font-bold tracking-widest text-foreground hover:text-primary transition-colors">
            {labels.appName}
          </Link>
          <nav className="flex items-center gap-4">
            <InstallButton />
            <ThemeSwitcher />
            <Link to="/home" className="font-crimson text-muted-foreground hover:text-foreground transition-colors">
              {labels.homeName}
            </Link>
            <button onClick={handleLogout} className="gothic-button-secondary text-xs md:text-sm">
              {labels.logout}
            </button>
          </nav>
        </header>

        <div className="px-6 md:px-12 py-8 border-b border-border/20">
          <h1 className="text-gothic-title text-2xl md:text-4xl mb-2">{title}</h1>
          {subtitle && <p className="font-crimson text-muted-foreground italic">{subtitle}</p>}
        </div>

        <main className="flex-1 px-6 md:px-12 py-8">{children}</main>

        <footer className="px-6 md:px-12 py-6 border-t border-border/30 text-center">
          <p className="font-crimson text-sm text-muted-foreground">© 2026 Realm. All souls reserved.</p>
        </footer>
      </div>
    </div>
  );
};

export default PageLayout;
