import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";
import gothicHeroBg from "@/assets/gothic-hero-bg.jpg";

const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

const ResetPassword = () => {
  const navigate = useNavigate();
  const { theme, themeConfig } = useTheme();
  const labels = themeConfig.labels;
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    // Check hash for recovery token
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { password?: string; confirm?: string } = {};

    const result = passwordSchema.safeParse(password);
    if (!result.success) {
      newErrors.password = result.error.errors[0].message;
    }
    if (password !== confirmPassword) {
      newErrors.confirm = "Passwords do not match";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated successfully!");
      navigate("/home");
    } catch (error: any) {
      toast.error(error.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  const bgStyle = theme === "gothic"
    ? { backgroundImage: `url(${gothicHeroBg})` }
    : { background: themeConfig.backgroundCss };

  if (!isRecovery) {
    return (
      <div className="relative min-h-screen overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-110 blur-sm" style={bgStyle} />
        <div className="absolute inset-0 bg-background/80" />
        <div className="relative z-10 w-full max-w-md mx-4">
          <div className="gothic-card p-8 md:p-10 text-center">
            <h1 className="font-cinzel text-2xl font-bold tracking-widest text-foreground mb-4">
              Invalid Link
            </h1>
            <p className="font-crimson text-muted-foreground mb-6">
              This password reset link is invalid or has expired.
            </p>
            <Link
              to="/auth?mode=login"
              className="text-primary hover:underline font-crimson"
            >
              Return to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center">
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-110 blur-sm" style={bgStyle} />
      <div className="absolute inset-0 bg-background/80" />
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="gothic-card p-8 md:p-10">
          <div className="text-center mb-8">
            <h1 className="font-cinzel text-2xl font-bold tracking-widest text-foreground mb-2">
              {labels.appName}
            </h1>
            <p className="font-crimson text-muted-foreground italic">
              Set your new password
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block font-cinzel text-xs tracking-wider uppercase text-foreground mb-2">
                New Password
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

            <div>
              <label className="block font-cinzel text-xs tracking-wider uppercase text-foreground mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="gothic-input w-full px-4 py-3 font-crimson"
                placeholder="••••••••"
              />
              {errors.confirm && (
                <p className="text-destructive text-sm mt-1 font-crimson">{errors.confirm}</p>
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
                  Updating...
                </span>
              ) : (
                "Update Password"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
