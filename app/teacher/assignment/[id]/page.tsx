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

interface Stroke {
  points: { x: number; y: number }[];
  color: string;
  width: number;
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

  // Markups state
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<{ x: number; y: number }[]>([]);
  const [textBoxes, setTextBoxes] = useState<TextBoxAnnotation[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

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

  // Handle Freestyle SVG Pen Drawing
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (tool !== 'pen' || !containerRef.current) return;
    setIsDrawing(true);

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCurrentStroke([{ x, y }]);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || tool !== 'pen' || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCurrentStroke((prev) => [...prev, { x, y }]);
  };

  const handleMouseUp = () => {
    if (isDrawing && currentStroke.length > 0) {
      setStrokes((prev) => [
        ...prev,
        { points: currentStroke, color: penColor, width: penWidth },
      ]);
      setCurrentStroke([]);
    }
    setIsDrawing(false);
  };

  // Click to place text box
  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (tool !== 'text' || !containerRef.current) return;
    
    // Ignore clicks inside existing text boxes
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
    setStrokes([]);
    setCurrentStroke([]);
    setTextBoxes([]);
  };

  // Save Evaluation & Flatten Marked-Up PDF
  const handleReturnToStudent = async () => {
    if (!assignmentId) return;
    setSaving(true);

    try {
      const container = containerRef.current;
      if (!container) return;

      // @ts-ignore
      const html2pdf = (await import('html2pdf.js')).default;

      const opt = {
        margin: 0,
        filename: `${title}_MarkedUp.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
      };

      const pdfBlob = await html2pdf().set(opt).from(container).output('blob');
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
      alert('Returned assignment to student.');
      router.push('/teacher/dashboard');
    }

    setSaving(false);
  };

  const pointsToSVGPath = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return '';
    return points.reduce(
      (acc, point, i) =>
        i === 0 ? `M ${point.x} ${point.y}` : `${acc} L ${point.x} ${point.y}`,
      ''
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-300 font-medium">
        Loading Document Viewer...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      
      {/* Fixed Full-Width Control Bar */}
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

        {/* Toolbar */}
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
          disabled={saving}
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

      {/* Full-Screen PDF Workspace Container */}
      <main className="flex-1 w-full bg-slate-950 p-4 sm:p-8 flex justify-center overflow-auto min-h-[calc(100vh-140px)]">
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={handleContainerClick}
          className="relative bg-white shadow-2xl rounded-xl border border-slate-700 overflow-hidden w-full max-w-5xl h-[1200px] select-none"
        >
          {/* Layer 1: PDF Viewer Embed */}
          {pdfUrl ? (
            <iframe
              src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
              className="w-full h-full border-none pointer-events-none"
            />
          ) : (
            <div className="p-12 text-center text-slate-500 font-medium">
              No PDF document found.
            </div>
          )}

          {/* Layer 2: Vector SVG Drawing Overlay */}
          <svg
            className={`absolute top-0 left-0 w-full h-full z-20 pointer-events-none`}
          >
            {strokes.map((stroke, index) => (
              <path
                key={index}
                d={pointsToSVGPath(stroke.points)}
                fill="none"
                stroke={stroke.color}
                strokeWidth={stroke.width}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}

            {currentStroke.length > 0 && (
              <path
                d={pointsToSVGPath(currentStroke)}
                fill="none"
                stroke={penColor}
                strokeWidth={penWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>

          {/* Layer 3: Interactive Floating Text Boxes */}
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
    <Suspense fallback={<div className="p-8 text-center text-slate-300 font-medium bg-slate-900 min-h-screen">Loading Full Page Viewer...</div>}>
      <TeacherPDFCanvasContent />
    </Suspense>
  );
}
