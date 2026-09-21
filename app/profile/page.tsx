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

  if (loading) {
    return (
      <div className="card max-w-3xl">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-28 rounded bg-slate-200" />
          <div className="h-10 w-full rounded bg-slate-200" />
          <div className="h-10 w-full rounded bg-slate-200" />
          <div className="h-20 w-full rounded bg-slate-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="card">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-indigo-600">Candidate</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">Profile</h1>
          </div>
          <button onClick={() => router.push("/jobs")} className="btn-secondary">
            Browse jobs
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Display name</label>
            <input
              value={profile.name || ""}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Skills (comma separated)</label>
            <input
              value={(profile.skills || []).join(", ")}
              onChange={(e) => setProfile({ ...profile, skills: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
              className="input-field"
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">Projects</h2>
              <button type="button" onClick={() => setProfile((current: any) => ({ ...current, projects: [...(current.projects || []), { title: "", description: "", demonstratesSkills: [] }] }))} className="btn-secondary text-sm">
                Add project
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {(profile.projects || []).map((project: any, index: number) => (
                <div key={`${project.title || "project"}-${index}`} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700">Project title</label>
                      <input
                        value={project.title || ""}
                        onChange={(e) => setProfile((current: any) => ({
                          ...current,
                          projects: (current.projects || []).map((item: any, itemIndex: number) => itemIndex === index ? { ...item, title: e.target.value } : item),
                        }))}
                        className="input-field"
                        placeholder="e.g. Hiring dashboard"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700">Description</label>
                      <textarea
                        rows={2}
                        value={project.description || ""}
                        onChange={(e) => setProfile((current: any) => ({
                          ...current,
                          projects: (current.projects || []).map((item: any, itemIndex: number) => itemIndex === index ? { ...item, description: e.target.value } : item),
                        }))}
                        className="input-field"
                        placeholder="What did this project build?"
                      />
                    </div>
                  </div>

                  <div className="mt-3">
                    <p className="text-sm font-medium text-slate-700">Skills this project demonstrates</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(profile.skills || []).length === 0 ? (
                        <p className="text-xs text-slate-500">Add some skills above before tagging a project.</p>
                      ) : (profile.skills || []).map((skill: string) => {
                        const checked = (project.demonstratesSkills || []).includes(skill);
                        return (
                          <label key={`${skill}-${index}`} className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => setProfile((current: any) => ({
                                ...current,
                                projects: (current.projects || []).map((item: any, itemIndex: number) => {
                                  if (itemIndex !== index) return item;
                                  const demonstratesSkills = item.demonstratesSkills || [];
                                  return {
                                    ...item,
                                    demonstratesSkills: checked
                                      ? demonstratesSkills.filter((entry: string) => entry !== skill)
                                      : [...demonstratesSkills, skill],
                                  };
                                }),
                              }))}
                              className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            {skill}
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <button type="button" onClick={() => setProfile((current: any) => ({ ...current, projects: (current.projects || []).filter((_: any, itemIndex: number) => itemIndex !== index) }))} className="text-sm font-medium text-red-600 hover:text-red-700">
                      Remove project
                    </button>
                  </div>
                </div>
              ))}

              {!(profile.projects || []).length && (
                <p className="text-sm text-slate-500">No projects yet. Add one to show project-backed skill evidence.</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Experience (JSON array or leave blank)</label>
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
              className="input-field font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Education (JSON array or leave blank)</label>
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
              className="input-field font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Resume (PDF/DOC)</label>
            <input
              type="file"
              accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => setResumeFile(e.target.files ? e.target.files[0] : null)}
              className="mt-1 block w-full text-sm text-slate-600"
            />
            {profile.resumeUrl && (
              <p className="mt-2 text-sm text-slate-600">
                Current resume: <a href={profile.resumeUrl} target="_blank" className="font-medium text-indigo-600">View</a>
              </p>
            )}
          </div>

          {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</div>}

          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving…" : "Save profile"}
            </button>
            <button type="button" onClick={() => router.push("/applications")} className="btn-secondary">
              View applications
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
