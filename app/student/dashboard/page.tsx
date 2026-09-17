'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Assignment {
  id: string;
  title: string;
  content: string;
  updated_at: string;
}

export default function StudentDashboard() {
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Fetch assignments on page load and when returning to dashboard
  const fetchAssignments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('assignments')
      .select('id, title, content, updated_at')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching assignments:', error);
    } else if (data) {
      setAssignments(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  // Create a new document and immediately open it
  const handleCreateDocument = async () => {
    setCreating(true);
    const { data, error } = await supabase
      .from('assignments')
      .insert([
        {
          title: 'Untitled Document',
          content: '',
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      alert(`Error creating document: ${error.message}`);
      setCreating(false);
    } else if (data) {
      router.push(`/student/assignment/${data.id}`);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Student Dashboard</h1>
          <p className="text-sm text-gray-500">Manage and edit your written assignments</p>
        </div>
        <button
          onClick={handleCreateDocument}
          disabled={creating}
          className="px-4 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 transition disabled:opacity-50"
        >
          {creating ? 'Creating...' : '+ New Document'}
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-500">Loading your documents...</div>
      ) : assignments.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed rounded-lg text-gray-400">
          <p className="mb-4">No documents found.</p>
          <button
            onClick={handleCreateDocument}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Create Your First Document
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assignments.map((doc) => (
            <div
              key={doc.id}
              onClick={() => router.push(`/student/assignment/${doc.id}`)}
              className="p-5 border rounded-lg shadow-sm hover:shadow-md transition cursor-pointer bg-white flex flex-col justify-between"
            >
              <div>
                <h2 className="text-lg font-semibold text-gray-800 truncate mb-1">
                  {doc.title && doc.title.trim() !== '' ? doc.title : 'Untitled Document'}
                </h2>
                <p className="text-xs text-gray-400">
                  Last updated: {new Date(doc.updated_at).toLocaleDateString()} at{' '}
                  {new Date(doc.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className="mt-4 pt-2 border-t flex justify-end">
                <span className="text-sm font-medium text-blue-600 hover:underline">
                  Open Document →
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
