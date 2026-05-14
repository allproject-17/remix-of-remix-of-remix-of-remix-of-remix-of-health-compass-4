import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export const ProtectedRoute = ({ children, requireProfile = true }: { children: ReactNode; requireProfile?: boolean }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [profileChecked, setProfileChecked] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    if (!user) { setProfileChecked(true); return; }
    setProfileChecked(false);
    supabase.from("profiles").select("full_name,dob,gender").eq("user_id", user.id).maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error("profile check error", error);
        setHasProfile(!!(data?.full_name?.trim() && data?.dob && data?.gender));
        setProfileChecked(true);
      });
  }, [user, location.pathname]);

  if (loading || (user && !profileChecked))
    return <div className="min-h-screen grid place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/auth" state={{ from: location }} replace />;
  if (requireProfile && !hasProfile && location.pathname !== "/profile")
    return <Navigate to="/profile" replace />;
  return <>{children}</>;
};
