'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

interface EditorProps {
  content?: string;
  onChange?: (html: string) => void;
}

export default function Editor({ content = '', onChange }: EditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
    ],
    content: typeof content === 'string' ? content : '',
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getHTML());
      }
    },
    editorProps: {
      attributes: {
        // Keeps cursor visible and fills container space
        class:
          'prose max-w-none focus:outline-none min-h-[400px] p-4 text-black cursor-text',
      },
    },
  });

  if (!editor) {
    return (
      <div className="border rounded-md p-4 min-h-[400px] bg-gray-50 flex items-center justify-center text-gray-400">
        Initializing editor...
      </div>
    );
  }

  return (
    <div
      className="border rounded-md bg-white shadow-sm cursor-text"
      onClick={() => editor.chain().focus().run()}
    >
      {/* Toolbar - Hidden when printing */}
      <div
        className="print:hidden border-b p-2 bg-gray-50 flex flex-wrap gap-2 items-center rounded-t-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Font Size / Heading Selector */}
        <select
          onChange={(e) => {
            const val = e.target.value;
            if (val === 'p') editor.chain().focus().setParagraph().run();
            else if (val === 'h1') editor.chain().focus().toggleHeading({ level: 1 }).run();
            else if (val === 'h2') editor.chain().focus().toggleHeading({ level: 2 }).run();
            else if (val === 'h3') editor.chain().focus().toggleHeading({ level: 3 }).run();
          }}
          className="border rounded px-2 py-1 text-sm bg-white text-black"
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
          <option value="p">Normal text</option>
          <option value="h1">Heading 1 (Large)</option>
          <option value="h2">Heading 2 (Medium)</option>
          <option value="h3">Heading 3 (Small)</option>
        </select>

        <span className="text-gray-300">|</span>

        {/* Formatting Buttons */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`px-3 py-1 text-sm border rounded font-bold ${
            editor.isActive('bold') ? 'bg-gray-800 text-white' : 'bg-white text-black'
          }`}
        >
          B
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`px-3 py-1 text-sm border rounded italic ${
            editor.isActive('italic') ? 'bg-gray-800 text-white' : 'bg-white text-black'
          }`}
        >
          I
        </button>

        <span className="text-gray-300">|</span>

        {/* List Buttons */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`px-3 py-1 text-sm border rounded ${
            editor.isActive('bulletList') ? 'bg-gray-800 text-white' : 'bg-white text-black'
          }`}
        >
          • Bullet List
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`px-3 py-1 text-sm border rounded ${
            editor.isActive('orderedList') ? 'bg-gray-800 text-white' : 'bg-white text-black'
          }`}
        >
          1. Numbered List
        </button>
      </div>

      {/* Editable Canvas */}
      <EditorContent editor={editor} />
    </div>
  );
}
