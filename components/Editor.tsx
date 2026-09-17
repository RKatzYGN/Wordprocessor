'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

interface EditorProps {
  content?: string;
  onChange?: (html: string) => void;
}

export default function Editor({ content = '', onChange }: EditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: typeof content === 'string' ? content : '',
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getHTML());
      }
    },
  });

  if (!editor) {
    return <div className="p-4 border rounded bg-gray-50 text-gray-400">Initializing editor...</div>;
  }

  return (
    <div className="border rounded-md p-4 min-h-[300px] bg-white text-black">
      <div className="mb-4 pb-2 border-b flex gap-2">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`px-3 py-1 text-sm border rounded ${
            editor.isActive('bold') ? 'bg-gray-800 text-white' : 'bg-gray-100 text-black'
          }`}
        >
          Bold
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`px-3 py-1 text-sm border rounded ${
            editor.isActive('italic') ? 'bg-gray-800 text-white' : 'bg-gray-100 text-black'
          }`}
        >
          Italic
        </button>
      </div>
      <EditorContent editor={editor} className="prose max-w-none focus:outline-none min-h-[250px]" />
    </div>
  );
}
