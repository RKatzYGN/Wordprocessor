'use client';

import { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

interface EditorProps {
  content?: string;
  onChange?: (html: string) => void;
}

export default function Editor({ content = '', onChange }: EditorProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="border border-slate-200 rounded-xl p-8 min-h-[500px] bg-slate-50 flex items-center justify-center text-slate-400 font-medium">
        Loading editor...
      </div>
    );
  }

  return <EditorInstance content={content} onChange={onChange} />;
}

function EditorInstance({ content, onChange }: EditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: typeof content === 'string' ? content : '',
    autofocus: 'end',
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getHTML());
      }
    },
    editorProps: {
      attributes: {
        class: 'prose max-w-none focus:outline-none min-h-[480px] p-6 text-slate-800 cursor-text leading-relaxed text-base',
      },
    },
  });

  if (!editor) {
    return (
      <div className="border border-slate-200 rounded-xl p-8 min-h-[500px] bg-slate-50 flex items-center justify-center text-slate-400 font-medium">
        Initializing canvas...
      </div>
    );
  }

  return (
    <div
      className="border border-slate-200 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow cursor-text overflow-hidden"
      onClick={() => editor.chain().focus().run()}
    >
      <div
        className="print:hidden border-b border-slate-200 p-2.5 bg-slate-50/80 backdrop-blur flex flex-wrap gap-2 items-center sticky top-0 z-10"
        onClick={(e) => e.stopPropagation()}
      >
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
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
