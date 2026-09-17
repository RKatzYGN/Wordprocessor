'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function StudentDashboard() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  useEffect(() => {
    fetchFolders();
    fetchAssignments();
  }, []);

  const fetchFolders = async () => {
    const { data } = await supabase.from('folders').select('*');
    if (data) setFolders(data);
  };

  const fetchAssignments = async () => {
    const { data } = await supabase.from('assignments').select('*');
    if (data) setAssignments(data);
  };

  const createNewFolder = async () => {
    const name = prompt('Enter folder name:');
    if (!name) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('folders').insert({ name, student_id: user.id });
    fetchFolders();
  };

  const createNewAssignment = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('assignments')
      .insert({
        filename: 'Untitled Assignment',
        student_id: user.id,
        folder_id: selectedFolder,
      })
      .select()
      .single();

    if (data) {
      window.location.href = `/student/assignment/${data.id}`;
    }
  };

  // Move assignment to a different folder
  const handleMoveFolder = async (assignmentId: string, newFolderId: string) => {
    const folderIdValue = newFolderId === 'none' ? null : newFolderId;

    await supabase
      .from('assignments')
      .update({ folder_id: folderIdValue })
      .eq('id', assignmentId);

    fetchAssignments();
  };

  const filteredAssignments = selectedFolder
    ? assignments.filter((a) => a.folder_id === selectedFolder)
    : assignments;

  return (
    <div className="max-w-6xl mx-auto p-6 flex gap-6">
      {/* Sidebar: Folder Navigation */}
      <div className="w-1/4 border-r pr-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-lg">Folders</h2>
          <button onClick={createNewFolder} className="text-sm text-blue-600 hover:underline">
            + New
          </button>
        </div>
        <ul className="space-y-1">
          <li>
            <button
              onClick={() => setSelectedFolder(null)}
              className={`w-full text-left px-2 py-1 rounded ${!selectedFolder ? 'bg-blue-100 text-blue-700 font-medium' : 'hover:bg-gray-100'}`}
            >
              📂 All Files
            </button>
          </li>
          {folders.map((folder) => (
            <li key={folder.id}>
              <button
                onClick={() => setSelectedFolder(folder.id)}
                className={`w-full text-left px-2 py-1 rounded ${selectedFolder === folder.id ? 'bg-blue-100 text-blue-700 font-medium' : 'hover:bg-gray-100'}`}
              >
                📁 {folder.name}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Main Panel: Assignments Grid */}
      <div className="flex-1">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">My Assignments</h1>
          <button
            onClick={createNewAssignment}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
          >
            + Create New Assignment
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssignments.map((assignment) => (
            <div
              key={assignment.id}
              className="p-4 border rounded shadow-sm bg-white flex flex-col justify-between"
            >
              <div>
                <Link
                  href={`/student/assignment/${assignment.id}`}
                  className="font-semibold text-lg text-blue-600 hover:underline block truncate"
                >
                  {assignment.filename}
                </Link>
                <p className="text-xs text-gray-400 mt-1">
                  Updated: {new Date(assignment.updated_at).toLocaleDateString()}
                </p>
                <span
                  className={`inline-block mt-2 px-2 py-0.5 text-xs rounded ${
                    assignment.status === 'submitted' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {assignment.status}
                </span>
              </div>

              {/* Move to Folder Selector */}
              <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs">
                <span className="text-gray-500">Folder:</span>
                <select
                  value={assignment.folder_id || 'none'}
                  onChange={(e) => handleMoveFolder(assignment.id, e.target.value)}
                  className="border rounded px-2 py-1 bg-gray-50 text-gray-700 outline-none"
                >
                  <option value="none">No Folder (Root)</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      📁 {f.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
