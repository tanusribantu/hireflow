"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { auth, db } from "../../lib/firebase";

type Role = "candidate" | "recruiter";

type Profile = {
  role?: Role;
  name?: string;
  email?: string;
};

const candidateNav = [
  { href: "/jobs", label: "Browse Jobs" },
  { href: "/applications", label: "My Applications" },
  { href: "/profile", label: "Profile" },
];

const recruiterNav = [
  { href: "/jobs/new", label: "Post Job" },
  { href: "/my-listings", label: "My Listings" },
  { href: "/applicants", label: "Applicants" },
];

const publicNav = [
  { href: "/jobs", label: "Browse Jobs" },
  { href: "/auth/signin", label: "Login" },
  { href: "/auth/signup", label: "Sign Up" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      if (!nextUser) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      setUser(nextUser);
      try {
        const snap = await getDoc(doc(db, "users", nextUser.uid));
        if (snap.exists()) {
          setProfile(snap.data() as Profile);
        } else {
          setProfile({
            role: "candidate",
            name: nextUser.email?.split("@")[0] || "New user",
            email: nextUser.email || "",
          });
        }
      } catch {
        setProfile({
          role: "candidate",
          name: nextUser.email?.split("@")[0] || "New user",
          email: nextUser.email || "",
        });
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const navItems = useMemo(() => {
    if (profile?.role === "recruiter") return recruiterNav;
    return candidateNav;
  }, [profile]);

  const isActiveLink = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href={user ? (profile?.role === "recruiter" ? "/my-listings" : "/jobs") : "/"} className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold text-white shadow-sm">
              H
            </div>
            <div>
              <div className="text-lg font-semibold text-slate-900">Hireflow</div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Talent portal</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {user && !loading
              ? navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                      isActiveLink(item.href)
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))
              : publicNav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                      isActiveLink(item.href)
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 sm:inline">
                  {profile?.name || "Member"}
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    await signOut(auth);
                    router.push("/");
                  }}
                  className="btn-secondary"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/signin" className="btn-secondary hidden sm:inline-flex">
                  Login
                </Link>
                <Link href="/auth/signup" className="btn-primary">
                  Join now
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
