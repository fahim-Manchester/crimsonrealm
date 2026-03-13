import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";
import gothicHeroBg from "@/assets/gothic-hero-bg.jpg";

const emailSchema = z.string().email("Please enter a valid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

const Auth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { theme, themeConfig } = useTheme();
  const labels = themeConfig.labels;
  const [isLogin, setIsLogin] = useState(searchParams.get("mode") !== "signup");
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  useEffect(() => {
    // Check if user is already logged in
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/home");
      }
    };
    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/home");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    setIsLogin(searchParams.get("mode") !== "signup");
  }, [searchParams]);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }

    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success("Welcome back!");
      } else {
        const redirectUrl = `${window.location.origin}/`;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
          },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account!");
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      if (error.message.includes("User already registered")) {
        toast.error("This email is already registered. Try signing in instead.");
      } else if (error.message.includes("Invalid login credentials")) {
        toast.error("Invalid email or password. Please try again.");
      } else {
        toast.error(error.message || "An error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const bgStyle = theme === "gothic"
    ? { backgroundImage: `url(${gothicHeroBg})` }
    : { background: themeConfig.backgroundCss };

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-110 blur-sm"
        style={bgStyle}
      />
      
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-background/80" />
      
      {/* Content */}
      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Back Link */}
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 font-crimson"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {labels.authBackLink}
        </Link>

        {/* Auth Card */}
        <div className="gothic-card p-8 md:p-10">
          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="font-cinzel text-3xl font-bold tracking-widest text-foreground mb-2">
              {labels.appName}
            </h1>
            <p className="font-crimson text-muted-foreground italic">
              {isLogin ? labels.authWelcomeBack : labels.authJoin}
            </p>
          </div>

          {/* Toggle */}
          <div className="flex mb-8">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-3 font-cinzel text-sm tracking-wider uppercase transition-all ${
                isLogin 
                  ? "text-primary border-b-2 border-primary" 
                  : "text-muted-foreground border-b border-border hover:text-foreground"
              }`}
            >
              {labels.authEnter}
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-3 font-cinzel text-sm tracking-wider uppercase transition-all ${
                !isLogin 
                  ? "text-primary border-b-2 border-primary" 
                  : "text-muted-foreground border-b border-border hover:text-foreground"
              }`}
            >
              {labels.authCreate}
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block font-cinzel text-xs tracking-wider uppercase text-foreground mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="gothic-input w-full px-4 py-3 font-crimson"
                placeholder="your@email.com"
              />
              {errors.email && (
                <p className="text-destructive text-sm mt-1 font-crimson">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block font-cinzel text-xs tracking-wider uppercase text-foreground mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="gothic-input w-full px-4 py-3 font-crimson"
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="text-destructive text-sm mt-1 font-crimson">{errors.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="gothic-button-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {isLogin ? "Entering..." : "Creating..."}
                </span>
              ) : (
                isLogin ? labels.authEnter : labels.authCreate
              )}
            </button>
          </form>

          {/* Footer text */}
          <p className="text-center text-muted-foreground text-sm font-crimson mt-6">
            {isLogin ? (
              <>
                New here?{" "}
                <button 
                  onClick={() => setIsLogin(false)}
                  className="text-primary hover:underline"
                >
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already a member?{" "}
                <button 
                  onClick={() => setIsLogin(true)}
                  className="text-primary hover:underline"
                >
                  {labels.authEnter}
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
