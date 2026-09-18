'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface FloatingComment {
  id: string;
  x: number; // Horizontal position % relative to canvas
  y: number; // Vertical position (px) relative to canvas
  text: string;
}

function TeacherViewerContent() {
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
  const [studentEmail, setStudentEmail] = useState('');
  const [grade, setGrade] = useState('');
  const [overallFeedback, setOverallFeedback] = useState('');
  const [comments, setComments] = useState<FloatingComment[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAddingComment, setIsAddingComment] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);

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
        setGrade(data.grade || '');
        setOverallFeedback(data.feedback || '');
        setStudentEmail(data.user_email || 'Student Submission');
        if (Array.isArray(data.floating_comments)) {
          setComments(data.floating_comments);
        }
      }
      setLoading(false);
    }

    fetchAssignment();
  }, [assignmentId]);

  // Click handler to drop a comment anywhere on the page
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isAddingComment || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = e.clientY - rect.top;

    const newComment: FloatingComment = {
      id: Date.now().toString(),
      x: Math.min(Math.max(x, 5), 80), // keep within canvas bounds
      y: Math.max(y, 10),
      text: 'New feedback note...',
    };

    setComments([...comments, newComment]);
    setIsAddingComment(false);
  };

  const updateCommentText = (id: string, text: string) => {
    setComments(comments.map((c) => (c.id === id ? { ...c, text } : c)));
  };

  const deleteComment = (id: string) => {
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
        floating_comments: comments,
        status: 'graded',
        updated_at: new Date().toISOString(),
      })
      .eq('id', assignmentId);

    if (error) {
      alert(`Error returning assignment: ${error.message}`);
    } else {
      alert('Assignment successfully returned to student with markups!');
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
    <div className="min-h-screen bg-slate-100/70 print:bg-white pb-16">
      
      {/* Strict Print Rule for Canvas */}
      <style jsx global>{`
        @media print {
          header, .no-print {
            display: none !important;
          }
          body {
            background: white !important;
          }
          #paper-canvas {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
          .floating-textbox {
            border: 1px solid #cbd5e1 !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      {/* Top Floating Control Bar */}
      <header className="no-print sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-3.5 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-xs">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/teacher/dashboard')}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
          >
            ← Back to Queue
          </button>
          <div>
            <h1 className="text-base font-bold text-slate-900 truncate max-w-xs sm:max-w-md">{title}</h1>
            <p className="text-[11px] text-slate-500">Student: <span className="font-semibold">{studentEmail}</span></p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsAddingComment(!isAddingComment)}
            className={`px-3.5 py-2 text-xs font-semibold rounded-xl border transition ${
              isAddingComment
                ? 'bg-amber-500 text-white border-amber-500 animate-pulse'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200/80'
            }`}
          >
            {isAddingComment ? '📍 Click Paper to Drop Comment' : '💬 Add Floating Comment'}
          </button>

          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition"
          >
            🖨️ Print View
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

      {/* Main Workspace Body */}
      <div className="max-w-5xl mx-auto mt-8 px-4 space-y-6">
        
        {/* Top Evaluation & Score Card */}
        <div className="no-print bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Evaluation & Summary Grade</h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Grade / Score</label>
              <input
                type="text"
                placeholder="e.g. 95%, A"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Overall Summary Comments</label>
              <input
                type="text"
                placeholder="Great job overall! Read inline notes on your essay below..."
                value={overallFeedback}
                onChange={(e) => setOverallFeedback(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Document Canvas (Document Paper with Positioned Floating Comments) */}
        <div
          ref={canvasRef}
          id="paper-canvas"
          onClick={handleCanvasClick}
          className={`relative bg-white border border-slate-200/80 rounded-2xl shadow-md p-8 sm:p-14 min-h-[750px] space-y-6 transition-cursor ${
            isAddingComment ? 'cursor-crosshair ring-2 ring-amber-400/50' : 'cursor-default'
          }`}
        >
          {/* Document Header */}
          <div className="border-b border-slate-100 pb-4">
            <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
          </div>

          {/* Student Document Render */}
          <div
            className="prose prose-slate max-w-none text-slate-800 leading-relaxed text-base"
            dangerouslySetInnerHTML={{
              __html: content || '<p class="text-slate-400 italic">No document content provided.</p>',
            }}
          />

          {/* Positioned Floating Comment Textboxes */}
          {comments.map((comment) => (
            <div
              key={comment.id}
              onClick={(e) => e.stopPropagation()}
              style={{ left: `${comment.x}%`, top: `${comment.y}px` }}
              className="floating-textbox absolute w-64 bg-amber-50/95 backdrop-blur-xs border border-amber-300 rounded-xl p-3 shadow-lg z-20 space-y-2 group transition-all"
            >
              <div className="flex justify-between items-center no-print">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                  📌 Teacher Note
                </span>
                <button
                  onClick={() => deleteComment(comment.id)}
                  className="text-amber-500 hover:text-amber-800 text-xs font-bold px-1"
                >
                  ✕
                </button>
              </div>
              <textarea
                rows={2}
                value={comment.text}
                onChange={(e) => updateCommentText(comment.id, e.target.value)}
                className="w-full bg-transparent border-none p-0 text-xs font-medium text-amber-950 focus:outline-none resize-y"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function TeacherViewerPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 font-medium">Loading viewer...</div>}>
      <TeacherViewerContent />
    </Suspense>
  );
}
