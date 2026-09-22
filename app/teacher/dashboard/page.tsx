'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Submission {
  id: string;
  title: string;
  status: 'draft' | 'submitted' | 'graded';
  submitted_at: string;
  student_name?: string;
  user_email?: string;
  grade?: string;
}

export default function TeacherDashboard() {
  const router = useRouter();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubmissions = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .in('status', ['submitted', 'graded'])
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('Error fetching submissions:', error);
    } else if (data) {
      setSubmissions(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const ungradedList = submissions.filter((s) => s.status === 'submitted');
  const gradedList = submissions.filter((s) => s.status === 'graded');

  const renderCard = (doc: Submission) => {
    const studentDisplayName =
      doc.student_name || doc.user_email || 'UNKNOWN STUDENT';

    return (
      <div
        key={doc.id}
        onClick={() => router.push(`/teacher/assignment/${doc.id}`)}
        className="group relative bg-white border border-slate-200/90 hover:border-red-300 hover:shadow-md rounded-2xl p-5 cursor-pointer transition-all space-y-1.5"
      >
        <div className="text-base font-black text-slate-900 tracking-tight uppercase group-hover:text-red-600 transition-colors leading-tight">
          {studentDisplayName}
        </div>
        <div className="text-sm font-semibold text-slate-700 leading-tight truncate">
          {doc.title || 'Untitled Assignment'}
        </div>
        <div className="text-xs text-slate-500 font-medium leading-tight">
          Date Submitted:{' '}
          {doc.submitted_at
            ? new Date(doc.submitted_at).toLocaleDateString() +
              ' ' +
              new Date(doc.submitted_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'N/A'}
        </div>

        {doc.status === 'graded' && doc.grade && (
          <div className="pt-1">
            <span className="inline-block px-2.5 py-0.5 bg-red-100 text-red-800 text-[10px] font-bold rounded-md">
              Score: {doc.grade}
            </span>
          </div>
        )}

        {/* Separator Line */}
        <div className="pt-3">
          <hr className="border-t border-slate-100 group-hover:border-red-100 transition-colors" />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100/80 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Teacher Evaluation Workspace</h1>
            <p className="text-xs text-slate-500 mt-0.5">Select a student card to open evaluation mode</p>
          </div>
          <button
            onClick={fetchSubmissions}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
          >
            🔄 Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium">Loading submissions...</div>
        ) : (
          /* 2 Columns: Ungraded vs Graded */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            
            {/* Column 1: Ungraded */}
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-red-100/70 border border-red-200/80 px-4 py-3 rounded-xl">
                <h2 className="text-xs font-black text-red-900 uppercase tracking-wider">
                  ⏳ Ungraded Submissions ({ungradedList.length})
                </h2>
              </div>

              {ungradedList.length === 0 ? (
                <div className="bg-white/60 border border-dashed border-slate-300 rounded-2xl p-8 text-center text-slate-400 text-xs">
                  No pending ungraded submissions.
                </div>
              ) : (
                <div className="space-y-4">{ungradedList.map(renderCard)}</div>
              )}
            </div>

            {/* Column 2: Graded */}
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-emerald-100/70 border border-emerald-200/80 px-4 py-3 rounded-xl">
                <h2 className="text-xs font-black text-emerald-900 uppercase tracking-wider">
                  ✓ Graded & Returned ({gradedList.length})
                </h2>
              </div>

              {gradedList.length === 0 ? (
                <div className="bg-white/60 border border-dashed border-slate-300 rounded-2xl p-8 text-center text-slate-400 text-xs">
                  No graded assignments yet.
                </div>
              ) : (
                <div className="space-y-4">{gradedList.map(renderCard)}</div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
