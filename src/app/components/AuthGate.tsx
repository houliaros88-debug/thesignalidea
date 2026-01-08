"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const getNextPath = () => {
      if (typeof window === "undefined") return "/";
      return `${window.location.pathname}${window.location.search}`;
    };
    const getLoginUrl = () => `/login?next=${encodeURIComponent(getNextPath())}`;
    const sanitizeNext = (value: string | null) => {
      if (!value || value === "/login") return "/";
      return value.startsWith("/") ? value : "/";
    };

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!isMounted) return;
        if (!session && pathname !== "/login") {
          router.replace(getLoginUrl());
          return;
        }
        if (session && pathname === "/login") {
          const params = new URLSearchParams(window.location.search);
          router.replace(sanitizeNext(params.get("next")));
          return;
        }
        setChecking(false);
      }
    );

    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;

      if (!data.session && pathname !== "/login") {
        router.replace(getLoginUrl());
        return;
      }
      if (data.session && pathname === "/login") {
        const params = new URLSearchParams(window.location.search);
        router.replace(sanitizeNext(params.get("next")));
        return;
      }

      setChecking(false);
    };

    checkSession();

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [pathname, router]);

  if (checking && pathname !== "/login") {
    return null;
  }

  return <>{children}</>;
}
