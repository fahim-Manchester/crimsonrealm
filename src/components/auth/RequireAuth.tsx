import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

interface RequireAuthProps {
  children: React.ReactNode;
}

/**
 * Route guard component that protects routes requiring authentication.
 * - Shows loading spinner while checking auth state
 * - Redirects to /auth if no session
 * - Persists last visited route for restoration after reload (via useEffect, not render)
 */
export const RequireAuth = ({ children }: RequireAuthProps) => {
  const { session, loading, user } = useAuth();
  const location = useLocation();

  // Persist last visited protected route for restoration after reload
  // CRITICAL: Done in useEffect to avoid side effects during render
  useEffect(() => {
    if (session && user) {
      try {
        const routeKey = `lastRoute:${user.id}`;
        localStorage.setItem(routeKey, location.pathname + location.search);
      } catch {
        // localStorage might be unavailable
      }
    }
  }, [session, user, location.pathname, location.search]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!session) {
    // Redirect to auth, preserving the intended destination
    return <Navigate to="/auth?mode=login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
};
