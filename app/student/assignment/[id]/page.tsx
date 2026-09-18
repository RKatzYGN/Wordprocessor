'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';

// Load Editor strictly on client side
const Editor = dynamic(() => import('@/components/Editor'), {
  ssr: false,
  loading: () => (
    <div className="border border-slate-200 rounded-2xl p-8 min-h-[500px] bg-slate-50 flex items-center justify-center text-slate-400 font-medium">
      Loading document canvas...
    </div>
  ),
});

interface FloatingComment {
  id: string;
  x: number;
  y: number;
  text: string;
}

function AssignmentPageContent() {
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
  const [status, setStatus] = useState<'draft' | 'submitted' | 'graded'>('draft');
  const [grade, setGrade] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [floatingComments, setFloatingComments] = useState<FloatingComment[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
        setTitle(data.title || 'Untitled Document');
        setContent(data.content || '');
        setStatus(data.status || 'draft');
        setGrade(data.grade || null);
        setFeedback(data.feedback || null);
        if (Array.isArray(data.floating_comments)) {
          setFloatingComments(data.floating_comments);
        }
      }
      setLoading(false);
    }

    fetchAssignment();
  }, [assignmentId]);

  // Save Draft to Supabase
  const handleSave = async () => {
    if (!assignmentId) return;
    setSaving(true);

    const { error } = await supabase
      .from('assignments')
      .update({
        title,
        content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', assignmentId);

    if (error) {
      alert(`Save error: ${error.message}`);
    } else {
      alert('Saved successfully!');
    }

    setSaving(false);
  };

  // Submit Assignment
  const handleSubmitAssignment = async () => {
    if (!assignmentId) return;

    const confirmSubmit = window.confirm(
      'Are you sure you want to submit this assignment to your teacher? You will not be able to edit it once submitted.'
    );
    if (!confirmSubmit) return;

    setSubmitting(true);

    const { error } = await supabase
      .from('assignments')
      .update({
        title,
        content,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', assignmentId);

    if (error) {
      alert(`Submission error: ${error.message}`);
    } else {
      setStatus('submitted');
      alert('Assignment submitted to teacher successfully!');
    }

    setSubmitting(false);
  };

  // USB File Save
  const handleSaveToUSB = async () => {
    const filename = `${title || 'Untitled Document'}.html`;
    if ('showSaveFilePicker' in window) {
      try {
        // @ts-ignore
        const handle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{ description: 'HTML Document', accept: { 'text/html': ['.html'] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
        alert('Saved to USB drive!');
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }
    const blob = new Blob([content], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // USB File Open
  const handleOpenFromUSB = async (e?: React.ChangeEvent<HTMLInputElement>) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setTitle(file.name.replace(/\.[^/.]+$/, ''));
        setContent(text);
      }
    };
    reader.readAsText(file);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50 p-8 flex items-center justify-center text-slate-500 font-medium">
        Loading document data...
      </div>
    );
  }

  const isReadOnly = status === 'submitted' || status === 'graded';

  return (
    <div className="min-h-screen bg-slate-50/50 print:bg-white print:min-h-0 py-8 px-4 sm:px-6 lg:px-8">
      <style jsx global>{`
        @media print {
          header,
          .no-print,
          .print\\:hidden {
            display: none !important;
          }
          body {
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          main {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .floating-textbox {
            border: 1px solid #cbd5e1 !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      <div className="max-w-5xl mx-auto space-y-6 print:space-y-4 print:p-0 print:m-0">
        
        {/* Header Action Bar */}
        <header className="no-print print:hidden flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <button
            onClick={() => router.push('/student/dashboard')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold rounded-xl transition-all"
          >
            ← Dashboard
          </button>

          <div className="flex flex-wrap items-center gap-2">
            {!isReadOnly && (
              <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 text-xs font-semibold rounded-xl cursor-pointer">
                📂 USB Open
                <input type="file" accept=".html,.htm,.txt" onChange={handleOpenFromUSB} className="hidden" />
              </label>
            )}

            <button
              onClick={handleSaveToUSB}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl"
            >
              💾 USB Save
            </button>

            <button
              onClick={() => window.print()}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl"
            >
              🖨️ Print
            </button>

            {!isReadOnly && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl disabled:opacity-50"
              >
                {saving ? 'Saving...' : '☁️ Save Draft'}
              </button>
            )}

            <button
              onClick={handleSubmitAssignment}
              disabled={submitting || isReadOnly}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition ${
                isReadOnly
                  ? 'bg-purple-100 text-purple-700 cursor-default'
                  : 'bg-purple-600 hover:bg-purple-700 text-white shadow-xs'
              }`}
            >
              {status === 'submitted'
                ? '✓ Submitted'
                : status === 'graded'
                ? '✓ Graded'
                : submitting
                ? 'Submitting...'
                : '🚀 Submit Assignment'}
            </button>
          </div>
        </header>

        {/* Teacher Evaluation & Overall Feedback Banner */}
        {(grade || feedback) && (
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5 space-y-1">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-purple-900">Teacher Review & Feedback</h3>
              {grade && (
                <span className="px-3 py-1 bg-purple-600 text-white font-bold text-xs rounded-lg">
                  Grade: {grade}
                </span>
              )}
            </div>
            {feedback && <p className="text-sm text-purple-800 mt-2">{feedback}</p>}
          </div>
        )}

        {/* Main Document Body */}
        <main className="relative bg-white print:bg-white rounded-2xl border border-slate-200/80 print:border-none p-6 sm:p-10 shadow-xs space-y-6 min-h-[600px]">
          
          {/* Read-Only Status Banner */}
          {isReadOnly && (
            <div className="bg-amber-50 border border-amber-200/80 text-amber-900 rounded-xl p-3.5 text-xs font-medium flex items-center justify-between">
              <span>🔒 This assignment has been submitted to your teacher and is currently locked for editing.</span>
              <span className="font-bold uppercase tracking-wider text-[10px] bg-amber-200/60 px-2 py-0.5 rounded-md">
                Read Only
              </span>
            </div>
          )}

          {/* Title Input */}
          <input
            type="text"
            disabled={isReadOnly}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 border-b border-slate-200/80 pb-3 focus:outline-none disabled:bg-transparent disabled:opacity-80"
            placeholder="Document Title"
          />

          {/* Tiptap Rich Text Editor */}
          <Editor
            content={content}
            editable={!isReadOnly}
            onChange={(html) => setContent(html)}
          />

          {/* Render Floating Teacher Markup Textboxes */}
          {floatingComments.map((comment) => (
            <div
              key={comment.id}
              style={{ left: `${comment.x}%`, top: `${comment.y}px` }}
              className="floating-textbox absolute w-60 bg-amber-50/95 backdrop-blur-xs border border-amber-300 rounded-xl p-3 shadow-md z-20 text-xs text-amber-950 font-medium space-y-1"
            >
              <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                📌 Teacher Note
              </div>
              <p className="leading-relaxed whitespace-pre-wrap">{comment.text}</p>
            </div>
          ))}

        </main>
      </div>
    </div>
  );
}

export default function AssignmentPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 font-medium">Loading page...</div>}>
      <AssignmentPageContent />
    </Suspense>
  );
}
