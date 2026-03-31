import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/useAuthStore';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { toast } from 'sonner';
import { Timer, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { LatexRenderer } from '../components/LatexRenderer';

interface Question {
  id: string;
  content: string;
  type: 'single' | 'multiple' | 'boolean';
  answers: {
    id: string;
    content: string;
  }[];
}

export default function QuizPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [exam, setExam] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Anti-cheat state
  const [cheatWarnings, setCheatWarnings] = useState(0);

  const submitQuiz = useCallback(async (status: 'completed' | 'timed_out' = 'completed') => {
    if (!attemptId || isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      // 1. Calculate score (simplified logic for demo)
      // In production, this should be done on the server or via a more secure method
      const { data: correctAnswers } = await supabase
        .from('answers')
        .select('id, question_id, is_correct')
        .in('question_id', questions.map(q => q.id))
        .eq('is_correct', true);

      let correctCount = 0;
      questions.forEach(q => {
        const selected = answers[q.id] || [];
        const correctForQ = correctAnswers?.filter(a => a.question_id === q.id).map(a => a.id) || [];
        
        if (selected.length === correctForQ.length && selected.every(id => correctForQ.includes(id))) {
          correctCount++;
        }
      });

      const score = (correctCount / questions.length) * 10;

      // 2. Save attempt answers
      const attemptAnswersData = Object.entries(answers).map(([qId, aIds]) => ({
        attempt_id: attemptId,
        question_id: qId,
        selected_answer_ids: aIds,
      }));

      await supabase.from('attempt_answers').insert(attemptAnswersData);

      // 3. Update attempt
      await supabase.from('attempts').update({
        end_time: new Date().toISOString(),
        score,
        status,
      }).eq('id', attemptId);

      toast.success('Nộp bài thành công!');
      navigate(`/results/${attemptId}`);
    } catch (error: any) {
      toast.error('Lỗi khi nộp bài: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  }, [attemptId, questions, answers, navigate, isSubmitting]);

  useEffect(() => {
    const startQuiz = async () => {
      if (!user || !examId) return;

      try {
        // 1. Fetch exam
        const { data: examData, error: examError } = await supabase
          .from('exams')
          .select('*')
          .eq('id', examId)
          .single();
        
        if (examError) throw examError;
        
        if (!examData.is_published && user.role === 'student') {
          toast.error('Đề thi này hiện đang đóng hoặc chưa được công khai.');
          navigate('/exams');
          return;
        }

        setExam(examData);
        setTimeLeft(examData.duration * 60);

        // 2. Fetch questions
        const { data: qData, error: qError } = await supabase
          .from('exam_questions')
          .select('questions(*, answers(*))')
          .eq('exam_id', examId)
          .order('order_index');
        
        if (qError) throw qError;
        
        const formattedQs = qData.map((item: any) => ({
          id: item.questions.id,
          content: item.questions.content,
          type: item.questions.type,
          answers: item.questions.answers.map((a: any) => ({ id: a.id, content: a.content })),
        }));
        setQuestions(formattedQs);

        // 3. Create attempt
        const { data: attempt, error: attemptError } = await supabase
          .from('attempts')
          .insert({
            user_id: user.id,
            exam_id: examId,
            status: 'in_progress',
          })
          .select()
          .single();
        
        if (attemptError) throw attemptError;
        setAttemptId(attempt.id);

      } catch (error: any) {
        toast.error(error.message);
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    startQuiz();
  }, [examId, user, navigate]);

  // Timer logic
  useEffect(() => {
    if (timeLeft <= 0 || loading || isSubmitting) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          submitQuiz('timed_out');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, loading, isSubmitting, submitQuiz]);

  // Anti-cheat logic
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setCheatWarnings(prev => {
          const newCount = prev + 1;
          toast.warning(`Cảnh báo: Bạn vừa rời khỏi trang thi! (${newCount}/3)`, {
            icon: <AlertTriangle className="text-yellow-500" />,
          });
          if (newCount >= 3) {
            submitQuiz('completed');
          }
          return newCount;
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [submitQuiz]);

  const handleAnswerSelect = (qId: string, aId: string) => {
    setAnswers(prev => {
      const current = prev[qId] || [];
      const qType = questions.find(q => q.id === qId)?.type;

      if (qType === 'single' || qType === 'boolean') {
        return { ...prev, [qId]: [aId] };
      } else {
        if (current.includes(aId)) {
          return { ...prev, [qId]: current.filter(id => id !== aId) };
        } else {
          return { ...prev, [qId]: [...current, aId] };
        }
      }
    });
  };

  if (loading) return <div className="flex h-screen items-center justify-center">Đang tải đề thi...</div>;

  const currentQ = questions[currentIdx];
  const progress = ((currentIdx + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Quiz Header */}
      <header className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-lg font-bold text-slate-800">{exam?.title}</h1>
            <p className="text-xs text-slate-500">Câu {currentIdx + 1} / {questions.length}</p>
          </div>
          <div className={cn(
            "flex items-center gap-2 rounded-full px-4 py-2 font-mono text-lg font-bold",
            timeLeft < 60 ? "bg-red-100 text-red-600 animate-pulse" : "bg-blue-50 text-blue-600"
          )}>
            <Timer className="h-5 w-5" />
            {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate('/exams')}>
              Thoát
            </Button>
            <Button variant="primary" onClick={() => submitQuiz()} loading={isSubmitting}>
              Nộp bài
            </Button>
          </div>
        </div>
        <div className="h-1 w-full bg-slate-100">
          <div 
            className="h-full bg-blue-500 transition-all duration-300" 
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIdx}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-xl leading-relaxed">
                  <LatexRenderer content={currentQ.content} />
                </CardTitle>
                <div className="flex gap-2">
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 uppercase">
                    {currentQ.type === 'single' ? 'Một đáp án' : currentQ.type === 'multiple' ? 'Nhiều đáp án' : 'Đúng/Sai'}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {currentQ.answers.map((answer) => (
                  <button
                    key={answer.id}
                    onClick={() => handleAnswerSelect(currentQ.id, answer.id)}
                    className={cn(
                      "flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-all",
                      answers[currentQ.id]?.includes(answer.id)
                        ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    )}
                  >
                    <div className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                      answers[currentQ.id]?.includes(answer.id)
                        ? "border-blue-500 bg-blue-500 text-white"
                        : "border-slate-300"
                    )}>
                      {answers[currentQ.id]?.includes(answer.id) && <CheckCircle2 className="h-4 w-4" />}
                    </div>
                    <LatexRenderer content={answer.content} className="text-slate-700" />
                  </button>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-between">
          <Button
            variant="outline"
            disabled={currentIdx === 0}
            onClick={() => setCurrentIdx(prev => prev - 1)}
          >
            Câu trước
          </Button>
          <Button
            variant="primary"
            disabled={currentIdx === questions.length - 1}
            onClick={() => setCurrentIdx(prev => prev + 1)}
          >
            Câu tiếp theo
          </Button>
        </div>

        {/* Question Navigator */}
        <div className="mt-12">
          <h3 className="mb-4 text-sm font-medium text-slate-500">Danh sách câu hỏi</h3>
          <div className="flex flex-wrap gap-2">
            {questions.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIdx(idx)}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-md border text-sm font-medium transition-all",
                  currentIdx === idx ? "border-blue-500 bg-blue-500 text-white" : 
                  answers[questions[idx].id]?.length > 0 ? "border-green-200 bg-green-50 text-green-700" :
                  "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                )}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
