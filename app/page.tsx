export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-5xl px-6 py-20">
        <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900">
            Hireflow
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            Job recruitment portal scaffold with Firebase integration and Tailwind UI.
          </p>
          <div className="mt-8 space-y-3 text-slate-700">
            <p>• Next.js App Router configured</p>
            <p>• Tailwind CSS installed</p>
            <p>• Firebase SDK placeholder connection ready</p>
            <p>• API route folders created for auth, applications, match, quiz, interview</p>
          </div>
        </div>
      </div>
    </main>
  );
}
