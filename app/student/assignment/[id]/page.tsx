'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';

const Editor = dynamic(() => import('@/components/Editor'), {
  ssr: false,
  loading: () => <div className="p-4 border rounded bg-gray-50 text-gray-400">Loading editor...</div>,
});

export default function AssignmentPage() {
  const params = useParams();
  const router = useRouter();
  
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

    const { data, error } = await supabase
      .from('assignments')
      .update({ 
        title: title, 
        content: content, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', assignmentId)
      .select();

    if (error) {
      alert(`Save error: ${error.message}`);
      console.error('Save error:', error);
    } else if (!data || data.length === 0) {
      alert('Save warning: No document matched this ID in Supabase.');
    } else {
      alert('Saved successfully!');
    }

    setSaving(false);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-600">Loading document...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4 print:p-0 print:m-0">
      <div className="print:hidden flex justify-between items-center">
        <button
          onClick={() => router.push('/student/dashboard')}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
        >
          ← Return to Dashboard
        </button>

        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 transition"
          >
            🖨️ Print Document
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Document'}
          </button>
        </div>
      </div>

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full text-3xl font-bold border-b pb-2 focus:outline-none text-black print:border-none print:text-4xl"
        placeholder="Document Title"
      />

      <Editor content={content} onChange={(html) => setContent(html)} />
    </div>
  );
}
