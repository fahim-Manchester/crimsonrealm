import { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import gothicHeroBg from "@/assets/gothic-hero-bg.jpg";

interface PageLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

const PageLayout = ({ children, title, subtitle }: PageLayoutProps) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Failed to sign out. Please try again.");
    } else {
      toast.success("Until we meet again, traveler.");
      navigate("/");
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${gothicHeroBg})` }}
      />
      
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-background/80" />
      
      {/* Fog Overlay */}
      <div className="absolute inset-0 bg-gradient-fog opacity-30" />

      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Navigation */}
        <header className="flex items-center justify-between px-6 md:px-12 py-6 border-b border-border/30">
          <Link to="/home" className="font-cinzel text-2xl md:text-3xl font-bold tracking-widest text-foreground hover:text-primary transition-colors">
            REALM
          </Link>
          <nav className="flex items-center gap-4">
            <Link to="/home" className="font-crimson text-muted-foreground hover:text-foreground transition-colors">
              Sanctum
            </Link>
            <button 
              onClick={handleLogout}
              className="gothic-button-secondary text-xs md:text-sm"
            >
              Leave Realm
            </button>
          </nav>
        </header>

        {/* Page Header */}
        <div className="px-6 md:px-12 py-8 border-b border-border/20">
          <h1 className="text-gothic-title text-2xl md:text-4xl mb-2">{title}</h1>
          {subtitle && (
            <p className="font-crimson text-muted-foreground italic">{subtitle}</p>
          )}
        </div>

        {/* Main Content */}
        <main className="flex-1 px-6 md:px-12 py-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="px-6 md:px-12 py-6 border-t border-border/30 text-center">
          <p className="font-crimson text-sm text-muted-foreground">
            © 2026 Realm. All souls reserved.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default PageLayout;
