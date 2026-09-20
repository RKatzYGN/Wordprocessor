'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Assignment {
  id: string;
  title: string;
  status: 'draft' | 'submitted' | 'graded';
  submitted_at: string;
  student_name?: string;
  user_email?: string;
  grade?: string;
}

export default function StudentDashboard() {
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentName, setStudentName] = useState('');

  const fetchStudentAssignments = async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Student';
      setStudentName(name);

      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching student assignments:', error);
      } else if (data) {
        setAssignments(data);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStudentAssignments();
  }, []);

  const handleCreateNew = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from('assignments')
      .insert({
        title: 'Untitled Document',
        content: '',
        status: 'draft',
        student_id: user.id,
        student_name: studentName,
        user_email: user.email,
      })
      .select()
      .single();

    if (error) {
      alert(`Error creating document: ${error.message}`);
    } else if (data) {
      router.push(`/student/assignment/${data.id}`);
    }
  };

  const unsubmittedList = assignments.filter((a) => a.status === 'draft');
  const submittedList = assignments.filter((a) => a.status === 'submitted');
  const gradedList = assignments.filter((a) => a.status === 'graded');

  const renderCard = (doc: Assignment) => {
    const displayName = doc.student_name || studentName || 'STUDENT';

    return (
      <div
        key={doc.id}
        onClick={() => router.push(`/student/assignment/${doc.id}`)}
        className="bg-white border border-slate-200/90 hover:border-purple-300 hover:shadow-md rounded-2xl p-5 cursor-pointer transition-all space-y-1 group"
      >
        <div className="text-lg font-black text-slate-900 tracking-tight uppercase group-hover:text-purple-600 transition-colors leading-tight">
          {displayName}
        </div>
        <div className="text-sm font-semibold text-slate-700 leading-tight truncate">
          {doc.title || 'Untitled Document'}
        </div>
        <div className="text-xs text-slate-500 font-medium leading-tight pt-1">
          Date Submitted:{' '}
          {doc.submitted_at
            ? new Date(doc.submitted_at).toLocaleDateString() +
              ' ' +
              new Date(doc.submitted_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'Not Submitted'}
        </div>

        {doc.status === 'graded' && doc.grade && (
          <div className="pt-2">
            <span className="inline-block px-2.5 py-0.5 bg-purple-100 text-purple-900 text-[10px] font-bold rounded-md">
              Grade: {doc.grade}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100/80 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Bar */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Student Portal</h1>
            <p className="text-xs text-slate-500 mt-0.5">Welcome back, {studentName}</p>
          </div>
          <button
            onClick={handleCreateNew}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-2xs transition"
          >
            + Create New Assignment
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium">Loading documents...</div>
        ) : (
          /* 3 Columns: Unsubmitted, Submitted, Graded */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            
            {/* Column 1: Unsubmitted */}
            <div className="space-y-4">
              <div className="bg-slate-200/80 border border-slate-300 px-4 py-3 rounded-xl">
                <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  📝 Unsubmitted Drafts ({unsubmittedList.length})
                </h2>
              </div>
              {unsubmittedList.length === 0 ? (
                <div className="bg-white/60 border border-dashed border-slate-300 rounded-2xl p-6 text-center text-slate-400 text-xs">
                  No draft documents.
                </div>
              ) : (
                <div className="space-y-3">{unsubmittedList.map(renderCard)}</div>
              )}
            </div>

            {/* Column 2: Submitted */}
            <div className="space-y-4">
              <div className="bg-amber-100/80 border border-amber-200 px-4 py-3 rounded-xl">
                <h2 className="text-xs font-black text-amber-900 uppercase tracking-wider">
                  🚀 Submitted ({submittedList.length})
                </h2>
              </div>
              {submittedList.length === 0 ? (
                <div className="bg-white/60 border border-dashed border-slate-300 rounded-2xl p-6 text-center text-slate-400 text-xs">
                  No pending submissions.
                </div>
              ) : (
                <div className="space-y-3">{submittedList.map(renderCard)}</div>
              )}
            </div>

            {/* Column 3: Graded */}
            <div className="space-y-4">
              <div className="bg-purple-100/80 border border-purple-200 px-4 py-3 rounded-xl">
                <h2 className="text-xs font-black text-purple-900 uppercase tracking-wider">
                  ✓ Graded ({gradedList.length})
                </h2>
              </div>
              {gradedList.length === 0 ? (
                <div className="bg-white/60 border border-dashed border-slate-300 rounded-2xl p-6 text-center text-slate-400 text-xs">
                  No graded work returned yet.
                </div>
              ) : (
                <div className="space-y-3">{gradedList.map(renderCard)}</div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
