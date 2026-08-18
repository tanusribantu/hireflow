import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl font-bold">Hireflow</div>
            <div className="text-sm text-gray-500">Recruitment made simple</div>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/auth/signup" className="text-sm text-gray-700 hover:text-gray-900">Sign Up</Link>
            <Link href="/auth/signin" className="text-sm text-gray-700 hover:text-gray-900">Login</Link>
            <Link href="/jobs" className="text-sm text-gray-700 hover:text-gray-900">Browse Jobs</Link>
            <Link href="/dashboard" className="text-sm text-gray-700 hover:text-gray-900">Dashboard</Link>
            <Link href="/profile" className="text-sm text-gray-700 hover:text-gray-900">Profile</Link>
            <Link href="/jobs/new" className="ml-2 inline-block px-3 py-2 bg-indigo-600 text-white rounded">Post a job</Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <h1 className="text-4xl font-extrabold leading-tight">Hire better, faster.</h1>
            <p className="mt-4 text-lg text-gray-600">Find the right candidates or post openings quickly. Built with Next.js, Firebase, and Tailwind for a polished product experience.</p>

            <div className="mt-8 flex gap-3">
              <Link href="/jobs" className="px-5 py-3 bg-indigo-600 text-white rounded-md">Browse jobs</Link>
              <Link href="/auth/signup" className="px-5 py-3 border border-gray-200 rounded-md">Create account</Link>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4 text-sm text-gray-700">
              <div className="bg-white p-4 rounded shadow-sm">
                <strong>For Recruiters</strong>
                <p className="mt-2 text-gray-500">Post jobs, review applicants, and move candidates through your hiring pipeline.</p>
              </div>
              <div className="bg-white p-4 rounded shadow-sm">
                <strong>For Candidates</strong>
                <p className="mt-2 text-gray-500">Create your profile, upload a resume, and apply to jobs with a single click.</p>
              </div>
            </div>
          </div>

          <div className="hidden md:block">
            <div className="rounded-lg border bg-white p-6 shadow">
              <h3 className="text-lg font-medium">Quick links</h3>
              <ul className="mt-4 space-y-2 text-sm">
                <li><Link href="/auth/signin" className="text-indigo-600">Sign in</Link> to manage your dashboard</li>
                <li><Link href="/profile" className="text-indigo-600">Edit profile</Link> to add skills and resume</li>
                <li><Link href="/jobs/new" className="text-indigo-600">Post a job</Link> (recruiter)</li>
                <li><Link href="/jobs" className="text-indigo-600">Browse jobs</Link> and apply</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t bg-white">
        <div className="mx-auto max-w-6xl px-6 py-6 text-sm text-gray-500 flex items-center justify-between">
          <div>© {new Date().getFullYear()} Hireflow</div>
          <div className="flex gap-4">
            <Link href="/" className="hover:text-gray-900">Home</Link>
            <a href="#" className="hover:text-gray-900">Privacy</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
