import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import gothicHeroBg from "@/assets/gothic-hero-bg.jpg";

const Home = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Failed to sign out. Please try again.");
    } else {
      toast.success("Until we meet again, traveler.");
      navigate("/");
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${gothicHeroBg})` }}
      />
      
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-background/70" />
      
      {/* Fog Overlay */}
      <div className="absolute inset-0 bg-gradient-fog opacity-50" />

      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Navigation */}
        <header className="flex items-center justify-between px-6 md:px-12 py-6 border-b border-border/30">
          <div className="font-cinzel text-2xl md:text-3xl font-bold tracking-widest text-foreground">
            REALM
          </div>
          <nav className="flex items-center gap-6">
            <div className="hidden md:block font-crimson text-muted-foreground">
              {user?.email}
            </div>
            <button 
              onClick={handleLogout}
              className="gothic-button-secondary text-xs md:text-sm"
            >
              Leave Realm
            </button>
          </nav>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-6 md:px-12 py-12">
          <div className="max-w-6xl mx-auto">
            {/* Welcome Section */}
            <div className="text-center mb-16 opacity-0 animate-fade-in" style={{ animationDelay: "0.2s" }}>
              <h1 className="text-gothic-title text-3xl md:text-5xl mb-4">
                Welcome to the <span className="text-primary">Inner Sanctum</span>
              </h1>
              <p className="font-crimson text-lg md:text-xl text-muted-foreground italic max-w-2xl mx-auto">
                You have passed through the gates. The realm's secrets now lie before you.
              </p>
            </div>

            {/* Dashboard Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-0 animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
              {/* Chronicles - Resources */}
              <Link to="/resources" className="gothic-card p-6 group hover:border-primary/50 transition-all duration-300 cursor-pointer">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-sm bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <h3 className="font-cinzel text-lg tracking-wide text-foreground">Chronicles</h3>
                </div>
                <p className="font-crimson text-muted-foreground">
                  Your collection of sacred resources. Knowledge to guide your journey.
                </p>
              </Link>

              {/* Forge - Tasks */}
              <Link to="/tasks" className="gothic-card p-6 group hover:border-primary/50 transition-all duration-300 cursor-pointer">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-sm bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
                    </svg>
                  </div>
                  <h3 className="font-cinzel text-lg tracking-wide text-foreground">Forge</h3>
                </div>
                <p className="font-crimson text-muted-foreground">
                  Tasks to be hammered into completion. Organize by territory.
                </p>
              </Link>

              {/* Order - Coming Soon */}
              <div className="gothic-card p-6 group hover:border-border/50 transition-all duration-300 opacity-60">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-sm bg-primary/10 flex items-center justify-center">
                    <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="font-cinzel text-lg tracking-wide text-foreground">Order</h3>
                </div>
                <p className="font-crimson text-muted-foreground">
                  Join fellow travelers. <span className="italic">Coming soon...</span>
                </p>
              </div>

              {/* Territories - Projects */}
              <Link to="/projects" className="gothic-card p-6 group hover:border-primary/50 transition-all duration-300 cursor-pointer">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-sm bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                  </div>
                  <h3 className="font-cinzel text-lg tracking-wide text-foreground">Territories</h3>
                </div>
                <p className="font-crimson text-muted-foreground">
                  The projects you've claimed in your conquest. Manage your domains.
                </p>
              </Link>

              {/* Achievements */}
              <Link to="/achievements" className="gothic-card p-6 group hover:border-primary/50 transition-all duration-300 cursor-pointer">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-sm bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </div>
                  <h3 className="font-cinzel text-lg tracking-wide text-foreground">Achievements</h3>
                </div>
                <p className="font-crimson text-muted-foreground">
                  Discover patterns in your knowledge. Invoke the Cleave.
                </p>
              </Link>

              {/* Settings - Coming Soon */}
              <div className="gothic-card p-6 group hover:border-border/50 transition-all duration-300 opacity-60">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-sm bg-primary/10 flex items-center justify-center">
                    <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h3 className="font-cinzel text-lg tracking-wide text-foreground">Settings</h3>
                </div>
                <p className="font-crimson text-muted-foreground">
                  Configure your sanctuary. <span className="italic">Coming soon...</span>
                </p>
              </div>
            </div>
          </div>
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

export default Home;
