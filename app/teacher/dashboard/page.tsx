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

    // Fetch all submitted or graded assignments
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

  const handleOpenReview = (doc: Submission) => {
    setSelectedDoc(doc);
    setGradeInput(doc.grade || '');
    setFeedbackInput(doc.feedback || '');
  };

  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) return;

    setSavingGrade(true);

    const { error } = await supabase
      .from('assignments')
      .update({
        grade: gradeInput,
        feedback: feedbackInput,
        status: 'graded',
      })
      .eq('id', selectedDoc.id);

    if (error) {
      alert(`Error saving grade: ${error.message}`);
    } else {
      alert('Grade and feedback saved!');
      setSelectedDoc(null);
      fetchSubmissions();
    }
    setSavingGrade(false);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Teacher Review Portal</h1>
            <p className="text-sm text-slate-500 mt-0.5">Review, grade, and provide feedback on student submissions</p>
          </div>
          <button
            onClick={fetchSubmissions}
            className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200 transition"
          >
            🔄 Refresh List
          </button>
        </div>

        {/* Submissions List */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium">Loading student submissions...</div>
        ) : submissions.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white text-slate-400">
            No student assignments have been submitted yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {submissions.map((doc) => (
              <div
                key={doc.id}
                onClick={() => handleOpenReview(doc)}
                className="p-6 border border-slate-200/80 rounded-2xl shadow-xs hover:shadow-md transition-all cursor-pointer bg-white flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <span
                      className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                        doc.status === 'graded'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {doc.status}
                    </span>
                    {doc.grade && (
                      <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                        Grade: {doc.grade}
                      </span>
                    )}
                  </div>

                  <h2 className="text-base font-semibold text-slate-900 truncate">
                    {doc.title || 'Untitled Document'}
                  </h2>

                  <p className="text-xs text-slate-400">
                    Submitted: {doc.submitted_at ? new Date(doc.submitted_at).toLocaleDateString() : 'N/A'}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center text-xs">
                  <span className="text-slate-400">ID: {doc.student_id.slice(0, 8)}...</span>
                  <span className="font-semibold text-purple-600">Review & Grade →</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Grading & Feedback Modal */}
        {selectedDoc && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto space-y-6 shadow-xl border border-slate-100">
              <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{selectedDoc.title}</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Submitted on {new Date(selectedDoc.submitted_at).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDoc(null)}
                  className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1"
                >
                  ✕
                </button>
              </div>

              {/* Document Preview Box */}
              <div className="border border-slate-200 rounded-xl p-5 bg-slate-50 min-h-[200px] max-h-[300px] overflow-y-auto prose prose-sm max-w-none">
                <div dangerouslySetInnerHTML={{ __html: selectedDoc.content || '<p class="text-slate-400 italic">No content in document.</p>' }} />
              </div>

              {/* Grading Form */}
              <form onSubmit={handleSaveGrade} className="space-y-4 border-t border-slate-100 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Grade / Score</label>
                    <input
                      type="text"
                      placeholder="e.g. A, 95%, 10/10"
                      value={gradeInput}
                      onChange={(e) => setGradeInput(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Feedback for Student</label>
                    <textarea
                      rows={3}
                      placeholder="Great arguments! Make sure to expand on your conclusion..."
                      value={feedbackInput}
                      onChange={(e) => setFeedbackInput(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedDoc(null)}
                    className="px-4 py-2.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingGrade}
                    className="px-5 py-2.5 bg-purple-600 text-white text-xs font-semibold rounded-xl hover:bg-purple-700 disabled:opacity-50 shadow-xs"
                  >
                    {savingGrade ? 'Saving Grade...' : 'Save Grade & Feedback'}
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
