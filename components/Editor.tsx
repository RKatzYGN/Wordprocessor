'use client';

import { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

interface EditorProps {
  content?: string;
  onChange?: (html: string) => void;
}

// 1. Outer Guard: Prevents Tiptap from running during Server-Side Rendering (SSR)
export default function Editor({ content = '', onChange }: EditorProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="border border-slate-200 rounded-xl p-8 min-h-[500px] bg-slate-50 flex items-center justify-center text-slate-400 font-medium">
        Loading editor canvas...
      </div>
    );
  }

  return <EditorInstance content={content} onChange={onChange} />;
}

// 2. Inner Instance: Mounts safely in browser client memory only
function EditorInstance({ content = '', onChange }: EditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
    ],
    content: typeof content === 'string' ? content : '',
    autofocus: 'end',
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getHTML());
      }
    },
    editorProps: {
      attributes: {
        class:
          'prose max-w-none focus:outline-none min-h-[480px] p-6 text-slate-800 cursor-text leading-relaxed text-base',
      },
    },
  });

  // Guarantees cursor focuses immediately on mount
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      editor.commands.focus('end');
    }
  }, [editor]);

  if (!editor) {
    return (
      <div className="border border-slate-200 rounded-xl p-8 min-h-[500px] bg-slate-50 flex items-center justify-center text-slate-400 font-medium">
        Initializing editor toolbar...
      </div>
    );
  }

  return (
    <div
      className="border border-slate-200 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow cursor-text overflow-hidden"
      onClick={() => editor.chain().focus().run()}
    >
      {/* Floating Toolbar */}
      <div
        className="print:hidden border-b border-slate-200 p-2.5 bg-slate-50/80 backdrop-blur flex flex-wrap gap-2 items-center sticky top-0 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Style & Heading Selector */}
        <select
          onChange={(e) => {
            const val = e.target.value;
            if (val === 'p') editor.chain().focus().setParagraph().run();
            else if (val === 'h1') editor.chain().focus().toggleHeading({ level: 1 }).run();
            else if (val === 'h2') editor.chain().focus().toggleHeading({ level: 2 }).run();
            else if (val === 'h3') editor.chain().focus().toggleHeading({ level: 3 }).run();
          }}
          className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-medium bg-white text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={
            editor.isActive('heading', { level: 1 })
              ? 'h1'
              : editor.isActive('heading', { level: 2 })
              ? 'h2'
              : editor.isActive('heading', { level: 3 })
              ? 'h3'
              : 'p'
          }
        >
          <option value="p">Normal Text</option>
          <option value="h1">Heading 1 (Large)</option>
          <option value="h2">Heading 2 (Medium)</option>
          <option value="h3">Heading 3 (Small)</option>
        </select>

        <span className="text-slate-300 font-light">|</span>

        {/* Formatting Tools */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
            editor.isActive('bold')
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
          }`}
        >
          B
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`px-3 py-1.5 text-xs font-semibold italic rounded-lg border transition ${
            editor.isActive('italic')
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
          }`}
        >
          I
        </button>

        <span className="text-slate-300 font-light">|</span>

        {/* Lists */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
            editor.isActive('bulletList')
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
          }`}
        >
          • Bullet List
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
            editor.isActive('orderedList')
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
          }`}
        >
          1. Numbered List
        </button>
      </div>

      {/* Tiptap Canvas */}
      <EditorContent editor={editor} />
    </div>
  );
}
