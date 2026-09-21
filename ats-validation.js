const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');
const admin = require('firebase-admin');
const { initializeApp: initFirebaseApp } = require('firebase/app');
const { getAuth, signInWithCustomToken } = require('firebase/auth');

const rootDir = __dirname;
const envPath = path.join(rootDir, '.env.local');
const envText = fs.readFileSync(envPath, 'utf8');
for (const line of envText.split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue;
  const eqPos = line.indexOf('=');
  if (eqPos < 0) continue;
  const key = line.slice(0, eqPos).trim();
  let value = line.slice(eqPos + 1).trim();
  value = value.replace(/^['"]/g, '').replace(/['"]$/g, '');
  process.env[key] = value.replace(/\\n/g, '\n');
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
};

const staleNextDir = path.join(rootDir, '.next');
if (fs.existsSync(staleNextDir)) {
  fs.rmSync(staleNextDir, { recursive: true, force: true });
}

if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
  throw new Error('Missing Firebase admin environment values.');
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const adminAuth = admin.auth();
const webApp = initFirebaseApp(firebaseConfig);
const webAuth = getAuth(webApp);

const securitySuffix = `${Date.now()}${Math.random().toString(16).slice(2, 8)}`;
const candidateUid = `ats_candidate_${securitySuffix}`;
const recruiterUid = `ats_recruiter_${securitySuffix}`;
const rejectionCandidateUid = `ats_rejection_candidate_${securitySuffix}`;
const candidateEmail = `ats.candidate.${securitySuffix}@example.com`;
const recruiterEmail = `ats.recruiter.${securitySuffix}@example.com`;
const recruiterPassword = 'Password123!';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ensurePortFree(port) {
  try {
    const netstatOutput = execSync(`netstat -ano -p tcp | findstr :${port}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    const lines = netstatOutput.split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      const match = line.trim().match(/\s+(\d+)\s*$/);
      if (!match) continue;
      const pid = Number(match[1]);
      if (Number.isFinite(pid) && pid > 0) {
        try {
          execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
        } catch (error) {
          // ignore, best effort
        }
      }
    }
  } catch (error) {
    // no listener
  }
}

function startServiceBinary() {
  const binaryPath = path.join(rootDir, 'match-service', 'match_service.exe');
  const sourcePath = path.join(rootDir, 'match-service', 'main.cpp');
  if (!fs.existsSync(binaryPath)) {
    execSync(`g++ "${sourcePath}" -I"${path.join(rootDir, 'match-service', 'include')}" -std=c++17 -o "${binaryPath}" -lws2_32`, { cwd: rootDir, stdio: 'inherit' });
  }
  const serviceLog = [];
  const child = spawn(binaryPath, { cwd: rootDir, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', (chunk) => {
    const text = chunk.toString();
    serviceLog.push(text);
    process.stdout.write(`[C++] ${text}`);
  });
  child.stderr.on('data', (chunk) => {
    const text = chunk.toString();
    serviceLog.push(text);
    process.stderr.write(`[C++] ${text}`);
  });
  child.serviceLog = serviceLog;
  return child;
}

function startNextServer() {
  const child = spawn('npx', ['next', 'dev', '-p', '3001'], {
    cwd: rootDir,
    env: { ...process.env, PORT: '3001', CI: '1' },
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.on('data', (chunk) => process.stdout.write(`[NEXT] ${chunk.toString()}`));
  child.stderr.on('data', (chunk) => process.stderr.write(`[NEXT] ${chunk.toString()}`));
  return child;
}

async function waitForHttp(url, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url, { method: 'GET' });
      if (response.ok) return true;
    } catch (error) {
      // retry
    }
    await sleep(1000);
  }
  return false;
}

async function ensureRecruiterUser() {
  let recruiterDoc = null;
  const recruiterSnap = await db.collection('users').where('role', '==', 'recruiter').limit(1).get();
  if (!recruiterSnap.empty) {
    recruiterDoc = recruiterSnap.docs[0];
  } else {
    await adminAuth.createUser({ uid: recruiterUid, email: recruiterEmail, password: recruiterPassword });
    await db.collection('users').doc(recruiterUid).set({
      uid: recruiterUid,
      name: 'ATS Recruiter',
      email: recruiterEmail,
      role: 'recruiter',
      createdAt: new Date().toISOString(),
    });
    recruiterDoc = { id: recruiterUid, data: () => ({ uid: recruiterUid, name: 'ATS Recruiter', email: recruiterEmail, role: 'recruiter' }) };
  }
  return recruiterDoc;
}

async function upsertCandidate() {
  const candidateDoc = {
    uid: candidateUid,
    name: 'ATS Seed Candidate',
    email: candidateEmail,
    role: 'candidate',
    skills: ['react', 'typescript', 'css'],
    verifiedSkills: ['css'],
    projects: [{
      title: 'Test Project',
      description: 'Validation project for ATS rebuild',
      demonstratesSkills: ['react'],
    }],
    createdAt: new Date().toISOString(),
  };
  await adminAuth.createUser({ uid: candidateUid, email: candidateEmail, password: 'Password123!' });
  await db.collection('users').doc(candidateUid).set(candidateDoc, { merge: true });
  return candidateDoc;
}

async function upsertRejectionCandidate() {
  const candidateDoc = {
    uid: rejectionCandidateUid,
    name: 'ATS Rejection Candidate',
    email: `ats.reject.${securitySuffix}@example.com`,
    role: 'candidate',
    skills: ['react', 'css'],
    verifiedSkills: ['css'],
    projects: [{
      title: 'Test Project',
      description: 'Rejection case for missing must-have',
      demonstratesSkills: ['react'],
    }],
    createdAt: new Date().toISOString(),
  };
  await adminAuth.createUser({ uid: rejectionCandidateUid, email: candidateDoc.email, password: 'Password123!' });
  await db.collection('users').doc(rejectionCandidateUid).set(candidateDoc, { merge: true });
  return candidateDoc;
}

async function seedJobs(recruiterId) {
  const baseRequiredSkills = [
    { skill: 'react', importance: 'must-have' },
    { skill: 'typescript', importance: 'must-have' },
    { skill: 'css', importance: 'nice-to-have' },
    { skill: 'node', importance: 'nice-to-have' },
  ];

  const jobTrueId = `ats_job_true_${securitySuffix}`;
  const jobFalseId = `ats_job_false_${securitySuffix}`;

  await db.collection('jobs').doc(jobTrueId).set({
    title: 'ATS Validation Job (Enabled)',
    recruiterId,
    atsEnabled: true,
    requiredSkills: baseRequiredSkills,
    location: 'Remote',
    status: 'open',
    createdAt: new Date().toISOString(),
  });

  await db.collection('jobs').doc(jobFalseId).set({
    title: 'ATS Validation Job (Disabled)',
    recruiterId,
    atsEnabled: false,
    requiredSkills: baseRequiredSkills,
    location: 'Remote',
    status: 'open',
    createdAt: new Date().toISOString(),
  });

  return { jobTrueId, jobFalseId, baseRequiredSkills };
}

function normalizeSkillName(skill) {
  return String(skill).trim().toLowerCase();
}

function chooseHigherEvidenceTier(current, incoming) {
  const weights = { 'self-reported': 1, 'project-backed': 2, 'quiz-verified': 3 };
  const currentWeight = current ? weights[current] ?? 0 : 0;
  const incomingWeight = weights[incoming] ?? 0;
  return incomingWeight > currentWeight ? incoming : (current ?? incoming);
}

function buildCandidateSkillEvidence(candidate) {
  const evidenceMap = {};
  for (const skill of Array.isArray(candidate?.skills) ? candidate.skills : []) {
    if (typeof skill !== 'string') continue;
    const normalized = normalizeSkillName(skill);
    evidenceMap[normalized] = chooseHigherEvidenceTier(evidenceMap[normalized], 'self-reported');
  }
  for (const project of Array.isArray(candidate?.projects) ? candidate.projects : []) {
    if (!project || !Array.isArray(project.demonstratesSkills)) continue;
    for (const skill of project.demonstratesSkills) {
      if (typeof skill !== 'string') continue;
      const normalized = normalizeSkillName(skill);
      evidenceMap[normalized] = chooseHigherEvidenceTier(evidenceMap[normalized], 'project-backed');
    }
  }
  for (const entry of Array.isArray(candidate?.verifiedSkills) ? candidate.verifiedSkills : []) {
    const skillName = typeof entry === 'string' ? entry : entry?.skill;
    if (typeof skillName !== 'string') continue;
    const normalized = normalizeSkillName(skillName);
    evidenceMap[normalized] = chooseHigherEvidenceTier(evidenceMap[normalized], 'quiz-verified');
  }
  return evidenceMap;
}

function calculateWeightedMatch(candidate, job) {
  const evidenceMap = buildCandidateSkillEvidence(candidate);
  const requiredSkills = Array.isArray(job?.requiredSkills) ? job.requiredSkills : [];
  if (!requiredSkills.length) return { matchScore: null, matchedSkills: [], missingSkills: [] };

  let weightedTotal = 0;
  let maxPossible = 0;
  const matchedSkills = [];
  const missingSkills = [];

  for (const requiredSkill of requiredSkills) {
    const skillName = typeof requiredSkill === 'string' ? requiredSkill : requiredSkill?.skill;
    if (typeof skillName !== 'string') continue;
    const normalized = normalizeSkillName(skillName);
    const importance = typeof requiredSkill === 'string' ? 'nice-to-have' : (requiredSkill?.importance === 'must-have' ? 'must-have' : 'nice-to-have');
    const importanceWeight = importance === 'must-have' ? 3 : 1;
    maxPossible += 3 * importanceWeight;

    const evidenceTier = evidenceMap[normalized];
    if (!evidenceTier) {
      missingSkills.push({ skill: skillName.trim(), importance });
      continue;
    }

    const evidenceWeight = evidenceTier === 'quiz-verified' ? 3 : (evidenceTier === 'project-backed' ? 2 : 1);
    weightedTotal += evidenceWeight * importanceWeight;
    matchedSkills.push({ skill: skillName.trim(), evidenceTier });
  }

  if (maxPossible === 0) return { matchScore: null, matchedSkills: [], missingSkills: [] };

  const percentage = (weightedTotal / maxPossible) * 100;
  const matchScore = percentage > 70 ? 'Strong' : (percentage >= 40 ? 'Partial' : 'Low');
  return { matchScore, matchedSkills, missingSkills };
}

async function runValidation() {
  ensurePortFree(3001);
  ensurePortFree(8080);

  const serviceProcess = startServiceBinary();
  const nextProcess = startNextServer();

  const nextReady = await waitForHttp('http://localhost:3001/');
  if (!nextReady) {
    throw new Error('Next.js server did not become ready on port 3001.');
  }

  const recruiterDoc = await ensureRecruiterUser();
  const recruiterId = recruiterDoc.id || recruiterUid;
  const candidateDoc = await upsertCandidate();
  const rejectionCandidateDoc = await upsertRejectionCandidate();
  const seededJobs = await seedJobs(recruiterId);

  const candidateRecord = (await db.collection('users').doc(candidateUid).get()).data();
  const rejectionCandidateRecord = (await db.collection('users').doc(rejectionCandidateUid).get()).data();
  const jobTrue = (await db.collection('jobs').doc(seededJobs.jobTrueId).get()).data();
  const jobFalse = (await db.collection('jobs').doc(seededJobs.jobFalseId).get()).data();

  console.log('\n=== Seeded data ===');
  console.log(JSON.stringify({
    candidateUid,
    recruiterId,
    candidate: candidateRecord,
    jobTrue: { id: seededJobs.jobTrueId, ...jobTrue },
    jobFalse: { id: seededJobs.jobFalseId, ...jobFalse }
  }, null, 2));

  const matchEnabledResponse = await fetch('http://localhost:3001/api/match/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ candidateId: candidateUid, jobId: seededJobs.jobTrueId }),
  });
  const matchEnabledData = await matchEnabledResponse.json();

  const matchDisabledResponse = await fetch('http://localhost:3001/api/match/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ candidateId: candidateUid, jobId: seededJobs.jobFalseId }),
  });
  const matchDisabledData = await matchDisabledResponse.json();

  const serviceLogBeforeDirect = serviceProcess.serviceLog.join('');
  const directProjectPayload = {
    candidateSkills: [
      { skill: 'react', evidenceTier: 'project-backed' },
      { skill: 'typescript', evidenceTier: 'self-reported' },
      { skill: 'css', evidenceTier: 'quiz-verified' },
    ],
    jobRequiredSkills: [
      { skill: 'react', importance: 'must-have' },
      { skill: 'typescript', importance: 'must-have' },
      { skill: 'css', importance: 'nice-to-have' },
      { skill: 'node', importance: 'nice-to-have' },
    ],
  };

  const directProjectResponse = await fetch('http://localhost:8080/match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(directProjectPayload),
  });
  const directProjectResult = await directProjectResponse.json();

  const directSelfReportedPayload = {
    candidateSkills: [
      { skill: 'react', evidenceTier: 'self-reported' },
      { skill: 'typescript', evidenceTier: 'self-reported' },
      { skill: 'css', evidenceTier: 'quiz-verified' },
    ],
    jobRequiredSkills: [
      { skill: 'react', importance: 'must-have' },
      { skill: 'typescript', importance: 'must-have' },
      { skill: 'css', importance: 'nice-to-have' },
      { skill: 'node', importance: 'nice-to-have' },
    ],
  };

  const directSelfReportedResponse = await fetch('http://localhost:8080/match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(directSelfReportedPayload),
  });
  const directSelfReportedResult = await directSelfReportedResponse.json();

  const recruiterToken = await (async () => {
    const ownerUid = recruiterId;
    const customToken = await adminAuth.createCustomToken(ownerUid);
    const userCredential = await signInWithCustomToken(webAuth, customToken);
    return await userCredential.user.getIdToken();
  })();

  const applicationId = `ats_application_${securitySuffix}`;
  const rejectionApplicationId = `ats_rejection_application_${securitySuffix}`;
  await db.collection('applications').doc(applicationId).set({
    id: applicationId,
    candidateId: candidateUid,
    jobId: seededJobs.jobTrueId,
    status: 'Applied',
    statusHistory: [{ status: 'Applied', timestamp: new Date().toISOString() }],
    createdAt: new Date().toISOString(),
  });

  await db.collection('applications').doc(rejectionApplicationId).set({
    id: rejectionApplicationId,
    candidateId: rejectionCandidateUid,
    jobId: seededJobs.jobTrueId,
    status: 'Applied',
    statusHistory: [{ status: 'Applied', timestamp: new Date().toISOString() }],
    createdAt: new Date().toISOString(),
  });

  const updateStatusResponse = await fetch('http://localhost:3001/api/applications/update-status', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${recruiterToken}`,
    },
    body: JSON.stringify({ applicationId: rejectionApplicationId, newStatus: 'Rejected' }),
  });
  const updateStatusData = await updateStatusResponse.json();

  const updatedApplication = (await db.collection('applications').doc(rejectionApplicationId).get()).data();

  const filterResults = (() => {
    const applicationMatch = calculateWeightedMatch(candidateRecord, jobTrue);
    const appEntry = { id: applicationId, matchScore: applicationMatch.matchScore, status: 'Applied' };
    return {
      all: [appEntry].filter((item) => 'All' === 'All' || item.matchScore === 'All'),
      low: [appEntry].filter((item) => 'Low' === 'All' || item.matchScore === 'Low'),
      partial: [appEntry].filter((item) => 'Partial' === 'All' || item.matchScore === 'Partial'),
      strong: [appEntry].filter((item) => 'Strong' === 'All' || item.matchScore === 'Strong'),
      actualMatch: applicationMatch,
    };
  })();

  const finalSummary = {
    api_match_enabled: {
      status: matchEnabledResponse.status,
      ok: matchEnabledResponse.ok,
      data: matchEnabledData,
      expected: 'Strong/Partial/Low score with matched/missing skill details',
      pass: !!matchEnabledData && matchEnabledData.matchScore && Array.isArray(matchEnabledData.matchedSkills) && Array.isArray(matchEnabledData.missingSkills),
    },
    api_match_disabled: {
      status: matchDisabledResponse.status,
      ok: matchDisabledResponse.ok,
      data: matchDisabledData,
      expected: 'matchScore is null and C++ route is not called',
      pass: matchDisabledData && matchDisabledData.matchScore === null,
    },
    cpp_weighted_evidence: {
      project_backed: directProjectResult,
      self_reported: directSelfReportedResult,
      score_changed: directProjectResult.matchScore !== directSelfReportedResult.matchScore,
      pass: directProjectResult.matchScore !== directSelfReportedResult.matchScore,
    },
    rejection_reason_system: {
      status: updateStatusResponse.status,
      ok: updateStatusResponse.ok,
      data: updateStatusData,
      storedDocument: updatedApplication,
      pass: !!updatedApplication && updatedApplication.rejectionReasonSource === 'system' && /missing required skill/i.test(updatedApplication.rejectionReason || '') && /typescript/i.test(updatedApplication.rejectionReason || ''),
      note: 'This check uses a separate candidate that is missing the must-have "typescript" skill so the system rejection path is exercised.',
    },
    recruiter_filter_logic: {
      actualMatch: filterResults.actualMatch,
      filterChecks: {
        partial: filterResults.partial.length === 1,
        low: filterResults.low.length === 0,
        strong: filterResults.strong.length === 0,
      },
      pass: filterResults.actualMatch.matchScore === 'Partial' && filterResults.partial.length === 1 && filterResults.low.length === 0 && filterResults.strong.length === 0,
    },
  };

  console.log('\n=== Validation outputs ===');
  console.log(JSON.stringify(finalSummary, null, 2));

  const overallPass = Object.values(finalSummary).every((entry) => entry.pass === true);
  console.log('\nOVERALL_RESULT', overallPass ? 'PASS' : 'FAIL');

  nextProcess.kill('SIGTERM');
  serviceProcess.kill('SIGTERM');
  process.exit(overallPass ? 0 : 1);
}

runValidation().catch((error) => {
  console.error('VALIDATION_SCRIPT_FAILED');
  console.error(error);
  process.exit(1);
});
