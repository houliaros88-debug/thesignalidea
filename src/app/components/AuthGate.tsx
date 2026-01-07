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

    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;

      if (!data.session && pathname !== "/login") {
        router.replace("/login");
        return;
      }

      if (data.session && pathname === "/login") {
        router.replace("/");
        return;
      }

      setChecking(false);
    };

    checkSession();

    return () => {
      isMounted = false;
    };
  }, [pathname, router]);

  if (checking && pathname !== "/login") {
    return null;
  }

  return <>{children}</>;
}
