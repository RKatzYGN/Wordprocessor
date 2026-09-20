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

  // Track text selection made by teacher
  const handleTextSelection = () => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (text && text.length > 2) {
      setActiveSelection(text);
    }
  };

  // Attach comment to selected text
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

  // Return to Student with feedback
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
      alert(`Returned to ${studentName} with inline feedback!`);
      router.push('/teacher/dashboard');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 font-medium">
        Loading document workspace...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 pb-16">
      
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-3.5 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-xs">
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
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl shadow-xs transition disabled:opacity-50"
          >
            {saving ? 'Saving...' : '✉️ Return to Student'}
          </button>
        </div>
      </header>

      {/* Main 2-Column Split View: Paper + Sidebar */}
      <div className="max-w-7xl mx-auto mt-8 px-4 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Document Canvas & Summary Grade */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Summary Grade Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Grade & Summary Feedback</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Grade / Score</label>
                <input
                  type="text"
                  placeholder="e.g. A, 94%"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Summary Note</label>
                <input
                  type="text"
                  placeholder="Great essay! Read inline comments on the right margin..."
                  value={overallFeedback}
                  onChange={(e) => setOverallFeedback(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Document Paper */}
          <div
            onMouseUp={handleTextSelection}
            className="bg-white border border-slate-200/80 rounded-2xl shadow-md p-8 sm:p-12 min-h-[700px] space-y-6"
          >
            <div className="border-b border-slate-100 pb-4">
              <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
              <p className="text-xs text-slate-400 mt-1">Select text on paper below to attach an inline comment note</p>
            </div>

            <div
              className="prose prose-slate max-w-none text-slate-800 leading-relaxed text-base select-text"
              dangerouslySetInnerHTML={{
                __html: content || '<p class="text-slate-400 italic">No document content provided.</p>',
              }}
            />
          </div>
        </div>

        {/* Right Column: Margin Comments Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Active Selection Comment Creator Box */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 sticky top-24 z-10">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              💬 Margin Comments ({comments.length})
            </h4>

            {activeSelection ? (
              <form onSubmit={handleAddComment} className="space-y-3 pt-1">
                <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-2.5 text-xs text-amber-900">
                  <span className="font-bold text-[10px] text-amber-700 uppercase block mb-0.5">Selected Text:</span>
                  <p className="italic font-serif">"{activeSelection}"</p>
                </div>

                <textarea
                  rows={3}
                  autoFocus
                  placeholder="Type feedback for this selection..."
                  value={newCommentInput}
                  onChange={(e) => setNewCommentInput(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                    className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg transition"
                  >
                    Attach Comment
                  </button>
                </div>
              </form>
            ) : (
              <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-slate-100">
                💡 Highlight text on the document paper to attach a comment note.
              </p>
            )}
          </div>

          {/* List of Attached Margin Comments */}
          <div className="space-y-3">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className="bg-amber-50/90 border border-amber-200/80 rounded-2xl p-4 shadow-2xs space-y-2 relative group"
              >
                <div className="flex justify-between items-center text-[10px] text-amber-800 font-bold uppercase tracking-wider">
                  <span>📌 Margin Note • {comment.createdAt}</span>
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    className="text-amber-500 hover:text-amber-900 text-xs font-bold px-1"
                  >
                    ✕
                  </button>
                </div>

                <div className="bg-white/80 border border-amber-200/60 rounded-lg p-2 text-xs italic font-serif text-slate-700">
                  "{comment.selectedText}"
                </div>

                <p className="text-xs text-amber-950 font-medium leading-relaxed">
                  {comment.commentText}
                </p>
              </div>
            ))}
          </div>

        </div>
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
