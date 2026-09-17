'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function TeacherDashboard() {
  const [submissions, setSubmissions] = useState<any[]>([]);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    const { data } = await supabase
      .from('assignments')
      .select('*, profiles(email)')
      .eq('status', 'submitted');

    if (data) setSubmissions(data);
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Teacher Portal - Submitted Assignments</h1>

      <div className="border rounded-lg divide-y bg-white">
        {submissions.length === 0 ? (
          <p className="p-4 text-gray-500">No handed-in assignments yet.</p>
        ) : (
          submissions.map((sub) => (
            <div key={sub.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
              <div>
                <h3 className="font-semibold text-gray-900">{sub.filename}</h3>
                <p className="text-xs text-gray-500">Student: {sub.profiles?.email}</p>
                <p className="text-xs text-gray-400">Handed in: {new Date(sub.submitted_at).toLocaleString()}</p>
              </div>
              <button
                onClick={() => alert(JSON.stringify(sub.content, null, 2))}
                className="px-3 py-1 bg-gray-100 border text-sm rounded hover:bg-gray-200"
              >
                Review Content
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
