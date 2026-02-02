import { Link } from "react-router-dom";
import gothicHeroBg from "@/assets/gothic-hero-bg.jpg";

const Index = () => {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${gothicHeroBg})` }}
      />
      
      {/* Fog Overlay */}
      <div className="absolute inset-0 bg-gradient-fog" />
      
      {/* Ambient fog animation layer */}
      <div className="absolute inset-0 bg-gradient-to-r from-background/40 via-transparent to-background/40 animate-fog" />

      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Navigation */}
        <header className="flex items-center justify-between px-6 md:px-12 py-6">
          <div className="font-cinzel text-2xl md:text-3xl font-bold tracking-widest text-foreground">
            REALM
          </div>
          <nav className="flex items-center gap-4">
            <Link 
              to="/auth?mode=login" 
              className="gothic-button-secondary text-xs md:text-sm"
            >
              Sign In
            </Link>
            <Link 
              to="/auth?mode=signup" 
              className="gothic-button-primary text-xs md:text-sm"
            >
              Join Now
            </Link>
          </nav>
        </header>

        {/* Hero Section */}
        <main className="flex-1 flex items-center justify-center px-6 md:px-12">
          <div className="text-center max-w-4xl mx-auto opacity-0 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
            {/* Decorative Element */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="h-px w-16 md:w-24 bg-gradient-to-r from-transparent to-primary/60" />
              <div className="w-2 h-2 rotate-45 bg-primary/60" />
              <div className="h-px w-16 md:w-24 bg-gradient-to-l from-transparent to-primary/60" />
            </div>

            {/* Main Title */}
            <h1 className="text-gothic-title text-4xl md:text-6xl lg:text-7xl mb-6 leading-tight">
              Enter the <span className="text-primary">Dark Realm</span>
            </h1>

            {/* Subtitle */}
            <p className="font-crimson text-lg md:text-xl lg:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto italic">
              Where shadows whisper secrets and legends are forged in the eternal twilight. 
              Your destiny awaits beyond the gates.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
              <Link 
                to="/auth?mode=signup" 
                className="gothic-button-primary w-full sm:w-auto animate-float"
              >
                Begin Your Journey
              </Link>
              <Link 
                to="/auth?mode=login" 
                className="gothic-button-secondary w-full sm:w-auto"
              >
                Return to Realm
              </Link>
            </div>

            {/* Decorative Element */}
            <div className="flex items-center justify-center gap-4 mt-16">
              <div className="h-px w-24 md:w-32 bg-gradient-to-r from-transparent via-border to-transparent" />
            </div>
          </div>
        </main>

        {/* Footer */}
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
