"use client";

import React from "react";

const STATUSES = [
  "Applied",
  "Under Review",
  "Shortlisted",
  "Interview Scheduled",
  "Interview Completed",
  "Offer",
  "Rejected",
];

export default function ApplicationProgress({ currentStatus }: { currentStatus: string }) {
  const currentIndex = Math.max(0, STATUSES.indexOf(currentStatus));

  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
        {STATUSES.map((s, i) => (
          <div key={s} className="w-1/7 text-center">
            <div className={`mx-auto w-8 h-8 rounded-full flex items-center justify-center ${i <= currentIndex ? 'bg-indigo-600 text-white' : 'bg-white border'}`}>{i+1}</div>
            <div className="mt-2">{s}</div>
          </div>
        ))}
      </div>

      <div className="relative h-2 bg-gray-200 rounded overflow-hidden">
        <div className="absolute left-0 top-0 h-2 bg-indigo-600" style={{ width: `${(currentIndex / (STATUSES.length - 1)) * 100}%` }} />
      </div>
    </div>
  );
}
