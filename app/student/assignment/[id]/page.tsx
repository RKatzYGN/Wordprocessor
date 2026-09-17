'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import DocumentEditor from '@/components/Editor';

export default function AssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [assignment, setAssignment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAssignment() {
      const { data } = await supabase
        .from('assignments')
        .select('*')
        .eq('id', id)
        .single();

      if (data) setAssignment(data);
      setLoading(false);
    }
    loadAssignment();
  }, [id]);

  if (loading) return <div className="p-8 font-sans">Loading document...</div>;
  if (!assignment) return <div className="p-8 font-sans">Assignment not found.</div>;

  return (
    <DocumentEditor
      documentId={assignment.id}
      initialContent={assignment.content}
      initialFilename={assignment.filename}
    />
  );
}
