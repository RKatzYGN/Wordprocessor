'use client';

import { useState, useEffect } from 'react';
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
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<Submission | null>(null);

  const [gradeInput, setGradeInput] = useState('');
  const [feedbackInput, setFeedbackInput] = useState('');
  const [savingGrade, setSavingGrade] = useState(false);

  const fetchSubmissions = async () => {
    setLoading(true);

    // 1. Fetch submitted/graded assignments
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
      // 2. Fetch allowed_users to map student emails/names to student_id
      const { data: usersData } = await supabase
        .from('allowed_users')
        .select('email, role');

      // Map submissions with student email identifiers
      const enrichedSubmissions = assignmentsData.map((doc) => {
        return {
          ...doc,
          student_email: doc.user_email || doc.student_id?.slice(0, 8) + '...',
        };
      });

      setSubmissions(enrichedSubmissions);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const handleOpenReview = (doc: Submission) => {
    setSelectedDoc(doc);
    setGradeInput(doc.grade || '');
    setFeedbackInput(doc.feedback || '');
  };

  const handleReturnToStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) return;

    setSavingGrade(true);

    const { error } = await supabase
      .from('assignments')
      .update({
        grade: gradeInput,
        feedback: feedbackInput,
        status: 'graded',
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedDoc.id);

    if (error) {
      alert(`Error returning assignment: ${error.message}`);
    } else {
      alert('Assignment returned to student with feedback!');
      setSelectedDoc(null);
      fetchSubmissions();
    }
    setSavingGrade(false);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-10">
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-viewer, #print-viewer * {
            visibility: visible;
          }
          #print-viewer {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>

      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Teacher Evaluation Portal</h1>
            <p className="text-xs text-slate-500 mt-1">Review student projects, attach feedback notes, and return graded work</p>
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
              <div className="col-span-2 text-right">Status / Action</div>
            </div>

            {/* Submissions Rows */}
            <div className="divide-y divide-slate-100">
              {submissions.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => handleOpenReview(doc)}
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
                    <span className="text-xs font-semibold text-slate-400 group-hover:text-blue-600">→</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Review & Feedback Modal */}
        {selectedDoc && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-4xl w-full max-h-[92vh] overflow-y-auto space-y-6 shadow-2xl border border-slate-100">
              
              <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{selectedDoc.title}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Student: <span className="font-semibold text-slate-800">{selectedDoc.student_email}</span> • Submitted on{' '}
                    {new Date(selectedDoc.submitted_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition shadow-xs"
                  >
                    🖨️ Print Project
                  </button>
                  <button
                    onClick={() => setSelectedDoc(null)}
                    className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1.5"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Printable Document Reader View */}
              <div id="print-viewer" className="border border-slate-200/80 rounded-2xl p-8 bg-white shadow-xs min-h-[350px] space-y-4">
                <h1 className="text-3xl font-bold text-slate-900 border-b border-slate-100 pb-3">
                  {selectedDoc.title}
                </h1>
                <div
                  className="prose prose-slate max-w-none text-slate-800 leading-relaxed text-base"
                  dangerouslySetInnerHTML={{
                    __html: selectedDoc.content || '<p class="text-slate-400 italic">No document content.</p>',
                  }}
                />
              </div>

              {/* Teacher Form */}
              <form onSubmit={handleReturnToStudent} className="space-y-4 border-t border-slate-100 pt-6">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Teacher Markup & Feedback Controls
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Grade / Score</label>
                    <input
                      type="text"
                      placeholder="e.g. A+, 94/100"
                      value={gradeInput}
                      onChange={(e) => setGradeInput(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Text-Box Comments & Corrections
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Add markup notes, structural critique, or positive feedback here..."
                      value={feedbackInput}
                      onChange={(e) => setFeedbackInput(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedDoc(null)}
                    className="px-4 py-2.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200 transition"
                  >
                    Close Viewer
                  </button>
                  <button
                    type="submit"
                    disabled={savingGrade}
                    className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl transition shadow-xs disabled:opacity-50 active:scale-[0.98]"
                  >
                    {savingGrade ? 'Processing...' : '✉️ Return to Student with Markups'}
                  </button>
                </div>
              </form>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
