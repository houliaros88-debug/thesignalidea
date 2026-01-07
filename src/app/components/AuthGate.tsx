"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const allowLogin = searchParams?.get("logged_out") === "1";
  const hasLogoutFlag =
    typeof window !== "undefined" &&
    window.sessionStorage.getItem("tsilogout") === "1";
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;

    if (pathname === "/login" && (allowLogin || hasLogoutFlag)) {
      supabase.auth.signOut({ scope: "local" });
      if (hasLogoutFlag && typeof window !== "undefined") {
        window.sessionStorage.removeItem("tsilogout");
      }
      setChecking(false);
      return () => {
        isMounted = false;
      };
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        if (!session && pathname !== "/login") {
          router.replace("/login");
          return;
        }
        if (session && pathname === "/login" && !allowLogin && !hasLogoutFlag) {
          router.replace("/");
          return;
        }
        setChecking(false);
      }
    );

    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;

      if (!data.session && pathname !== "/login") {
        router.replace("/login");
        return;
      }

      if (data.session && pathname === "/login" && !allowLogin && !hasLogoutFlag) {
        router.replace("/");
        return;
      }

      setChecking(false);
    };

    checkSession();

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [pathname, router, allowLogin, hasLogoutFlag]);

  if (checking && pathname !== "/login") {
    return null;
  }

  return <>{children}</>;
}
