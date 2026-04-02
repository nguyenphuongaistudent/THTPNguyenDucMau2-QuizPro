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
  const [isSaving, setIsSaving] = useState(false);

  // Anti-cheat state
  const [cheatWarnings, setCheatWarnings] = useState(0);

  const [showExitConfirm, setShowExitConfirm] = useState(false);
  
  const submitQuiz = useCallback(async (status: 'completed' | 'timed_out' | 'abandoned' = 'completed') => {
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

      // 2. Save attempt answers (using upsert with onConflict)
      const attemptAnswersData = Object.entries(answers).map(([qId, aIds]) => ({
        attempt_id: attemptId,
        question_id: qId,
        selected_answer_ids: aIds,
      }));

      if (attemptAnswersData.length > 0) {
        await supabase.from('attempt_answers').upsert(attemptAnswersData, {
          onConflict: 'attempt_id,question_id'
        });
      }

      // 3. Update attempt
      await supabase.from('attempts').update({
        end_time: new Date().toISOString(),
        score,
        status,
      }).eq('id', attemptId);

      if (status === 'abandoned') {
        toast.info('Bạn đã thoát bài thi. Kết quả đã được lưu.');
        navigate('/exams');
      } else {
        toast.success('Nộp bài thành công!');
        navigate(`/results/${attemptId}`);
      }
    } catch (error: any) {
      toast.error('Lỗi khi nộp bài: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  }, [attemptId, questions, answers, navigate, isSubmitting]);

  useEffect(() => {
    const startQuiz = async () => {
      if (!user || !examId) {
        console.warn('QuizPage: user or examId is missing', { user, examId });
        return;
      }

      const cleanExamId = examId.trim();
      console.log('QuizPage: Starting quiz fetch for', cleanExamId, 'User:', user.id, 'Role:', user.role);

      try {
        // 1. Fetch exam
        let { data: examData, error: examError } = await supabase
          .from('exams')
          .select('*')
          .eq('id', cleanExamId)
          .single();
        
        if (examError) {
          // If select '*' fails, try basic columns
          const { data: fallbackExam, error: fallbackError } = await supabase
            .from('exams')
            .select('id, title, description, duration, pass_score, is_published')
            .eq('id', cleanExamId)
            .single();
          
          if (fallbackError) throw fallbackError;
          examData = fallbackExam;
        }
        
        const now = new Date();
        const startAt = examData.start_at ? new Date(examData.start_at) : null;
        const endAt = examData.end_at ? new Date(examData.end_at) : null;

        if (user.role === 'student') {
          if (!examData.is_published) {
            toast.error('Đề thi này hiện đang đóng hoặc chưa được công khai.');
            navigate('/exams');
            return;
          }

          if (startAt && now < startAt) {
            toast.error(`Đề thi chưa bắt đầu. Thời gian bắt đầu: ${startAt.toLocaleString()}`);
            navigate('/exams');
            return;
          }

          if (endAt && now > endAt) {
            toast.error('Đề thi đã kết thúc.');
            navigate('/exams');
            return;
          }
        }

        setExam(examData);
        setTimeLeft(examData.duration * 60);

        // 2. Fetch questions
        console.log('Fetching questions for exam:', cleanExamId);
        const { data: qData, error: qError } = await supabase
          .from('exam_questions')
          .select(`
            order_index,
            questions (
              id,
              content,
              type,
              answers (
                id,
                content
              )
            )
          `)
          .eq('exam_id', cleanExamId)
          .order('order_index');
        
        if (qError) {
          console.error('Error fetching exam_questions:', qError);
          toast.error('Lỗi truy vấn: ' + qError.message);
          setLoading(false);
          return;
        }
        
        console.log('Raw qData from Supabase:', qData);

        if (!qData || qData.length === 0) {
          console.warn('No questions linked to this exam.');
          setQuestions([]);
          setLoading(false);
          return;
        }

        // Robust formatting to handle potential RLS nulls
        const formattedQs = qData
          .map((item: any) => {
            // Handle both object and array formats from Supabase joins
            const q = Array.isArray(item.questions) ? item.questions[0] : item.questions;
            
            if (!q) {
              console.error('Question data is NULL for exam_question record. This is a clear RLS issue on "questions" table.', item);
              return null;
            }

            return {
              id: q.id,
              content: q.content,
              type: q.type,
              answers: Array.isArray(q.answers) ? q.answers : (q.answers ? [q.answers] : []),
            };
          })
          .filter(Boolean);
        
        console.log('Final formatted questions:', formattedQs);
        
        if (formattedQs.length === 0 && qData.length > 0) {
          console.error('CRITICAL: RLS is blocking access to question details.');
          toast.error('Lỗi bảo mật (RLS): Bạn không có quyền xem chi tiết câu hỏi. Hãy chạy lại lệnh SQL cấp quyền SELECT.');
        }
        
        setQuestions(formattedQs);

        // 3. Check for existing in_progress attempt
        const { data: existingAttempt } = await supabase
          .from('attempts')
          .select('*')
          .eq('user_id', user.id)
          .eq('exam_id', cleanExamId)
          .eq('status', 'in_progress')
          .maybeSingle();

        if (existingAttempt) {
          setAttemptId(existingAttempt.id);
          // Optionally fetch existing answers if we want to resume
          const { data: existingAnswers } = await supabase
            .from('attempt_answers')
            .select('*')
            .eq('attempt_id', existingAttempt.id);
          
          if (existingAnswers) {
            const answersMap: Record<string, string[]> = {};
            existingAnswers.forEach((a: any) => {
              answersMap[a.question_id] = a.selected_answer_ids;
            });
            setAnswers(answersMap);
          }
        } else {
          // Check for max attempts
          const { count } = await supabase
            .from('attempts')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('exam_id', cleanExamId)
            .in('status', ['completed', 'timed_out', 'abandoned']);

          if (user.role === 'student' && count !== null && count >= (examData.max_attempts || 1)) {
            toast.error('Bạn đã hết lượt làm bài cho đề thi này.');
            navigate('/exams');
            return;
          }

          // Create new attempt
          const { data: attempt, error: attemptError } = await supabase
            .from('attempts')
            .insert({
              user_id: user.id,
              exam_id: cleanExamId,
              status: 'in_progress',
            })
            .select()
            .single();
          
          if (attemptError) throw attemptError;
          setAttemptId(attempt.id);
        }

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

  const handleAnswerSelect = async (qId: string, aId: string) => {
    const qType = questions.find(q => q.id === qId)?.type;
    let newSelected: string[] = [];

    setAnswers(prev => {
      const current = prev[qId] || [];
      if (qType === 'single' || qType === 'boolean') {
        newSelected = [aId];
      } else {
        if (current.includes(aId)) {
          newSelected = current.filter(id => id !== aId);
        } else {
          newSelected = [...current, aId];
        }
      }
      return { ...prev, [qId]: newSelected };
    });

    // Auto-save to DB
    if (attemptId) {
      setIsSaving(true);
      try {
        await supabase.from('attempt_answers').upsert({
          attempt_id: attemptId,
          question_id: qId,
          selected_answer_ids: newSelected
        }, {
          onConflict: 'attempt_id,question_id'
        });
      } catch (err) {
        console.error('Auto-save failed:', err);
      } finally {
        setIsSaving(false);
      }
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center">Đang tải đề thi...</div>;
  if (questions.length === 0 && !loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 p-4 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-500" />
        <h2 className="text-xl font-bold text-slate-900">Không có câu hỏi nào</h2>
        <p className="max-w-md text-slate-600">
          Đề thi này hiện chưa có câu hỏi hoặc bạn không có quyền truy cập. 
          Nếu bạn là giáo viên, hãy đảm bảo đã thêm câu hỏi vào đề thi và kiểm tra cấu hình RLS trên Supabase.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => window.location.reload()}>Thử lại</Button>
          <Button onClick={() => navigate('/exams')}>Quay lại danh sách</Button>
        </div>
      </div>
    );
  }

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
            {isSaving && <span className="text-xs text-slate-400 animate-pulse">Đang lưu...</span>}
            <Button variant="outline" size="sm" onClick={() => setShowExitConfirm(true)}>
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

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="mb-2 text-lg font-bold text-slate-900">Bạn muốn thoát bài thi?</h3>
            <p className="mb-6 text-slate-600">
              Nếu thoát bây giờ, bài thi của bạn sẽ được nộp với các câu trả lời hiện tại. Bạn không thể quay lại làm tiếp.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowExitConfirm(false)}
              >
                Tiếp tục thi
              </Button>
              <Button
                variant="primary"
                className="flex-1 bg-red-600 hover:bg-red-700 border-red-600"
                onClick={() => {
                  setShowExitConfirm(false);
                  submitQuiz('abandoned');
                }}
              >
                Xác nhận thoát
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
