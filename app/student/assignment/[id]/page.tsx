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
        setTitle(data.title || 'Untitled Document');
        setContent(data.content || '');
      }
      setLoading(false);
    }

    fetchAssignment();
  }, [assignmentId]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50 p-8 flex items-center justify-center text-slate-500 font-medium">
        Loading document data...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 print:bg-white print:min-h-0 py-8 px-4 sm:px-6 lg:px-8">
      {/* Strict CSS Override to guarantee headers and toolbars hide when printing */}
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
          input {
            border: none !important;
            padding: 0 !important;
            font-size: 28pt !important;
            font-weight: bold !important;
          }
        }
      `}</style>

      <div className="max-w-5xl mx-auto space-y-6 print:space-y-4 print:p-0 print:m-0">
        {/* Top Action Bar */}
        <header className="no-print print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <button
            onClick={() => router.push('/student/dashboard')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold rounded-xl transition-all active:scale-[0.98]"
          >
            ← Return to Dashboard
          </button>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-all shadow-xs hover:shadow-md active:scale-[0.98]"
            >
              🖨️ Print
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold rounded-xl transition-all shadow-xs hover:shadow-md active:scale-[0.98] disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Document'}
            </button>
          </div>
        </header>

        {/* Main Document Body */}
        <main className="bg-white print:bg-white rounded-2xl print:rounded-none border border-slate-200/80 print:border-none p-6 sm:p-10 print:p-0 shadow-xs print:shadow-none space-y-6 print:space-y-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 border-b border-slate-200/80 pb-3 focus:outline-none focus:border-blue-500 print:border-none print:pb-0"
            placeholder="Document Title"
          />

          <Editor content={content} onChange={(html) => setContent(html)} />
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
