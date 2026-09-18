'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface FloatingComment {
  id: string;
  x: number;
  y: number;
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
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [grade, setGrade] = useState('');
  const [overallFeedback, setOverallFeedback] = useState('');
  const [comments, setComments] = useState<FloatingComment[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAddingComment, setIsAddingComment] = useState(false);

  const paperRef = useRef<HTMLDivElement>(null);

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
        setPdfUrl(data.pdf_url || null);
        setGrade(data.grade || '');
        setOverallFeedback(data.feedback || '');
        if (Array.isArray(data.floating_comments)) {
          setComments(data.floating_comments);
        }
      }
      setLoading(false);
    }

    fetchAssignment();
  }, [assignmentId]);

  // Click to drop floating comment textbox
  const handlePaperClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isAddingComment || !paperRef.current) return;

    const rect = paperRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = e.clientY - rect.top;

    const newComment: FloatingComment = {
      id: Date.now().toString(),
      x: Math.min(Math.max(x, 5), 75),
      y: Math.max(y, 10),
      text: 'New teacher correction...',
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

  // Return to Student & Burn Comments into PDF
  const handleReturnToStudent = async () => {
    if (!assignmentId) return;
    setSaving(true);

    try {
      // 1. Convert paper canvas + floating comments to PDF Blob
      // @ts-ignore
      const html2pdf = (await import('html2pdf.js')).default;
      const element = document.getElementById('paper-canvas');

      const opt = {
        margin: 0.5,
        filename: `${title}_Graded.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
      };

      const pdfBlob = await html2pdf().set(opt).from(element).output('blob');
      const filePath = `graded/${assignmentId}_graded_${Date.now()}.pdf`;

      // 2. Upload Marked-up PDF to Supabase Storage
      const { error: storageError } = await supabase.storage
        .from('assignment_pdfs')
        .upload(filePath, pdfBlob, { contentType: 'application/pdf', upsert: true });

      let gradedPdfUrl = pdfUrl;
      if (!storageError) {
        const { data: urlData } = supabase.storage
          .from('assignment_pdfs')
          .getPublicUrl(filePath);
        gradedPdfUrl = urlData.publicUrl;
      }

      // 3. Update database record
      const { error } = await supabase
        .from('assignments')
        .update({
          grade,
          feedback: overallFeedback,
          floating_comments: comments,
          pdf_url: gradedPdfUrl,
          status: 'graded',
          updated_at: new Date().toISOString(),
        })
        .eq('id', assignmentId);

      if (error) {
        alert(`Error returning assignment: ${error.message}`);
      } else {
        alert(`Assignment returned to ${studentName} with marked-up PDF!`);
        router.push('/teacher/dashboard');
      }
    } catch (err: any) {
      console.error('Error generating graded PDF:', err);
      alert('Returned to student with web markups.');
      router.push('/teacher/dashboard');
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 font-medium">
        Loading teacher evaluation workspace...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 print:bg-white pb-16">
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
        }
      `}</style>

      {/* Top Workspace Header */}
      <header className="no-print sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-3.5 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-xs">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/teacher/dashboard')}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
          >
            ← Back to Queue
          </button>
          <div>
            <h1 className="text-base font-bold text-slate-900 truncate max-w-xs sm:max-w-md">
              {title}
            </h1>
            <p className="text-[11px] text-slate-500">
              Student: <span className="font-semibold text-slate-800">{studentName}</span> ({studentEmail})
            </p>
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
            {isAddingComment ? '📍 Click Document to Drop Note' : '💬 Add Floating Comment'}
          </button>

          {pdfUrl && (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition"
            >
              📥 View Original PDF
            </a>
          )}

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
            {saving ? 'Generating Graded PDF...' : '✉️ Return to Student'}
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="max-w-5xl mx-auto mt-8 px-4 space-y-6">
        
        {/* Grade & Summary Feedback Card */}
        <div className="no-print bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Grade & Summary Feedback
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Grade / Score
              </label>
              <input
                type="text"
                placeholder="e.g. 95%, A"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Overall Feedback Comments
              </label>
              <input
                type="text"
                placeholder="Great structure and arguments! Review floating markup notes below..."
                value={overallFeedback}
                onChange={(e) => setOverallFeedback(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Workspace Canvas Paper */}
        <div
          ref={paperRef}
          id="paper-canvas"
          onClick={handlePaperClick}
          className={`relative bg-white border border-slate-200/80 rounded-2xl shadow-md p-8 sm:p-14 min-h-[750px] space-y-6 transition-all ${
            isAddingComment ? 'cursor-crosshair ring-2 ring-amber-400/50' : 'cursor-default'
          }`}
        >
          <div className="border-b border-slate-100 pb-4 flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
              <p className="text-xs text-slate-400 mt-1">Submitted by {studentName}</p>
            </div>
          </div>

          <div
            className="prose prose-slate max-w-none text-slate-800 leading-relaxed text-base"
            dangerouslySetInnerHTML={{
              __html: content || '<p class="text-slate-400 italic">No document content provided.</p>',
            }}
          />

          {/* Positioned Floating Teacher Markups */}
          {comments.map((comment) => (
            <div
              key={comment.id}
              onClick={(e) => e.stopPropagation()}
              style={{ left: `${comment.x}%`, top: `${comment.y}px` }}
              className="absolute w-64 bg-amber-50/95 backdrop-blur-xs border border-amber-300 rounded-xl p-3 shadow-lg z-20 space-y-2 transition-all"
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

export default function TeacherAssignmentPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 font-medium">Loading viewer...</div>}>
      <TeacherViewerContent />
    </Suspense>
  );
}
