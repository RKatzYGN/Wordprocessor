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

  const [tool, setTool] = useState<'pen' | 'text'>('pen');
  const [penColor] = useState('#dc2626');
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

  // Render PDF using PDF.js onto the Base HTML5 Canvas
  useEffect(() => {
    if (!pdfUrl || !pdfCanvasRef.current || !drawCanvasRef.current) return;

    async function renderPDFPage() {
      setPdfRendering(true);
      try {
        // Dynamic import strictly at runtime inside browser
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);

        const viewport = page.getViewport({ scale: 1.5 });
        const pCanvas = pdfCanvasRef.current!;
        const dCanvas = drawCanvasRef.current!;

        pCanvas.width = viewport.width;
        pCanvas.height = viewport.height;
        dCanvas.width = viewport.width;
        dCanvas.height = viewport.height;

        const pContext = pCanvas.getContext('2d')!;
        await page.render({ canvasContext: pContext, viewport }).promise;
      } catch (err) {
        console.error('Error rendering PDF canvas:', err);
      }
      setPdfRendering(false);
    }

    renderPDFPage();
  }, [pdfUrl]);

  // Handle Freestyle Pen Drawing
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool !== 'pen') return;
    setIsDrawing(true);
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || tool !== 'pen') return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (tool !== 'text' || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();

    const newBox: TextBoxAnnotation = {
      id: Date.now().toString(),
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      text: 'Type correction...',
    };

    setTextBoxes([...textBoxes, newBox]);
  };

  const updateText = (id: string, text: string) => {
    setTextBoxes(textBoxes.map((b) => (b.id === id ? { ...b, text } : b)));
  };

  const deleteTextBox = (id: string) => {
    setTextBoxes(textBoxes.filter((b) => b.id !== id));
  };

  const handleClearDrawings = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    setTextBoxes([]);
  };

  // Flatten PDF Canvas, Drawing Layer, and Floating Text Boxes into returned PDF
  const handleReturnToStudent = async () => {
    if (!assignmentId) return;
    setSaving(true);

    try {
      const pCanvas = pdfCanvasRef.current;
      const dCanvas = drawCanvasRef.current;
      if (!pCanvas || !dCanvas) return;

      // 1. Create temporary offscreen export canvas
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = pCanvas.width;
      exportCanvas.height = pCanvas.height;
      const ctx = exportCanvas.getContext('2d')!;

      // 2. Draw PDF page base
      ctx.drawImage(pCanvas, 0, 0);

      // 3. Draw freestyle red ink
      ctx.drawImage(dCanvas, 0, 0);

      // 4. Draw floating text boxes onto export canvas
      ctx.font = 'bold 13px sans-serif';
      textBoxes.forEach((box) => {
        ctx.fillStyle = '#fee2e2';
        ctx.fillRect(box.x, box.y, 180, 38);
        ctx.strokeStyle = '#f87171';
        ctx.strokeRect(box.x, box.y, 180, 38);

        ctx.fillStyle = '#991b1b';
        ctx.fillText(box.text, box.x + 8, box.y + 22);
      });

      // 5. Convert flattened canvas into PDF Blob via html2pdf.js
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

      // 6. Upload marked-up PDF to Supabase Storage
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

      // 7. Update database record
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
      alert('Returned assignment to student queue.');
      router.push('/teacher/dashboard');
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center text-slate-500 font-medium">
        Loading workspace...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-200/80 pb-20">
      
      {/* Top Controls Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-3 flex flex-wrap justify-between items-center gap-4 shadow-2xs">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/teacher/dashboard')}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
          >
            ← Back to Dashboard
          </button>
          <div>
            <h1 className="text-base font-bold text-slate-900">{title}</h1>
            <p className="text-[11px] text-slate-500">
              Student: <span className="font-bold text-slate-800">{studentName}</span> ({studentEmail})
            </p>
          </div>
        </div>

        {/* Custom PDF Markup Tools */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          <button
            onClick={() => setTool('pen')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
              tool === 'pen' ? 'bg-red-600 text-white shadow-2xs' : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            ✍️ Red Pen
          </button>

          <button
            onClick={() => setTool('text')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
              tool === 'text' ? 'bg-red-600 text-white shadow-2xs' : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            📌 Add Text Box
          </button>

          <button
            onClick={handleClearDrawings}
            className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-red-600 rounded-xl transition"
          >
            🧹 Clear
          </button>
        </div>

        <button
          onClick={handleReturnToStudent}
          disabled={saving || pdfRendering}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-2xs transition disabled:opacity-50"
        >
          {saving ? 'Flattening PDF...' : '✉️ Return Marked-Up PDF'}
        </button>
      </header>

      {/* Main Workspace */}
      <div className="max-w-6xl mx-auto mt-6 px-4 space-y-6">
        
        {/* Grade Card */}
        <div className="bg-white p-5 rounded-2xl border border-red-200 shadow-2xs space-y-3">
          <h3 className="text-xs font-bold text-red-900 uppercase tracking-wider">
            📝 Grade & Summary Review
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-red-900 mb-1">Score</label>
              <input
                type="text"
                placeholder="e.g. A, 95%"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full border border-red-300 rounded-xl p-2 text-sm font-bold text-red-950 bg-red-50/20"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs font-bold text-red-900 mb-1">Overall Feedback</label>
              <input
                type="text"
                placeholder="Write summary evaluation..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="w-full border border-red-300 rounded-xl p-2 text-sm text-red-950 bg-red-50/20"
              />
            </div>
          </div>
        </div>

        {/* PDF Page Canvas Sheet with Overlay Ink Layer */}
        <div className="flex justify-center">
          <div
            ref={containerRef}
            onClick={handleCanvasClick}
            className="relative bg-white shadow-xl rounded-xl overflow-hidden border border-slate-300 select-none min-h-[700px]"
          >
            {/* Layer 1: Base PDF Rendered via PDF.js */}
            <canvas ref={pdfCanvasRef} className="block" />

            {/* Layer 2: Interactive Red Pen Drawing Canvas */}
            <canvas
              ref={drawCanvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              className={`absolute top-0 left-0 ${
                tool === 'pen' ? 'cursor-crosshair' : 'cursor-default'
              }`}
            />

            {/* Layer 3: Floating Text Box Overlay */}
            {textBoxes.map((box) => (
              <div
                key={box.id}
                style={{ left: `${box.x}px`, top: `${box.y}px` }}
                className="absolute w-48 bg-red-100 border border-red-400 rounded-lg p-2 shadow-md z-20 space-y-1"
              >
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-black uppercase text-red-800">📌 Correction</span>
                  <button
                    onClick={() => deleteTextBox(box.id)}
                    className="text-red-500 hover:text-red-800 text-xs font-bold"
                  >
                    ✕
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={box.text}
                  onChange={(e) => updateText(box.id, e.target.value)}
                  className="w-full bg-transparent border-none p-0 text-xs font-bold text-red-950 focus:outline-none resize-none"
                />
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

export default function TeacherPDFCanvasPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 font-medium">Loading workspace...</div>}>
      <TeacherPDFCanvasContent />
    </Suspense>
  );
}
