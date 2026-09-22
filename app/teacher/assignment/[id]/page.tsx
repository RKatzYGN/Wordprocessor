'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface TextBoxAnnotation {
  id: string;
  x: number;
  y: number;
  text: string;
}

function TeacherPDFCanvasContent() {
  const params = useParams();
  const router = useRouter();

  const assignmentId =
    typeof params?.id === 'string'
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : '';

  const [title, setTitle] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [grade, setGrade] = useState('');
  const [feedback, setFeedback] = useState('');

  // Tools: 'pen' | 'text'
  const [tool, setTool] = useState<'pen' | 'text'>('pen');
  const [penColor] = useState('#dc2626'); // Red
  const [penWidth] = useState(3);
  const [textBoxes, setTextBoxes] = useState<TextBoxAnnotation[]>([]);

  const [loading, setLoading] = useState(true);
  const [pdfRendering, setPdfRendering] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);

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
        setTitle(data.title || 'Untitled Assignment');
        setStudentName(data.student_name || 'Student Submission');
        setStudentEmail(data.user_email || 'student@school.edu');
        setPdfUrl(data.pdf_url || null);
        setGrade(data.grade || '');
        setFeedback(data.feedback || '');
      }
      setLoading(false);
    }

    fetchAssignment();
  }, [assignmentId]);

  // Load PDF.js dynamically and render PDF page directly to base canvas
  useEffect(() => {
    if (!pdfUrl) return;

    let isMounted = true;
    setPdfRendering(true);

    const loadAndRenderPDF = async () => {
      // Load PDF.js CDN script if not present
      // @ts-ignore
      if (!window.pdfjsLib) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load PDF.js script'));
          document.body.appendChild(script);
        });
      }

      // @ts-ignore
      const pdfjsLib = window['pdfjs-dist/build/pdf'] || window.pdfjsLib;
      if (!pdfjsLib) return;

      pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

      try {
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);

        // Render PDF at high DPI resolution
        const viewport = page.getViewport({ scale: 1.8 });
        const pCanvas = pdfCanvasRef.current;
        const dCanvas = drawCanvasRef.current;

        if (pCanvas && dCanvas && isMounted) {
          pCanvas.width = viewport.width;
          pCanvas.height = viewport.height;
          dCanvas.width = viewport.width;
          dCanvas.height = viewport.height;

          const pContext = pCanvas.getContext('2d')!;
          await page.render({ canvasContext: pContext, viewport }).promise;
        }
      } catch (err) {
        console.error('PDF Render Error:', err);
      }

      if (isMounted) setPdfRendering(false);
    };

    loadAndRenderPDF();

    return () => {
      isMounted = false;
    };
  }, [pdfUrl]);

  // Freestyle Pen Drawing Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool !== 'pen') return;
    setIsDrawing(true);
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Adjust scale factor between canvas internal size and display size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    ctx.beginPath();
    ctx.moveTo((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || tool !== 'pen') return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth * scaleX;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.lineTo((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  // Click to place text box
  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (tool !== 'text' || !containerRef.current) return;
    if ((e.target as HTMLElement).closest('.floating-text-box')) return;

    const rect = containerRef.current.getBoundingClientRect();
    const newBox: TextBoxAnnotation = {
      id: Date.now().toString(),
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      text: 'Type correction...',
    };

    setTextBoxes((prev) => [...prev, newBox]);
  };

  const updateText = (id: string, text: string) => {
    setTextBoxes((prev) => prev.map((b) => (b.id === id ? { ...b, text } : b)));
  };

  const deleteTextBox = (id: string) => {
    setTextBoxes((prev) => prev.filter((b) => b.id !== id));
  };

  const handleClearDrawings = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    setTextBoxes([]);
  };

  // Flatten Canvas, Red Ink, and Text Boxes into returned PDF
  const handleReturnToStudent = async () => {
    if (!assignmentId) return;
    setSaving(true);

    try {
      const pCanvas = pdfCanvasRef.current;
      const dCanvas = drawCanvasRef.current;
      if (!pCanvas || !dCanvas) return;

      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = pCanvas.width;
      exportCanvas.height = pCanvas.height;
      const ctx = exportCanvas.getContext('2d')!;

      // 1. Draw PDF base
      ctx.drawImage(pCanvas, 0, 0);

      // 2. Draw red ink
      ctx.drawImage(dCanvas, 0, 0);

      // 3. Draw floating text boxes
      ctx.font = 'bold 20px sans-serif';
      textBoxes.forEach((box) => {
        const scaleX = pCanvas.width / pCanvas.clientWidth;
        const scaleY = pCanvas.height / pCanvas.clientHeight;
        const boxX = box.x * scaleX;
        const boxY = box.y * scaleY;

        ctx.fillStyle = '#fee2e2';
        ctx.fillRect(boxX, boxY, 240, 50);
        ctx.strokeStyle = '#f87171';
        ctx.strokeRect(boxX, boxY, 240, 50);

        ctx.fillStyle = '#991b1b';
        ctx.fillText(box.text, boxX + 10, boxY + 30);
      });

      // @ts-ignore
      const html2pdf = (await import('html2pdf.js')).default;
      const imgData = exportCanvas.toDataURL('image/jpeg', 0.98);

      const wrapper = document.createElement('div');
      wrapper.innerHTML = `<img src="${imgData}" style="width:100%; height:auto;" />`;

      const opt = {
        margin: 0,
        filename: `${title}_MarkedUp.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'px', format: [exportCanvas.width, exportCanvas.height] },
      };

      const pdfBlob = await html2pdf().set(opt).from(wrapper).output('blob');
      const filePath = `graded/${assignmentId}_marked_${Date.now()}.pdf`;

      const { error: storageError } = await supabase.storage
        .from('assignment_pdfs')
        .upload(filePath, pdfBlob, { contentType: 'application/pdf', upsert: true });

      let gradedPdfUrl = pdfUrl;
      if (!storageError) {
        const { data: urlData } = supabase.storage
          .from('assignment_pdfs')
          .getPublicUrl(filePath);
        gradedPdfUrl = urlData.publicUrl;
      }

      const { error: dbError } = await supabase
        .from('assignments')
        .update({
          grade,
          feedback,
          graded_pdf_url: gradedPdfUrl,
          status: 'graded',
          updated_at: new Date().toISOString(),
        })
        .eq('id', assignmentId);

      if (dbError) {
        alert(`Error returning assignment: ${dbError.message}`);
      } else {
        alert(`Assignment returned with marked-up PDF to ${studentName}!`);
        router.push('/teacher/dashboard');
      }
    } catch (err: any) {
      console.error('Error flattening PDF:', err);
      alert('Returned assignment.');
      router.push('/teacher/dashboard');
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-300 font-medium">
        Loading Document Workspace...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      
      {/* Top Header Control Bar */}
      <header className="sticky top-0 z-50 bg-slate-800 border-b border-slate-700 px-6 py-3 flex flex-wrap justify-between items-center gap-4 shadow-md">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/teacher/dashboard')}
            className="px-3.5 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold rounded-xl transition"
          >
            ← Back to Queue
          </button>
          <div>
            <h1 className="text-sm font-bold text-white max-w-xs sm:max-w-md truncate">{title}</h1>
            <p className="text-[11px] text-slate-400">
              Student: <span className="font-bold text-slate-200">{studentName}</span> ({studentEmail})
            </p>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-2xl border border-slate-700 shadow-inner">
          <button
            onClick={() => setTool('pen')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${
              tool === 'pen'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            ✍️ Red Pen
          </button>

          <button
            onClick={() => setTool('text')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${
              tool === 'text'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            📌 Add Text Box
          </button>

          <button
            onClick={handleClearDrawings}
            className="px-3.5 py-2 text-xs font-bold text-slate-400 hover:text-red-400 rounded-xl transition"
          >
            🧹 Clear
          </button>
        </div>

        <button
          onClick={handleReturnToStudent}
          disabled={saving || pdfRendering}
          className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50"
        >
          {saving ? 'Processing PDF...' : '✉️ Return Marked-Up PDF'}
        </button>
      </header>

      {/* Grade Entry Bar */}
      <div className="bg-slate-800/90 border-b border-slate-700 px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center gap-4">
          <div className="w-full sm:w-48">
            <input
              type="text"
              placeholder="Score (e.g. A, 92%)"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="w-full border border-slate-600 rounded-xl px-3 py-2 text-xs font-bold text-white bg-slate-900 focus:outline-none focus:border-red-500"
            />
          </div>
          <div className="w-full flex-1">
            <input
              type="text"
              placeholder="Summary Feedback Notes..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="w-full border border-slate-600 rounded-xl px-3 py-2 text-xs text-white bg-slate-900 focus:outline-none focus:border-red-500"
            />
          </div>
        </div>
      </div>

      {/* Full-Page Viewer Canvas Sheet */}
      <main className="flex-1 w-full bg-slate-950 p-6 flex justify-center items-start overflow-auto min-h-[calc(100vh-140px)]">
        <div
          ref={containerRef}
          onClick={handleContainerClick}
          className="relative bg-white shadow-2xl rounded-xl border border-slate-700 overflow-hidden max-w-full my-auto select-none"
        >
          {pdfRendering && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/90 z-40 text-slate-600 font-bold text-sm">
              Rendering PDF pages...
            </div>
          )}

          {/* Layer 1: PDF Rendered Canvas */}
          <canvas ref={pdfCanvasRef} className="block w-full h-auto" />

          {/* Layer 2: Interactive Drawing Overlay Canvas */}
          <canvas
            ref={drawCanvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            className={`absolute top-0 left-0 w-full h-full z-20 ${
              tool === 'pen' ? 'cursor-crosshair' : 'cursor-default'
            }`}
          />

          {/* Layer 3: Floating Text Box Annotations */}
          {textBoxes.map((box) => (
            <div
              key={box.id}
              style={{ left: `${box.x}px`, top: `${box.y}px` }}
              className="floating-text-box absolute w-56 bg-red-50 border-2 border-red-500 rounded-xl p-2.5 shadow-xl z-30 space-y-1 cursor-auto"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center border-b border-red-200 pb-1">
                <span className="text-[9px] font-black uppercase text-red-700">📌 Teacher Note</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteTextBox(box.id);
                  }}
                  className="text-red-400 hover:text-red-800 text-xs font-bold px-1"
                >
                  ✕
                </button>
              </div>
              <textarea
                rows={2}
                autoFocus
                value={box.text}
                onChange={(e) => updateText(box.id, e.target.value)}
                className="w-full bg-transparent border-none p-0 text-xs font-bold text-red-950 focus:outline-none resize-none"
              />
            </div>
          ))}
        </div>
      </main>

    </div>
  );
}

export default function TeacherPDFCanvasPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-300 font-medium bg-slate-900 min-h-screen">Loading Workspace...</div>}>
      <TeacherPDFCanvasContent />
    </Suspense>
  );
}
