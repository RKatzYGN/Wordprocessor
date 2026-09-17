'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Extension } from '@tiptap/core';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

// Custom Font Size Extension
const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() { return { types: ['textStyle'] }; },
  addGlobalAttributes() {
    return [{
      types: this.options.types,
      attributes: {
        fontSize: {
          default: null,
          parseHTML: element => element.style.fontSize,
          renderHTML: attributes => attributes.fontSize ? { style: `font-size: ${attributes.fontSize}` } : {},
        },
      },
    }];
  },
});

interface EditorProps {
  documentId: string;
  initialContent: any;
  initialFilename: string;
}

export default function DocumentEditor({ documentId, initialContent, initialFilename }: EditorProps) {
  const [filename, setFilename] = useState(initialFilename);
  const [isAutosave, setIsAutosave] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'Saved' | 'Saving...' | 'Unsaved'>('Saved');

  const editor = useEditor({
    extensions: [StarterKit, TextStyle, FontSize],
    content: initialContent,
    onUpdate: () => {
      setSaveStatus('Unsaved');
    },
  });

  // Manual Save Functionality
  const handleSave = async () => {
    if (!editor) return;
    setSaveStatus('Saving...');
    const content = editor.getJSON();

    const { error } = await supabase
      .from('assignments')
      .update({ filename, content, updated_at: new Date().toISOString() })
      .eq('id', documentId);

    if (!error) setSaveStatus('Saved');
  };

  // Save As Functionality
  const handleSaveAs = async () => {
    if (!editor) return;
    const newName = prompt('Enter new filename:', `${filename} (Copy)`);
    if (!newName) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('assignments')
      .insert({
        filename: newName,
        content: editor.getJSON(),
        student_id: user.id,
        status: 'draft',
      })
      .select()
      .single();

    if (data) {
      window.location.href = `/student/assignment/${data.id}`;
    }
  };

  // Hand In Assignment
  const handleHandIn = async () => {
    if (!confirm('Are you sure you want to hand in this assignment? It will become read-only.')) return;
    await supabase
      .from('assignments')
      .update({ status: 'submitted', submitted_at: new Date().toISOString() })
      .eq('id', documentId);
    
    window.location.href = '/student/dashboard';
  };

  // Debounced Autosave Engine
  useEffect(() => {
    if (!isAutosave || saveStatus !== 'Unsaved') return;

    const timer = setTimeout(() => {
      handleSave();
    }, 3000);

    return () => clearTimeout(timer);
  }, [editor?.getJSON(), isAutosave, saveStatus]);

  if (!editor) return null;

  return (
    <div className="flex flex-col h-screen max-w-5xl mx-auto p-4">
      {/* Top Controls Header */}
      <div className="flex items-center justify-between border-b pb-3 mb-4 gap-4">
        <div className="flex items-center gap-3">
          {/* Return to Dashboard Button */}
          <Link
            href="/student/dashboard"
            className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300 font-medium transition"
          >
            ← Dashboard
          </Link>
          
          <input
            type="text"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            className="text-xl font-semibold border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none px-1"
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 font-mono">{saveStatus}</span>
          
          <label className="flex items-center gap-1 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isAutosave}
              onChange={(e) => setIsAutosave(e.target.checked)}
              className="rounded"
            />
            Autosave
          </label>

          <button onClick={handleSave} className="px-3 py-1 bg-gray-100 border rounded text-sm hover:bg-gray-200">
            Save
          </button>
          <button onClick={handleSaveAs} className="px-3 py-1 bg-gray-100 border rounded text-sm hover:bg-gray-200">
            Save As
          </button>
          <button onClick={handleHandIn} className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 font-medium">
            Hand In
          </button>
        </div>
      </div>

      {/* Editor Formatting Toolbar */}
      <div className="flex items-center gap-2 border bg-gray-50 p-2 rounded-t flex-wrap">
        {/* Undo / Redo */}
        <button onClick={() => editor.chain().focus().undo().run()} className="px-2 py-1 border rounded bg-white">
          ↺
        </button>
        <button onClick={() => editor.chain().focus().redo().run()} className="px-2 py-1 border rounded bg-white">
          ↻
        </button>

        <span className="text-gray-300">|</span>

        {/* Text Styling */}
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`px-2 py-1 border rounded ${editor.isActive('bold') ? 'bg-blue-100 font-bold' : 'bg-white'}`}
        >
          B
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`px-2 py-1 border rounded ${editor.isActive('italic') ? 'bg-blue-100 italic' : 'bg-white'}`}
        >
          I
        </button>

        <span className="text-gray-300">|</span>

        {/* Font Size Selector */}
        <select
          onChange={(e) => editor.chain().focus().setMark('textStyle', { fontSize: e.target.value }).run()}
          className="border rounded px-2 py-1 bg-white"
        >
          <option value="12px">Small (12px)</option>
          <option value="16px">Normal (16px)</option>
          <option value="20px">Large (20px)</option>
          <option value="24px">Huge (24px)</option>
        </select>
      </div>

      {/* Main Canvas */}
      <div className="flex-1 border border-t-0 p-6 rounded-b bg-white overflow-y-auto shadow-inner">
        <EditorContent editor={editor} className="prose focus:outline-none min-h-[500px]" />
      </div>
    </div>
  );
}
