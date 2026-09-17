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
    
    // 1. Get the current logged-in user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      alert('You must be logged in to create a document.');
      setCreatingDoc(false);
      return;
    }

    const folderIdToAssign = selectedFolder !== 'all' && selectedFolder !== 'none' ? selectedFolder : null;

    // 2. Insert with student_id included
    const { data, error } = await supabase
      .from('assignments')
      .insert([
        {
          title: 'Untitled Document',
          content: '',
          student_id: user.id, // Satisfies the NOT NULL constraint
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

  const handleDeleteAssignment = async (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation();
    const confirmDelete = window.confirm(`Delete "${title || 'Untitled Document'}" permanently?`);
    if (!confirmDelete) return;

    const { error } = await supabase.from('assignments').delete().eq('id', id);

    if (error) {
      alert(`Error deleting document: ${error.message}`);
    } else {
      setAssignments((prev) => prev.filter((doc) => doc.id !== id));
    }
  };

  const filteredAssignments = assignments.filter((doc) => {
    if (selectedFolder === 'all') return true;
    if (selectedFolder === 'none') return !doc.folder_id;
    return doc.folder_id === selectedFolder;
  });

  return (
    <div className="min-h-screen bg-slate-50/50 pb-12">
      <div className="max-w-6xl mx-auto p-6 md:p-8 space-y-8">
        
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Student Workspace</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage, organize, and edit your word processor assignments</p>
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={() => setShowFolderModal(true)}
              className="px-4 py-2.5 bg-slate-100 text-slate-700 font-medium text-sm rounded-xl hover:bg-slate-200 transition shadow-xs"
            >
              + New Folder
            </button>
            <button
              onClick={handleCreateDocument}
              disabled={creatingDoc}
              className="px-4 py-2.5 bg-blue-600 text-white font-medium text-sm rounded-xl hover:bg-blue-700 transition shadow-sm disabled:opacity-50"
            >
              {creatingDoc ? 'Creating...' : '+ New Document'}
            </button>
          </div>
        </div>

        {/* Folder Filter Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mr-2">Folders:</span>
          <button
            onClick={() => setSelectedFolder('all')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-xl transition ${
              selectedFolder === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            All Docs ({assignments.length})
          </button>
          <button
            onClick={() => setSelectedFolder('none')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-xl transition ${
              selectedFolder === 'none'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            Unorganized
          </button>
          {folders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => setSelectedFolder(folder.id)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-xl transition ${
                selectedFolder === folder.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              📁 {folder.name}
            </button>
          ))}
        </div>

        {/* Documents Grid */}
        {loading ? (
          <div className="p-16 text-center text-slate-400 font-medium">Loading your documents...</div>
        ) : filteredAssignments.length === 0 ? (
          <div className="p-16 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white text-slate-400 space-y-3">
            <p className="text-sm font-medium">No documents in this view.</p>
            <button
              onClick={handleCreateDocument}
              className="px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded-xl hover:bg-blue-700 shadow-sm"
            >
              Create New Document
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredAssignments.map((doc) => (
              <div
                key={doc.id}
                onClick={() => router.push(`/student/assignment/${doc.id}`)}
                className="p-6 border border-slate-200/80 rounded-2xl shadow-xs hover:shadow-md hover:border-slate-300 transition-all cursor-pointer bg-white flex flex-col justify-between group relative"
              >
                <div>
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <h2 className="text-base font-semibold text-slate-900 truncate group-hover:text-blue-600 transition">
                      {doc.title && doc.title.trim() !== '' ? doc.title : 'Untitled Document'}
                    </h2>
                    <button
                      onClick={(e) => handleDeleteAssignment(e, doc.id, doc.title)}
                      title="Delete Assignment"
                      className="text-slate-300 hover:text-red-600 p-1 rounded-lg transition"
                    >
                      🗑️
                    </button>
                  </div>
                  <p className="text-xs text-slate-400">
                    Updated {new Date(doc.updated_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center text-xs">
                  <span className="font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                    {doc.folder_id
                      ? folders.find((f) => f.id === doc.folder_id)?.name || 'Folder'
                      : 'Unorganized'}
                  </span>
                  <span className="font-semibold text-blue-600 group-hover:translate-x-1 transition-transform inline-block">
                    Open →
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* New Folder Modal */}
        {showFolderModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl border border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Create Folder</h3>
              <form onSubmit={handleCreateFolder} className="space-y-4">
                <input
                  type="text"
                  placeholder="e.g. English Literature"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowFolderModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-medium rounded-xl hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingFolder}
                    className="px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50"
                  >
                    {creatingFolder ? 'Saving...' : 'Create Folder'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
