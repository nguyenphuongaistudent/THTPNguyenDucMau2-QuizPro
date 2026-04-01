import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/useAuthStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Search, Plus, Trash2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

export default function ExamEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(60);
  const [passScore, setPassScore] = useState(50);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [allQuestions, setAllQuestions] = useState<any[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      // Fetch all available questions
      const { data: qData } = await supabase.from('questions').select('*').order('created_at', { ascending: false });
      setAllQuestions(qData || []);

      if (id) {
        // Fetch existing exam
        const { data: exam, error: fetchError } = await supabase.from('exams').select('*').eq('id', id).single();
        
        if (fetchError) {
          // If select '*' fails (likely due to missing columns), try fetching basic columns
          const { data: fallbackExam, error: fallbackError } = await supabase
            .from('exams')
            .select('id, title, description, duration, pass_score, is_published')
            .eq('id', id)
            .single();
          
          if (fallbackError) throw fallbackError;
          
          if (fallbackExam) {
            setTitle(fallbackExam.title);
            setDescription(fallbackExam.description);
            setDuration(fallbackExam.duration);
            setPassScore(fallbackExam.pass_score);
            setIsPublished(fallbackExam.is_published);
          }
        } else if (exam) {
          setTitle(exam.title);
          setDescription(exam.description);
          setDuration(exam.duration);
          setPassScore(exam.pass_score);
          setMaxAttempts(exam.max_attempts || 1);
          setStartAt(exam.start_at ? new Date(exam.start_at).toISOString().slice(0, 16) : '');
          setEndAt(exam.end_at ? new Date(exam.end_at).toISOString().slice(0, 16) : '');
          setIsPublished(exam.is_published);
        }

        // Fetch exam questions
        const { data: eqData } = await supabase
          .from('exam_questions')
          .select('question_id, questions(*)')
          .eq('exam_id', id)
          .order('order_index');
        
        if (eqData) {
          setSelectedQuestions(eqData.map(item => item.questions));
        }
      }
    };
    fetchData();
  }, [id]);

  const handleSave = async () => {
    if (!title || selectedQuestions.length === 0) {
      toast.error('Vui lòng nhập tiêu đề và chọn ít nhất một câu hỏi');
      return;
    }

    setLoading(true);
    try {
      let examId = id;
      const fullPayload = { 
        title, 
        description, 
        duration, 
        pass_score: passScore, 
        max_attempts: maxAttempts,
        start_at: startAt || null,
        end_at: endAt || null,
        is_published: isPublished 
      };

      const basicPayload = {
        title,
        description,
        duration,
        pass_score: passScore,
        is_published: isPublished
      };

      if (id) {
        // Update exam
        const { error } = await supabase
          .from('exams')
          .update(fullPayload)
          .eq('id', id);
        
        if (error) {
          // If update fails (likely due to missing columns), try basic update
          const { error: basicError } = await supabase
            .from('exams')
            .update(basicPayload)
            .eq('id', id);
          if (basicError) throw basicError;
        }

        // Clear old questions
        await supabase.from('exam_questions').delete().eq('exam_id', id);
      } else {
        // Create exam
        let { data, error } = await supabase
          .from('exams')
          .insert({ ...fullPayload, created_by: user?.id })
          .select()
          .single();
        
        if (error) {
          // If insert fails (likely due to missing columns), try basic insert
          const { data: basicData, error: basicError } = await supabase
            .from('exams')
            .insert({ ...basicPayload, created_by: user?.id })
            .select()
            .single();
          if (basicError) throw basicError;
          data = basicData;
        }
        examId = data.id;
      }

      // Insert exam questions
      const examQuestions = selectedQuestions.map((q, idx) => ({
        exam_id: examId,
        question_id: q.id,
        order_index: idx,
      }));

      const { error: eqError } = await supabase.from('exam_questions').insert(examQuestions);
      if (eqError) throw eqError;

      toast.success('Lưu đề thi thành công');
      navigate('/exams');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleQuestion = (q: any) => {
    if (selectedQuestions.find(sq => sq.id === q.id)) {
      setSelectedQuestions(selectedQuestions.filter(sq => sq.id !== q.id));
    } else {
      setSelectedQuestions([...selectedQuestions, q]);
    }
  };

  const filteredQuestions = allQuestions.filter(q => 
    q.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/exams')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold text-slate-900">{id ? 'Chỉnh sửa đề thi' : 'Tạo đề thi mới'}</h1>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Exam Info */}
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Thông tin chung</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input label="Tiêu đề đề thi" value={title} onChange={e => setTitle(e.target.value)} required />
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Mô tả</label>
                <textarea 
                  className="w-full rounded-md border border-slate-200 p-2 text-sm"
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Thời gian (phút)" type="number" value={duration} onChange={e => setDuration(parseInt(e.target.value))} />
                <Input label="Điểm đạt (%)" type="number" value={passScore} onChange={e => setPassScore(parseInt(e.target.value))} />
              </div>
              <Input label="Số lượt làm bài tối đa" type="number" value={maxAttempts} onChange={e => setMaxAttempts(parseInt(e.target.value))} min={1} />
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Thời gian bắt đầu</label>
                  <input 
                    type="datetime-local" 
                    className="w-full rounded-md border border-slate-200 p-2 text-sm"
                    value={startAt}
                    onChange={e => setStartAt(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Thời gian kết thúc</label>
                  <input 
                    type="datetime-local" 
                    className="w-full rounded-md border border-slate-200 p-2 text-sm"
                    value={endAt}
                    onChange={e => setEndAt(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50/50 p-3">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Trạng thái công khai</span>
                  <span className="text-xs text-slate-500">Cho phép học sinh thấy đề thi này</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                    isPublished ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
                  )}>
                    {isPublished ? 'Công khai' : 'Nháp'}
                  </span>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="h-8"
                    onClick={() => setIsPublished(!isPublished)}
                  >
                    {isPublished ? 'Gỡ' : 'Bật'}
                  </Button>
                </div>
              </div>
              <Button className="w-full" onClick={handleSave} loading={loading}>
                Lưu đề thi
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Câu hỏi đã chọn ({selectedQuestions.length})</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[400px] overflow-y-auto space-y-2">
              {selectedQuestions.length === 0 ? (
                <p className="text-center text-sm text-slate-500 py-4">Chưa có câu hỏi nào được chọn.</p>
              ) : (
                selectedQuestions.map((q, idx) => (
                  <div key={q.id} className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 p-2 text-xs">
                    <span className="truncate flex-1"><b>{idx + 1}.</b> {q.content}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => toggleQuestion(q)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Question Selector */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg">Ngân hàng câu hỏi</CardTitle>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input 
                  className="pl-10" 
                  placeholder="Tìm câu hỏi..." 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="max-h-[600px] overflow-y-auto space-y-3">
              {filteredQuestions.map(q => {
                const isSelected = selectedQuestions.find(sq => sq.id === q.id);
                return (
                  <div 
                    key={q.id}
                    onClick={() => toggleQuestion(q)}
                    className={cn(
                      "flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-all",
                      isSelected ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500" : "border-slate-100 hover:border-slate-200"
                    )}
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex gap-2">
                        <span className="text-[10px] font-bold uppercase text-slate-400">{q.type}</span>
                        <span className="text-[10px] font-bold uppercase text-slate-400">{q.difficulty}</span>
                      </div>
                      <p className="text-sm font-medium text-slate-700">{q.content}</p>
                    </div>
                    {isSelected ? (
                      <CheckCircle2 className="h-5 w-5 text-blue-500" />
                    ) : (
                      <Plus className="h-5 w-5 text-slate-300" />
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
