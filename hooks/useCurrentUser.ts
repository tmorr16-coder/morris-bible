"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

let cachedUserPromise: Promise<User | null> | null = null;

export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cachedUserPromise) {
      cachedUserPromise = createClient()
        .auth.getUser()
        .then(({ data: { user } }) => user)
        .catch(() => null);
    }
    cachedUserPromise.then((u) => { setUser(u); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      cachedUserPromise = null;
    });
    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
}
