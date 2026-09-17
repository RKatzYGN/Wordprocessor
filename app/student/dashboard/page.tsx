'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Folder {
  id: string;
  name: string;
}

interface Assignment {
  id: string;
  title: string;
  content: string;
  updated_at: string;
  folder_id: string | null;
}

export default function StudentDashboard() {
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  
  const [loading, setLoading] = useState(true);
  const [creatingDoc, setCreatingDoc] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showFolderModal, setShowFolderModal] = useState(false);

  // Load Folders & Assignments
  const fetchData = async () => {
    setLoading(true);

    const [foldersRes, assignmentsRes] = await Promise.all([
      supabase.from('folders').select('*').order('name', { ascending: true }),
      supabase.from('assignments').select('*').order('updated_at', { ascending: false }),
    ]);

    if (foldersRes.data) setFolders(foldersRes.data);
    if (assignmentsRes.data) setAssignments(assignmentsRes.data);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Create New Document
  const handleCreateDocument = async () => {
    setCreatingDoc(true);
    
    const folderIdToAssign = selectedFolder !== 'all' && selectedFolder !== 'none' ? selectedFolder : null;

    const { data, error } = await supabase
      .from('assignments')
      .insert([
        {
          title: 'Untitled Document',
          content: '',
          folder_id: folderIdToAssign,
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      alert(`Error creating document: ${error.message}`);
      setCreatingDoc(false);
    } else if (data) {
      router.push(`/student/assignment/${data.id}`);
    }
  };

  // Create New Folder
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setCreatingFolder(true);
    const { error } = await supabase.from('folders').insert([{ name: newFolderName.trim() }]);

    if (error) {
      alert(`Error creating folder: ${error.message}`);
    } else {
      setNewFolderName('');
      setShowFolderModal(false);
      fetchData();
    }
    setCreatingFolder(false);
  };

  // Delete Assignment
  const handleDeleteAssignment = async (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation(); // Prevents opening the document when clicking delete
    
    const confirmDelete = window.confirm(`Are you sure you want to delete "${title || 'Untitled Document'}"?`);
    if (!confirmDelete) return;

    const { error } = await supabase.from('assignments').delete().eq('id', id);

    if (error) {
      alert(`Error deleting document: ${error.message}`);
    } else {
      setAssignments((prev) => prev.filter((doc) => doc.id !== id));
    }
  };

  // Filter assignments based on folder selection
  const filteredAssignments = assignments.filter((doc) => {
    if (selectedFolder === 'all') return true;
    if (selectedFolder === 'none') return !doc.folder_id;
    return doc.folder_id === selectedFolder;
  });

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Student Dashboard</h1>
          <p className="text-sm text-gray-500">Organize and manage your written work</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFolderModal(true)}
            className="px-4 py-2 bg-gray-100 text-gray-800 font-medium rounded hover:bg-gray-200 transition"
          >
            + New Folder
          </button>
          <button
            onClick={handleCreateDocument}
            disabled={creatingDoc}
            className="px-4 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 transition disabled:opacity-50"
          >
            {creatingDoc ? 'Creating...' : '+ New Document'}
          </button>
        </div>
      </div>

      {/* Folder Selection Bar */}
      <div className="flex flex-wrap items-center gap-2 pt-2">
        <span className="text-sm font-semibold text-gray-600 mr-2">Filter by Folder:</span>
        <button
          onClick={() => setSelectedFolder('all')}
          className={`px-3 py-1.5 text-sm rounded-full transition ${
            selectedFolder === 'all'
              ? 'bg-blue-600 text-white font-medium'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          📁 All Documents ({assignments.length})
        </button>
        <button
          onClick={() => setSelectedFolder('none')}
          className={`px-3 py-1.5 text-sm rounded-full transition ${
            selectedFolder === 'none'
              ? 'bg-blue-600 text-white font-medium'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Unorganized
        </button>
        {folders.map((folder) => (
          <button
            key={folder.id}
            onClick={() => setSelectedFolder(folder.id)}
            className={`px-3 py-1.5 text-sm rounded-full transition ${
              selectedFolder === folder.id
                ? 'bg-blue-600 text-white font-medium'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📂 {folder.name}
          </button>
        ))}
      </div>

      {/* Assignments Grid */}
      {loading ? (
        <div className="p-12 text-center text-gray-500">Loading your assignments...</div>
      ) : filteredAssignments.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed rounded-lg text-gray-400">
          <p className="mb-4">No documents found in this view.</p>
          <button
            onClick={handleCreateDocument}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Create New Document Here
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssignments.map((doc) => (
            <div
              key={doc.id}
              onClick={() => router.push(`/student/assignment/${doc.id}`)}
              className="p-5 border rounded-lg shadow-sm hover:shadow-md transition cursor-pointer bg-white flex flex-col justify-between group relative"
            >
              <div>
                <div className="flex justify-between items-start mb-1">
                  <h2 className="text-lg font-semibold text-gray-800 truncate pr-6">
                    {doc.title && doc.title.trim() !== '' ? doc.title : 'Untitled Document'}
                  </h2>
                  <button
                    onClick={(e) => handleDeleteAssignment(e, doc.id, doc.title)}
                    title="Delete Assignment"
                    className="text-gray-400 hover:text-red-600 p-1 text-sm font-bold transition"
                  >
                    🗑️
                  </button>
                </div>
                <p className="text-xs text-gray-400">
                  Updated: {new Date(doc.updated_at).toLocaleDateString()}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t flex justify-between items-center text-sm">
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                  {doc.folder_id
                    ? folders.find((f) => f.id === doc.folder_id)?.name || 'Folder'
                    : 'Unorganized'}
                </span>
                <span className="font-medium text-blue-600 hover:underline">Open →</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Folder Modal */}
      {showFolderModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Create New Folder</h3>
            <form onSubmit={handleCreateFolder} className="space-y-4">
              <input
                type="text"
                placeholder="Folder Name (e.g. History, Science)"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="w-full border rounded p-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowFolderModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingFolder}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {creatingFolder ? 'Saving...' : 'Create Folder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
