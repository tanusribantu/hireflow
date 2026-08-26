"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db, auth } from "../../../lib/firebase";
import { doc, getDoc, getDocFromServer } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import ApplicationProgress from "../../components/ApplicationProgress";

export default function ApplicationPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { id } = params;
  const [app, setApp] = useState<any | null>(null);
  const [job, setJob] = useState<any | null>(null);
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [canUpdate, setCanUpdate] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const snap = await getDocFromServer(doc(db, "applications", id));
      if (!snap.exists()) return setApp(null);
      const data = { id: snap.id, ...(snap.data() as any) };
      setApp(data);
      if (data.jobId) {
        const j = await getDocFromServer(doc(db, "jobs", data.jobId));
        if (j.exists()) setJob({ id: j.id, ...(j.data() as any) });
      }
    }
    load();
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) {
        setRole(null);
        setCanUpdate(false);
        return;
      }

      const profileSnapshot = await getDocFromServer(doc(db, "users", u.uid));
      const profile = profileSnapshot.exists() ? profileSnapshot.data() : null;
      setRole(profile?.role || null);
    });
    return () => unsub();
  }, [id]);

  useEffect(() => {
    setCanUpdate(role === "recruiter" && Boolean(user && job?.recruiterId === user.uid));
  }, [job, role, user]);

  useEffect(() => {
    if (app) setNewStatus(app.status || "Applied");
  }, [app]);

  if (app === null) return <div className="p-8">Application not found</div>;
  if (!app) return <div className="p-8">Loading…</div>;

  async function handleUpdate() {
    setUpdating(true);
    setMessage(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/applications/update-status', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ applicationId: id, newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update');
      // reload
      const snap = await getDocFromServer(doc(db, 'applications', id));
      setApp({ id: snap.id, ...(snap.data() as any) });
      setMessage('Status updated');
    } catch (err: any) {
      setMessage(err.message || 'Update failed');
    } finally {
      setUpdating(false);
    }
  }

  const status = app.status || (app.statusHistory && app.statusHistory[app.statusHistory.length-1]?.status) || 'Applied';

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded shadow p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Application — {job?.title || app.jobId}</h2>
          <div className="text-sm text-gray-500">Applied: {new Date(app.appliedAt).toLocaleString()}</div>
        </div>

        <div className="mt-6">
          <ApplicationProgress currentStatus={status} />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium">Candidate</h3>
            <p className="mt-2">{app.candidateId}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium">Job</h3>
            <p className="mt-2">{job ? job.title : app.jobId}</p>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-medium">Status history</h3>
          <ul className="mt-2 text-sm text-gray-700">
            {(app.statusHistory || []).map((s: any, i: number) => (
              <li key={i}>{s.status} — {new Date(s.timestamp).toLocaleString()}</li>
            ))}
          </ul>
          {status === "Rejected" && app.rejectionReason && (
            <p className="mt-3 text-sm text-red-600">
              Reason{app.rejectionReasonSource === "system" ? " (system-generated)" : ""}: {app.rejectionReason}
            </p>
          )}
        </div>

        {canUpdate && (
          <div className="mt-6">
            <h3 className="text-sm font-medium">Update status</h3>
            <div className="mt-2 flex gap-2 items-center">
              <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="border px-3 py-2 rounded">
                <option>Applied</option>
                <option>Under Review</option>
                <option>Shortlisted</option>
                <option>Interview Scheduled</option>
                <option>Interview Completed</option>
                <option>Offer</option>
                <option>Rejected</option>
              </select>
              <button onClick={handleUpdate} disabled={updating} className="px-3 py-2 bg-indigo-600 text-white rounded">{updating? 'Updating…':'Update'}</button>
            </div>
            {message && <div className="mt-2 text-sm text-green-700">{message}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
