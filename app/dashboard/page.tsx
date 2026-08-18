"use client";

import { useEffect, useState } from "react";
import { auth, db } from "../../lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/auth/signin");
        return;
      }
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) setProfile(snap.data());
    });
    return () => unsub();
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded shadow p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Dashboard</h2>
          <div className="flex gap-2">
            <button
              onClick={() => router.push("/profile")}
              className="px-3 py-2 border rounded">
              Edit profile
            </button>
            <button
              onClick={() => signOut(auth)}
              className="px-3 py-2 bg-red-500 text-white rounded">
              Sign out
            </button>
          </div>
        </div>

        <div className="mt-6">
          {profile ? (
            <div>
              <p className="text-sm text-gray-600">Signed in as</p>
              <h3 className="text-lg font-medium">{profile.name || profile.email}</h3>
              <p className="text-sm text-gray-500">Role: {profile.role}</p>
            </div>
          ) : (
            <p>Loading profile…</p>
          )}
        </div>
      </div>
    </div>
  );
}
