import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/useAuthStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../components/ui/Card';
import { Plus, Search, Filter, Trash2, Edit2, CheckCircle2, XCircle, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { LatexRenderer } from '../components/LatexRenderer';

export default function QuestionBankPage() {
  const { user } = useAuthStore();
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [type, setType] = useState<'single' | 'multiple' | 'boolean'>('single');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [answers, setAnswers] = useState<{ content: string; is_correct: boolean }[]>([
    { content: '', is_correct: false },
    { content: '', is_correct: false },
  ]);

  const fetchQuestions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('questions')
      .select('*, answers(*)')
      .order('created_at', { ascending: false });
    
    if (error) toast.error(error.message);
    else setQuestions(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (answers.filter(a => a.is_correct).length === 0) {
      toast.error('Vui lòng chọn ít nhất một đáp án đúng');
      return;
    }

    try {
      if (editingId) {
        // Update logic
        const { error: qError } = await supabase
          .from('questions')
          .update({ content, type, difficulty })
          .eq('id', editingId);
        if (qError) throw qError;

        // Delete old answers and insert new ones (simplified)
        await supabase.from('answers').delete().eq('question_id', editingId);
        const { error: aError } = await supabase
          .from('answers')
          .insert(answers.map(a => ({ ...a, question_id: editingId })));
        if (aError) throw aError;

        toast.success('Cập nhật câu hỏi thành công');
      } else {
        // Create logic
        const { data: qData, error: qError } = await supabase
          .from('questions')
          .insert({ content, type, difficulty, created_by: user?.id })
          .select()
          .single();
        if (qError) throw qError;

        const { error: aError } = await supabase
          .from('answers')
          .insert(answers.map(a => ({ ...a, question_id: qData.id })));
        if (aError) throw aError;

        toast.success('Thêm câu hỏi thành công');
      }
      setIsModalOpen(false);
      resetForm();
      fetchQuestions();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setContent('');
    setType('single');
    setDifficulty('easy');
    setAnswers([{ content: '', is_correct: false }, { content: '', is_correct: false }]);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa câu hỏi này?')) return;
    const { error } = await supabase.from('questions').delete().eq('id', id);
    if (error) toast.error(error.message);
    else {
      toast.success('Đã xóa câu hỏi');
      fetchQuestions();
    }
  };

  const handleEdit = (q: any) => {
    setEditingId(q.id);
    setContent(q.content);
    setType(q.type);
    setDifficulty(q.difficulty);
    setAnswers(q.answers.map((a: any) => ({ content: a.content, is_correct: a.is_correct })));
    setIsModalOpen(true);
  };

  const filteredQuestions = questions.filter(q => 
    q.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Ngân hàng câu hỏi</h1>
        <Button onClick={() => { resetForm(); setIsModalOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Thêm câu hỏi
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input 
            className="pl-10" 
            placeholder="Tìm kiếm câu hỏi..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" /> Lọc
        </Button>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="py-20 text-center text-slate-500">Đang tải câu hỏi...</div>
        ) : filteredQuestions.length === 0 ? (
          <div className="py-20 text-center text-slate-500">Không tìm thấy câu hỏi nào.</div>
        ) : (
          filteredQuestions.map((q) => (
            <Card key={q.id} className="group overflow-hidden transition-all hover:shadow-md">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <span className={cn(
                        "rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                        q.difficulty === 'easy' ? "bg-green-100 text-green-700" :
                        q.difficulty === 'medium' ? "bg-yellow-100 text-yellow-700" :
                        "bg-red-100 text-red-700"
                      )}>
                        {q.difficulty}
                      </span>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                        {q.type}
                      </span>
                    </div>
                    <div className="text-lg font-medium text-slate-900">
                      <LatexRenderer content={q.content} />
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {q.answers.map((a: any, idx: number) => (
                        <div key={idx} className={cn(
                          "flex items-center gap-2 rounded-md border p-2 text-sm",
                          a.is_correct ? "border-green-200 bg-green-50 text-green-700" : "border-slate-100 bg-slate-50 text-slate-500"
                        )}>
                          {a.is_correct ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
                          <LatexRenderer content={a.content} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(q)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50" onClick={() => handleDelete(q.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modal Thêm/Sửa */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>{editingId ? 'Sửa câu hỏi' : 'Thêm câu hỏi mới'}</CardTitle>
            </CardHeader>
            <form onSubmit={handleSave}>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Loại câu hỏi</label>
                    <select 
                      className="w-full rounded-md border border-slate-200 p-2 text-sm"
                      value={type}
                      onChange={e => setType(e.target.value as any)}
                    >
                      <option value="single">Một đáp án</option>
                      <option value="multiple">Nhiều đáp án</option>
                      <option value="boolean">Đúng/Sai</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Độ khó</label>
                    <select 
                      className="w-full rounded-md border border-slate-200 p-2 text-sm"
                      value={difficulty}
                      onChange={e => setDifficulty(e.target.value as any)}
                    >
                      <option value="easy">Dễ</option>
                      <option value="medium">Trung bình</option>
                      <option value="hard">Khó</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Nội dung câu hỏi</label>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                      <Eye className="h-3 w-3" /> {"Xem trước LaTeX: $x^2$, $\\frac{a}{b}$"}
                    </div>
                  </div>
                  <textarea
                    className="w-full rounded-md border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="Nhập nội dung câu hỏi (hỗ trợ LaTeX)..."
                    required
                  />
                  {content && (
                    <div className="mt-2 rounded-md bg-slate-50 p-3 text-sm border border-dashed border-slate-200">
                      <p className="mb-1 text-[10px] font-bold uppercase text-slate-400">Xem trước:</p>
                      <LatexRenderer content={content} />
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Đáp án</label>
                    {type !== 'boolean' && (
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setAnswers([...answers, { content: '', is_correct: false }])}
                      >
                        Thêm đáp án
                      </Button>
                    )}
                  </div>
                  {answers.map((a, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <input
                        type={type === 'multiple' ? 'checkbox' : 'radio'}
                        name="correct-answer"
                        checked={a.is_correct}
                        onChange={() => {
                          const newAnswers = [...answers];
                          if (type === 'single' || type === 'boolean') {
                            newAnswers.forEach((ans, i) => ans.is_correct = i === idx);
                          } else {
                            newAnswers[idx].is_correct = !newAnswers[idx].is_correct;
                          }
                          setAnswers(newAnswers);
                        }}
                      />
                      <Input
                        placeholder={`Đáp án ${idx + 1}`}
                        value={a.content}
                        onChange={e => {
                          const newAnswers = [...answers];
                          newAnswers[idx].content = e.target.value;
                          setAnswers(newAnswers);
                        }}
                        required
                      />
                      {answers.length > 2 && type !== 'boolean' && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          className="text-red-500"
                          onClick={() => setAnswers(answers.filter((_, i) => i !== idx))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Hủy</Button>
                <Button type="submit">Lưu lại</Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
