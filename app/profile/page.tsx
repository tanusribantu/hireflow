"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db, storage } from "../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>({});
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return router.push("/auth/signin");
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) setProfile(snap.data());
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");

      let resumeUrl = profile.resumeUrl || null;
      if (resumeFile) {
        const rRef = storageRef(storage, `resumes/${user.uid}/${Date.now()}_${resumeFile.name}`);
        await uploadBytes(rRef, resumeFile);
        resumeUrl = await getDownloadURL(rRef);
      }

      const data = {
        ...profile,
        resumeUrl,
        skills: profile.skills || [],
        experience: profile.experience || [],
        education: profile.education || [],
      };

      await setDoc(doc(db, "users", user.uid), data, { merge: true });
      setMessage("Profile saved.");
    } catch (err: any) {
      setMessage(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-8">Loading…</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto bg-white rounded shadow p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Edit Profile</h2>
          <button onClick={() => router.push("/dashboard")} className="px-3 py-2 border rounded">
            Back
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Display name</label>
            <input
              value={profile.name || ""}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              className="mt-1 block w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Skills (comma separated)</label>
            <input
              value={(profile.skills || []).join(", ")}
              onChange={(e) => setProfile({ ...profile, skills: e.target.value.split(",").map(s=>s.trim()).filter(Boolean) })}
              className="mt-1 block w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Experience (JSON array or leave blank)</label>
            <textarea
              rows={3}
              value={profile.experience ? JSON.stringify(profile.experience, null, 2) : ""}
              onChange={(e) => {
                try {
                  setProfile({ ...profile, experience: JSON.parse(e.target.value) });
                } catch {
                  setProfile({ ...profile, experience: profile.experience || [] });
                }
              }}
              className="mt-1 block w-full border rounded px-3 py-2 font-mono text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Education (JSON array or leave blank)</label>
            <textarea
              rows={2}
              value={profile.education ? JSON.stringify(profile.education, null, 2) : ""}
              onChange={(e) => {
                try {
                  setProfile({ ...profile, education: JSON.parse(e.target.value) });
                } catch {
                  setProfile({ ...profile, education: profile.education || [] });
                }
              }}
              className="mt-1 block w-full border rounded px-3 py-2 font-mono text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Resume (PDF/DOC)</label>
            <input
              type="file"
              accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => setResumeFile(e.target.files ? e.target.files[0] : null)}
              className="mt-1"
            />
            {profile.resumeUrl && (
              <p className="mt-2 text-sm text-gray-600">
                Current resume: <a href={profile.resumeUrl} target="_blank" className="text-indigo-600">View</a>
              </p>
            )}
          </div>

          {message && <div className="text-sm text-green-700">{message}</div>}

          <div>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded">
              {saving ? "Saving…" : "Save profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
