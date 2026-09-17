'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Editor from '@/components/Editor';

export default function AssignmentPage() {
  const params = useParams();
  const router = useRouter();
  const assignmentId = params?.id as string;

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

      if (data) {
        setTitle(data.title || 'Untitled Document');
        setContent(data.content || '');
      }
      setLoading(false);
    }

    fetchAssignment();
  }, [assignmentId]);

  const handleSave = async () => {
    setSaving(true);
    await supabase
      .from('assignments')
      .update({ title, content, updated_at: new Date() })
      .eq('id', assignmentId);
    setSaving(false);
  };

  if (loading) {
    return <div className="p-8 text-center">Loading document...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <div className="flex justify-between items-center">
        <button
          onClick={() => router.push('/student/dashboard')}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          ← Return to Dashboard
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Document'}
        </button>
      </div>

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full text-3xl font-bold border-b pb-2 focus:outline-none text-black"
        placeholder="Document Title"
      />

      <Editor content={content} onChange={(html) => setContent(html)} />
    </div>
  );
}
