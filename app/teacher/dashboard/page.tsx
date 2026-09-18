'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Submission {
  id: string;
  title: string;
  content: string;
  status: 'draft' | 'submitted' | 'graded';
  submitted_at: string;
  student_id: string;
  grade: string | null;
  feedback: string | null;
  student_email?: string;
}

export default function TeacherDashboard() {
  const router = useRouter();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubmissions = async () => {
    setLoading(true);

    // Fetch submitted or graded assignments
    const { data: assignmentsData, error: assignError } = await supabase
      .from('assignments')
      .select('*')
      .in('status', ['submitted', 'graded'])
      .order('submitted_at', { ascending: false });

    if (assignError) {
      console.error('Error fetching submissions:', assignError);
      setLoading(false);
      return;
    }

    if (assignmentsData) {
      const enrichedSubmissions = assignmentsData.map((doc) => ({
        ...doc,
        student_email: doc.user_email || `${doc.student_id?.slice(0, 8)}...`,
      }));

      setSubmissions(enrichedSubmissions);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  // Direct navigation to the new workspace editor
  const handleOpenAssignment = (id: string) => {
    router.push(`/teacher/assignment/${id}`);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Teacher Evaluation Portal</h1>
            <p className="text-xs text-slate-500 mt-1">Review student projects, attach floating feedback notes, and return graded work</p>
          </div>
          <button
            onClick={fetchSubmissions}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition active:scale-[0.98]"
          >
            🔄 Refresh Submissions
          </button>
        </div>

        {/* Submissions List Container */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium">Loading submissions queue...</div>
        ) : submissions.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white text-slate-400 text-sm">
            No student assignments are currently pending evaluation.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            
            {/* Table Header Row */}
            <div className="hidden sm:grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <div className="col-span-5">Assignment Title</div>
              <div className="col-span-3">Student Email / ID</div>
              <div className="col-span-2">Submitted Date</div>
              <div className="col-span-2 text-right">Action</div>
            </div>

            {/* Rows */}
            <div className="divide-y divide-slate-100">
              {submissions.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => handleOpenAssignment(doc.id)}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 px-6 py-4 items-center hover:bg-blue-50/40 transition cursor-pointer group"
                >
                  <div className="sm:col-span-5">
                    <h2 className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition truncate">
                      {doc.title || 'Untitled Document'}
                    </h2>
                  </div>

                  <div className="sm:col-span-3 text-xs text-slate-700 font-medium truncate">
                    👤 {doc.student_email}
                  </div>

                  <div className="sm:col-span-2 text-xs text-slate-500">
                    {doc.submitted_at ? new Date(doc.submitted_at).toLocaleDateString() : 'N/A'}
                  </div>

                  <div className="sm:col-span-2 flex items-center justify-between sm:justify-end gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                        doc.status === 'graded'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {doc.status === 'graded' ? `Graded: ${doc.grade || '✓'}` : 'Submitted'}
                    </span>
                    <span className="text-xs font-semibold text-purple-600 group-hover:translate-x-0.5 transition-transform">
                      Open Editor →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
