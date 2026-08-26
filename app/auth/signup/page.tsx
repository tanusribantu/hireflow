"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../../lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"candidate" | "recruiter">("candidate");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    let uid: string | null = null;
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      uid = cred.user.uid;
    } catch (err: any) {
      console.error("Auth error during signup:", err);
      setError(err?.message || "Signup failed during authentication");
      setLoading(false);
      return;
    }

    try {
      const writePromise = setDoc(doc(db, "users", uid!), {
        role,
        name,
        email,
        phone: null,
        emailVerified: false,
        phoneVerified: false,
        createdAt: new Date().toISOString(),
      });

      const timeout = new Promise((resolve) => setTimeout(() => resolve("timeout"), 5000));
      const result = await Promise.race([writePromise.then(() => "ok"), timeout]);

      if (result === "timeout") {
        console.warn("Firestore write timed out; continuing and letting write finish in background.");
        writePromise.catch((err) => console.error("Deferred Firestore write failed:", err));
        setError("Profile save is taking longer than expected. You can finish setup from your profile page.");
      }
    } catch (err: any) {
      console.error("Firestore error writing user profile:", err);
      setError(err?.message || "Failed to save user profile. You can retry from your profile page.");
      setLoading(false);
      return;
    }

    setLoading(false);
    if (role === "candidate") {
      router.push("/profile");
    } else {
      router.push("/jobs/new");
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-120px)] items-center justify-center py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
        <p className="mt-2 text-sm text-slate-600">Start your hiring or job search journey in under a minute.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Full name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Password</label>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">I am a</label>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("candidate")}
                className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                  role === "candidate" ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 bg-white text-slate-700"
                }`}>
                Candidate
              </button>
              <button
                type="button"
                onClick={() => setRole("recruiter")}
                className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                  role === "recruiter" ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 bg-white text-slate-700"
                }`}>
                Recruiter
              </button>
            </div>
          </div>

          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account? <Link href="/auth/signin" className="font-semibold text-indigo-600">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
