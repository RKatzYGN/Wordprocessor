'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';

// Load Editor strictly on client
const Editor = dynamic(() => import('@/components/Editor'), {
  ssr: false,
  loading: () => (
    <div className="border border-slate-200 rounded-xl p-8 min-h-[500px] bg-slate-50 flex items-center justify-center text-slate-400 font-medium">
      Loading editor...
    </div>
  ),
});

function AssignmentPageContent() {
  const params = useParams();
  const router = useRouter();

  // Safely read dynamic assignment ID from client params
  const assignmentId = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';

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
    return <div className="p-8 text-center text-slate-500 font-medium">Loading document data...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6 print:p-0 print:m-0">
      {/* Top Action Bar */}
      <div className="print:hidden flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <button
          onClick={() => router.push('/student/dashboard')}
          className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition"
        >
          ← Return to Dashboard
        </button>

        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-900 transition"
          >
            🖨️ Print
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Document'}
          </button>
        </div>
      </div>

      {/* Document Title Input */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full text-3xl font-bold border-b border-slate-200 pb-2 focus:outline-none text-slate-900 print:border-none print:text-4xl"
        placeholder="Document Title"
      />

      {/* Tiptap Editor */}
      <Editor content={content} onChange={(html) => setContent(html)} />
    </div>
  );
}

// Default export wrapped in Suspense boundary to prevent Next.js #438 params hydration crash
export default function AssignmentPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 font-medium">Loading page...</div>}>
      <AssignmentPageContent />
    </Suspense>
  );
}
