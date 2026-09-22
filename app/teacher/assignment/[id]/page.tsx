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
  const [penColor, setPenColor] = useState('#dc2626'); // Red default
  const [penWidth, setPenWidth] = useState(3);
  const [textBoxes, setTextBoxes] = useState<TextBoxAnnotation[]>([]);

  const [loading, setLoading] = useState(true);
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

  // Load and Render PDF Page on Canvas using PDF.js
  useEffect(() => {
    if (!pdfUrl || !pdfCanvasRef.current || !drawCanvasRef.current) return;

    async function renderPDF() {
      try {
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
    }

    renderPDF();
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

  // Click to place text box
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

  // Merge PDF, Ink Layer, and Text Boxes into a Return PDF
  const handleReturnToStudent = async () => {
    if (!assignmentId) return;
    setSaving(true);

    try {
      // 1. Flatten PDF Canvas + Drawing Canvas + Text Boxes into single image
      const pCanvas = pdfCanvasRef.current;
      const dCanvas = drawCanvasRef.current;
      if (!pCanvas || !dCanvas) return;

      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = pCanvas.width;
      exportCanvas.height = pCanvas.height;
      const ctx = exportCanvas.getContext('2d')!;

      // Draw original PDF page
      ctx.drawImage(pCanvas, 0, 0);

      // Draw freestyle red ink
      ctx.drawImage(dCanvas, 0, 0);

      // Draw floating text boxes onto image canvas
      ctx.font = 'bold 14px sans-serif';
      ctx.fillStyle = penColor;

      textBoxes.forEach((box) => {
        ctx.fillStyle = '#fee2e2'; // Light red background box
        ctx.fillRect(box.x, box.y, 200, 40);
        ctx.strokeStyle = '#f87171';
        ctx.strokeRect(box.x, box.y, 200, 40);

        ctx.fillStyle = '#991b1b'; // Dark red text
        ctx.fillText(box.text, box.x + 8, box.y + 24);
      });

      // 2. Convert to PDF Blob
      // @ts-ignore
      const html2pdf = (await import('html2pdf.js')).default;
      const imgData = exportCanvas.toDataURL('image/jpeg', 0.95);

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

      // 3. Upload to Supabase Storage
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

      // 4. Update Database
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
        alert(`Assignment returned with custom PDF markups to ${studentName}!`);
        router.push('/teacher/dashboard');
      }
    } catch (err: any) {
      console.error('Error flattening PDF:', err);
      alert('Failed to process marked-up PDF.');
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center text-slate-500 font-medium">
        Loading PDF editor...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-200/80 pb-20">
      
      {/* Top Header Controls */}
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

        {/* Custom PDF Markup Toolbar */}
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
          disabled={saving}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-2xs transition disabled:opacity-50"
        >
          {saving ? 'Flattening PDF...' : '✉️ Return Marked-Up PDF'}
        </button>
      </header>

      {/* Main Workspace Layout */}
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
            className="relative bg-white shadow-xl rounded-xl overflow-hidden border border-slate-300 select-none"
          >
            {/* Layer 1: PDF Rendered Base */}
            <canvas ref={pdfCanvasRef} className="block" />

            {/* Layer 2: Interactive Freestyle Drawing Layer */}
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

            {/* Layer 3: Floating Text Boxes */}
            {textBoxes.map((box) => (
              <div
                key={box.id}
                style={{ left: `${box.x}px`, top: `${box.y}px` }}
                className="absolute w-52 bg-red-100 border border-red-400 rounded-lg p-2 shadow-md z-20 space-y-1"
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
    <Suspense fallback={<div className="p-8 text-center text-slate-500 font-medium">Loading PDF workspace...</div>}>
      <TeacherPDFCanvasContent />
    </Suspense>
  );
}
