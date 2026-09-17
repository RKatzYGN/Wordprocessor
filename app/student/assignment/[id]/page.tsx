'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';

// Load Editor strictly on client side
const Editor = dynamic(() => import('@/components/Editor'), {
  ssr: false,
  loading: () => (
    <div className="border border-slate-200 rounded-2xl p-8 min-h-[500px] bg-slate-50 flex items-center justify-center text-slate-400 font-medium">
      Loading document canvas...
    </div>
  ),
});

function AssignmentPageContent() {
  const params = useParams();
  const router = useRouter();

  const assignmentId =
    typeof params?.id === 'string'
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : '';

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!assignmentId) return;

    async function fetchAssignment() {
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('id', assignmentId)
        .single();

      if (error) {
        console.error('Fetch error:', error);
      } else if (data) {
        setTitle(data.title || 'Untitled Document');
        setContent(data.content || '');
      }
      setLoading(false);
    }

    fetchAssignment();
  }, [assignmentId]);

  // Database Save
  const handleSave = async () => {
    if (!assignmentId) return;
    setSaving(true);

    const { error } = await supabase
      .from('assignments')
      .update({
        title,
        content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', assignmentId);

    if (error) {
      alert(`Save error: ${error.message}`);
    } else {
      alert('Saved to cloud database successfully!');
    }

    setSaving(false);
  };

  // 💾 Save / Export directly to USB Drive
  const handleSaveToUSB = async () => {
    const filename = `${title || 'Untitled Document'}.html`;

    // 1. Modern Web File System Access API (Chrome, Edge, Opera)
    if ('showSaveFilePicker' in window) {
      try {
        // @ts-ignore
        const handle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [
            {
              description: 'HTML Web Document',
              accept: { 'text/html': ['.html', '.htm'] },
            },
            {
              description: 'Text Document',
              accept: { 'text/plain': ['.txt'] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
        alert('Document saved successfully to USB drive!');
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return; // User cancelled file picker
        console.error('File Picker Error:', err);
      }
    }

    // 2. Fallback for Safari / Firefox: Trigger browser file download
    const blob = new Blob([content], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 📂 Open file directly from USB Drive
  const handleOpenFromUSB = async (e?: React.ChangeEvent<HTMLInputElement>) => {
    // 1. Native Modern File Picker (Chrome, Edge)
    if (!e && 'showOpenFilePicker' in window) {
      try {
        // @ts-ignore
        const [handle] = await window.showOpenFilePicker({
          types: [
            {
              description: 'Documents',
              accept: {
                'text/html': ['.html', '.htm'],
                'text/plain': ['.txt'],
              },
            },
          ],
          multiple: false,
        });
        const file = await handle.getFile();
        const text = await file.text();

        // Extract filename as document title
        const fileTitle = file.name.replace(/\.[^/.]+$/, '');
        setTitle(fileTitle);
        setContent(text);
        alert(`Loaded "${file.name}" into editor!`);
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.error('File Open Error:', err);
      }
    }

    // 2. Standard Input Fallback (Firefox / Safari / Fallback Input)
    const file = e?.target?.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const fileTitle = file.name.replace(/\.[^/.]+$/, '');
        setTitle(fileTitle);
        setContent(text);
        alert(`Loaded "${file.name}" into editor!`);
      }
    };
    reader.readAsText(file);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50 p-8 flex items-center justify-center text-slate-500 font-medium">
        Loading document data...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 print:bg-white print:min-h-0 py-8 px-4 sm:px-6 lg:px-8">
      {/* Print Stylesheet Rule */}
      <style jsx global>{`
        @media print {
          header,
          .no-print,
          .print\\:hidden {
            display: none !important;
          }
          body {
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          main {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          input {
            border: none !important;
            padding: 0 !important;
            font-size: 28pt !important;
            font-weight: bold !important;
          }
        }
      `}</style>

      <div className="max-w-5xl mx-auto space-y-6 print:space-y-4 print:p-0 print:m-0">
        
        {/* Top Header Action Bar */}
        <header className="no-print print:hidden flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <button
            onClick={() => router.push('/student/dashboard')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold rounded-xl transition-all active:scale-[0.98]"
          >
            ← Dashboard
          </button>

          {/* USB & Cloud Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Open File Button */}
            <label className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 text-xs font-semibold rounded-xl transition-all cursor-pointer active:scale-[0.98]">
              📂 Open USB File
              <input
                type="file"
                accept=".html,.htm,.txt"
                onChange={handleOpenFromUSB}
                className="hidden"
              />
            </label>

            {/* Save to USB Button */}
            <button
              onClick={handleSaveToUSB}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-all shadow-xs active:scale-[0.98]"
            >
              💾 Save to USB
            </button>

            <span className="text-slate-300 font-light mx-1">|</span>

            {/* Print Button */}
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-all shadow-xs active:scale-[0.98]"
            >
              🖨️ Print
            </button>

            {/* Save to Cloud Button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-all shadow-xs active:scale-[0.98] disabled:opacity-50"
            >
              {saving ? 'Saving...' : '☁️ Save to Cloud'}
            </button>
          </div>
        </header>

        {/* Document Body Area */}
        <main className="bg-white print:bg-white rounded-2xl print:rounded-none border border-slate-200/80 print:border-none p-6 sm:p-10 print:p-0 shadow-xs print:shadow-none space-y-6 print:space-y-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 border-b border-slate-200/80 pb-3 focus:outline-none focus:border-blue-500 print:border-none print:pb-0"
            placeholder="Document Title"
          />

          <Editor content={content} onChange={(html) => setContent(html)} />
        </main>
      </div>
    </div>
  );
}

export default function AssignmentPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 font-medium">Loading page...</div>}>
      <AssignmentPageContent />
    </Suspense>
  );
}
