'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface InlineComment {
  id: string;
  selectedText: string;
  commentText: string;
  createdAt: string;
}

function TeacherWorkspaceContent() {
  const params = useParams();
  const router = useRouter();

  const assignmentId =
    typeof params?.id === 'string'
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : '';

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [grade, setGrade] = useState('');
  const [overallFeedback, setOverallFeedback] = useState('');

  const [comments, setComments] = useState<InlineComment[]>([]);
  const [activeSelection, setActiveSelection] = useState<string>('');
  const [newCommentInput, setNewCommentInput] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!assignmentId) return;

    async function fetchAssignment() {
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('id', assignmentId)
        .single();

      if (error) {
        console.error('Fetch error:', error);
      } else if (data) {
        setTitle(data.title || 'Untitled Assignment');
        setContent(data.content || '');
        setStudentName(data.student_name || 'Student Submission');
        setStudentEmail(data.user_email || 'student@school.edu');
        setGrade(data.grade || '');
        setOverallFeedback(data.feedback || '');
        if (Array.isArray(data.inline_comments)) {
          setComments(data.inline_comments);
        }
      }
      setLoading(false);
    }

    fetchAssignment();
  }, [assignmentId]);

  const getRenderedContent = () => {
    if (!content) return '<p class="text-slate-400 italic">No document content provided.</p>';
    let highlightedHTML = content;

    comments.forEach((comment) => {
      if (comment.selectedText && comment.selectedText.trim().length > 0) {
        const escapedSelection = comment.selectedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedSelection})`, 'gi');
        highlightedHTML = highlightedHTML.replace(
          regex,
          `<mark class="bg-red-100 text-red-950 underline decoration-red-400 decoration-wavy underline-offset-4 px-1 rounded-sm">$1</mark>`
        );
      }
    });

    return highlightedHTML;
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (text && text.length > 2) {
      setActiveSelection(text);
    }
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSelection || !newCommentInput.trim()) return;

    const comment: InlineComment = {
      id: Date.now().toString(),
      selectedText: activeSelection,
      commentText: newCommentInput.trim(),
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setComments([...comments, comment]);
    setNewCommentInput('');
    setActiveSelection('');
    window.getSelection()?.removeAllRanges();
  };

  const handleDeleteComment = (id: string) => {
    setComments(comments.filter((c) => c.id !== id));
  };

  const handleReturnToStudent = async () => {
    if (!assignmentId) return;
    setSaving(true);

    const { error } = await supabase
      .from('assignments')
      .update({
        grade,
        feedback: overallFeedback,
        inline_comments: comments,
        status: 'graded',
        updated_at: new Date().toISOString(),
      })
      .eq('id', assignmentId);

    if (error) {
      alert(`Error returning assignment: ${error.message}`);
    } else {
      alert(`Returned to ${studentName} with markups!`);
      router.push('/teacher/dashboard');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center text-slate-500 font-medium">
        Loading document workspace...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/90 pb-20">
      
      {/* Top Fixed Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-6 py-3.5 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-xs">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/teacher/dashboard')}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
          >
            ← Back to Queue
          </button>
          <div>
            <h1 className="text-base font-bold text-slate-900 truncate max-w-xs sm:max-w-md">{title}</h1>
            <p className="text-[11px] text-slate-500">
              Student: <span className="font-semibold text-slate-800">{studentName}</span> ({studentEmail})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition"
          >
            🖨️ Print
          </button>

          <button
            onClick={handleReturnToStudent}
            disabled={saving}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl shadow-xs transition disabled:opacity-50"
          >
            {saving ? 'Saving...' : '✉️ Return to Student'}
          </button>
        </div>
      </header>

      {/* Main Layout Container */}
      <div className="max-w-[1180px] mx-auto mt-8 px-4 flex flex-col lg:flex-row items-start justify-center gap-8">
        
        {/* Document Paper Container */}
        <div className="w-full max-w-[720px] shrink-0 space-y-6">
          
          {/* Red Evaluation Header */}
          <div className="bg-red-50/90 border-2 border-red-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-red-200 pb-3">
              <h3 className="text-xs font-bold text-red-900 uppercase tracking-wider">
                📝 Teacher Evaluation & Score
              </h3>
              {grade && (
                <span className="px-3.5 py-1 bg-red-600 text-white font-extrabold text-sm rounded-xl shadow-xs">
                  Grade: {grade}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="sm:col-span-1">
                <label className="block text-xs font-bold text-red-900 mb-1">Grade Score</label>
                <input
                  type="text"
                  placeholder="e.g. A, 92%"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full border border-red-300 rounded-xl p-2.5 text-sm font-bold text-red-950 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-red-900 mb-1">Overall Comments</label>
                <input
                  type="text"
                  placeholder="Write summary notes here..."
                  value={overallFeedback}
                  onChange={(e) => setOverallFeedback(e.target.value)}
                  className="w-full border border-red-300 rounded-xl p-2.5 text-sm font-medium text-red-950 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                />
              </div>
            </div>
          </div>

          <hr className="border-t-2 border-dashed border-red-200/80 my-4" />

          {/* Centered Document Paper Sheet */}
          <div
            onMouseUp={handleTextSelection}
            className="bg-white border border-slate-200/90 rounded-2xl shadow-sm p-8 sm:p-14 min-h-[820px] space-y-6"
          >
            <div className="border-b border-slate-100 pb-4">
              <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
              <p className="text-xs text-red-600 font-medium mt-1">
                💡 Highlight text on the paper to attach a red side note.
              </p>
            </div>

            <div
              className="prose prose-slate max-w-none text-slate-800 leading-relaxed text-base select-text"
              dangerouslySetInnerHTML={{ __html: getRenderedContent() }}
            />
          </div>
        </div>

        {/* Right Side Margin Notes Sidebar */}
        <aside className="w-full lg:w-[320px] shrink-0 sticky top-20 space-y-4">
          
          <div className="bg-white p-5 rounded-2xl border border-red-200 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-red-900 uppercase tracking-wider flex items-center gap-2">
              📌 Side Margin Notes ({comments.length})
            </h4>

            {activeSelection ? (
              <form onSubmit={handleAddComment} className="space-y-3 pt-1">
                <div className="bg-red-50 border border-red-200 rounded-xl p-2.5 text-xs text-red-950">
                  <span className="font-bold text-[10px] text-red-700 uppercase block mb-0.5">Selected Passage:</span>
                  <p className="italic font-serif font-medium">"{activeSelection}"</p>
                </div>

                <textarea
                  rows={3}
                  autoFocus
                  placeholder="Type red correction or feedback..."
                  value={newCommentInput}
                  onChange={(e) => setNewCommentInput(e.target.value)}
                  className="w-full border border-red-300 rounded-xl p-2.5 text-xs text-red-950 focus:outline-none focus:ring-2 focus:ring-red-500 bg-red-50/30 font-medium"
                />

                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveSelection('')}
                    className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition"
                  >
                    Attach Note
                  </button>
                </div>
              </form>
            ) : (
              <p className="text-xs text-red-800 italic bg-red-50/60 p-3 rounded-xl border border-red-100">
                Highlight text on the paper to attach a red side margin note.
              </p>
            )}
          </div>

          <div className="space-y-3">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className="bg-red-50 border border-red-200/80 rounded-2xl p-4 shadow-2xs space-y-2"
              >
                <div className="flex justify-between items-center text-[10px] text-red-800 font-extrabold uppercase tracking-wider">
                  <span>📌 Note • {comment.createdAt}</span>
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    className="text-red-400 hover:text-red-800 text-xs font-bold px-1"
                  >
                    ✕
                  </button>
                </div>

                <div className="bg-white/90 border border-red-200 rounded-lg p-2 text-xs italic font-serif text-red-950 font-medium">
                  "{comment.selectedText}"
                </div>

                <p className="text-xs text-red-950 font-semibold leading-relaxed">
                  {comment.commentText}
                </p>
              </div>
            ))}
          </div>

        </aside>
      </div>
    </div>
  );
}

export default function TeacherWorkspacePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 font-medium">Loading workspace...</div>}>
      <TeacherWorkspaceContent />
    </Suspense>
  );
}
