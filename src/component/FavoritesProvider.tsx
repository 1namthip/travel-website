"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import toast from "react-hot-toast";

export type FavoriteType = "destination" | "restaurant" | "accommodation";

const keyOf = (type: FavoriteType, id: string | number) => `${type}:${id}`;

interface FavoritesContextValue {
  ready: boolean;
  isLoggedIn: boolean;
  count: number;
  isFavorite: (type: FavoriteType, id: string | number) => boolean;
  toggleFavorite: (type: FavoriteType, id: string | number) => Promise<void>;
  refresh: () => void;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      ),
    [],
  );

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [ready, setReady] = useState(false);
  const [keys, setKeys] = useState<Set<string>>(new Set());
  const inFlight = useRef<Set<string>>(new Set());

  const loadKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/favorites");
      if (!res.ok) {
        setKeys(new Set());
        return;
      }
      const data = await res.json();
      const next = new Set<string>();
      for (const f of data.favorites ?? []) {
        next.add(keyOf(f.item_type, f.item_id));
      }
      setKeys(next);
    } catch {
      setKeys(new Set());
    }
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!active) return;
      setIsLoggedIn(!!user);
      if (user) await loadKeys();
      if (active) setReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const loggedIn = !!session?.user;
      setIsLoggedIn(loggedIn);
      if (loggedIn) {
        loadKeys();
      } else {
        setKeys(new Set());
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase, loadKeys]);

  const isFavorite = useCallback(
    (type: FavoriteType, id: string | number) => keys.has(keyOf(type, id)),
    [keys],
  );

  const toggleFavorite = useCallback(
    async (type: FavoriteType, id: string | number) => {
      if (!isLoggedIn) {
        toast(
          (t) => (
            <span className="flex items-center gap-2 text-sm">
              เข้าสู่ระบบเพื่อเก็บไว้ในคอลเลคชั่น
              <Link
                href="/sign-in"
                onClick={() => toast.dismiss(t.id)}
                className="font-semibold text-amber-600 underline underline-offset-2"
              >
                เข้าสู่ระบบ
              </Link>
            </span>
          ),
          { icon: "🔒" },
        );
        return;
      }

      const key = keyOf(type, id);
      if (inFlight.current.has(key)) return;
      inFlight.current.add(key);

      const currentlyFav = keys.has(key);

      // optimistic
      setKeys((prev) => {
        const next = new Set(prev);
        if (currentlyFav) next.delete(key);
        else next.add(key);
        return next;
      });

      try {
        const res = currentlyFav
          ? await fetch(
              `/api/favorites?itemId=${encodeURIComponent(String(id))}&itemType=${type}`,
              { method: "DELETE" },
            )
          : await fetch("/api/favorites", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ itemId: String(id), itemType: type }),
            });

        if (!res.ok) throw new Error("request failed");

        toast.success(
          currentlyFav ? "เอาออกจากคอลเลคชั่นแล้ว" : "เก็บไว้ในคอลเลคชั่นแล้ว",
        );
      } catch {
        // revert
        setKeys((prev) => {
          const next = new Set(prev);
          if (currentlyFav) next.add(key);
          else next.delete(key);
          return next;
        });
        toast.error("ทำรายการไม่สำเร็จ ลองใหม่อีกครั้ง");
      } finally {
        inFlight.current.delete(key);
      }
    },
    [isLoggedIn, keys],
  );

  const value: FavoritesContextValue = {
    ready,
    isLoggedIn,
    count: keys.size,
    isFavorite,
    toggleFavorite,
    refresh: loadKeys,
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error("useFavorites must be used within <FavoritesProvider>");
  }
  return ctx;
}
