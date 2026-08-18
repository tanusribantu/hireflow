"use client";

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
    // Step 1: create auth user
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

    // Step 2: write user profile to Firestore, but don't let a stalled network hang the UI.
    try {
      const writePromise = setDoc(doc(db, "users", uid), {
        role,
        name,
        email,
        phone: null,
        emailVerified: false,
        phoneVerified: false,
        createdAt: new Date().toISOString(),
      });

      // Timeout helper: resolves after 5s
      const timeout = new Promise((resolve) => setTimeout(() => resolve('timeout'), 5000));

      const result = await Promise.race([writePromise.then(() => 'ok'), timeout]);
      if (result === 'timeout') {
        // Firestore write is taking too long; log and continue so UI doesn't get stuck.
        console.warn('Firestore write timed out; continuing and letting write finish in background.');
        writePromise.catch((err) => console.error('Deferred Firestore write failed:', err));
        setError('Profile save is taking longer than expected. You may finish setup from your profile page.');
      }
    } catch (err: any) {
      console.error("Firestore error writing user profile:", err);
      setError(err?.message || "Failed to save user profile. You can retry from your profile page.");
      setLoading(false);
      return;
    }

    // Success: stop loading and redirect
    setLoading(false);
    console.log('Signup flow complete, redirecting to dashboard');
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow">
        <h1 className="text-2xl font-semibold mb-6">Create an account</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Full name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">I am a</label>
            <div className="mt-1 flex gap-3">
              <button
                type="button"
                onClick={() => setRole("candidate")}
                className={`px-3 py-2 rounded border ${role === "candidate" ? "bg-indigo-600 text-white" : "bg-white"}`}>
                Candidate
              </button>
              <button
                type="button"
                onClick={() => setRole("recruiter")}
                className={`px-3 py-2 rounded border ${role === "recruiter" ? "bg-indigo-600 text-white" : "bg-white"}`}>
                Recruiter
              </button>
            </div>
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white px-4 py-2 rounded">
              {loading ? "Creating…" : "Create account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
