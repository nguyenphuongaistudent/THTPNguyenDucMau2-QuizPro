import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/useAuthStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Plus, Search, Clock, ClipboardList, Trash2, Edit2, Eye, EyeOff, Play } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { formatDuration, cn } from '../lib/utils';

export default function ExamManagementPage() {
  const { user } = useAuthStore();
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');

  const fetchExams = async () => {
    if (!user?.id) return;
    setLoading(true);
    let query = supabase
      .from('exams')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false });
    
    if (user.role === 'teacher') {
      query = query.eq('created_by', user.id);
    }

    if (statusFilter === 'published') {
      query = query.eq('is_published', true);
    } else if (statusFilter === 'draft') {
      query = query.eq('is_published', false);
    }

    let { data, error } = await query;
    if (error) {
      // Fallback to basic columns if select '*' fails
      let fallbackQuery = supabase
        .from('exams')
        .select('id, title, description, duration, pass_score, is_published, profiles(full_name)')
        .order('created_at', { ascending: false });
      
      if (user.role === 'teacher') {
        fallbackQuery = fallbackQuery.eq('created_by', user.id);
      }

      if (statusFilter === 'published') {
        fallbackQuery = fallbackQuery.eq('is_published', true);
      } else if (statusFilter === 'draft') {
        fallbackQuery = fallbackQuery.eq('is_published', false);
      }

      const { data: fallbackData, error: fallbackError } = await fallbackQuery;
      if (fallbackError) toast.error(fallbackError.message);
      else setExams(fallbackData || []);
    } else {
      setExams(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchExams();
  }, [user, statusFilter]);

  const togglePublish = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from('exams')
      .update({ is_published: !current })
      .eq('id', id);
    
    if (error) toast.error(error.message);
    else {
      toast.success(current ? 'Đã gỡ đề thi' : 'Đã công khai đề thi');
      fetchExams();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa đề thi này?')) return;
    const { error } = await supabase.from('exams').delete().eq('id', id);
    if (error) toast.error(error.message);
    else {
      toast.success('Đã xóa đề thi');
      fetchExams();
    }
  };

  const filteredExams = exams.filter(e => 
    e.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Quản lý đề thi</h1>
        <Link to="/exams/create">
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> Tạo đề thi mới
          </Button>
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input 
            className="pl-10" 
            placeholder="Tìm kiếm đề thi..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Trạng thái:</span>
          <select 
            className="rounded-md border border-slate-200 p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
          >
            <option value="all">Tất cả</option>
            <option value="published">Công khai</option>
            <option value="draft">Nháp</option>
          </select>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full py-20 text-center text-slate-500">Đang tải đề thi...</div>
        ) : filteredExams.length === 0 ? (
          <div className="col-span-full py-20 text-center text-slate-500">Chưa có đề thi nào.</div>
        ) : (
          filteredExams.map((exam) => (
            <Card key={exam.id} className="group relative flex flex-col overflow-hidden border-slate-200 transition-all hover:border-blue-200 hover:shadow-md">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <span className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                    exam.is_published ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
                  )}>
                    {exam.is_published ? 'Công khai' : 'Nháp'}
                  </span>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className={cn(
                        "h-8 w-8",
                        exam.is_published ? "text-green-600 hover:bg-green-50" : "text-slate-400 hover:bg-slate-50"
                      )}
                      onClick={() => togglePublish(exam.id, exam.is_published)}
                      title={exam.is_published ? 'Gỡ đề thi' : 'Công khai đề thi'}
                    >
                      {exam.is_published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-red-500 hover:bg-red-50" 
                      onClick={() => handleDelete(exam.id)}
                      title="Xóa đề thi"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardTitle className="line-clamp-1 mt-2 text-lg">{exam.title}</CardTitle>
                <CardDescription className="line-clamp-2 min-h-[40px]">{exam.description || 'Không có mô tả.'}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Clock className="h-3 w-3" />
                    {formatDuration(exam.duration)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <ClipboardList className="h-3 w-3" />
                    Đạt: {exam.pass_score}%
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Play className="h-3 w-3" />
                    Lượt: {exam.max_attempts || 1}
                  </div>
                </div>

                {(exam.start_at || exam.end_at) && (
                  <div className="rounded bg-slate-50 p-2 text-[10px] text-slate-500 space-y-1">
                    {exam.start_at && (
                      <div className="flex justify-between">
                        <span>Bắt đầu:</span>
                        <span className="font-medium text-slate-700">{new Date(exam.start_at).toLocaleString()}</span>
                      </div>
                    )}
                    {exam.end_at && (
                      <div className="flex justify-between">
                        <span>Kết thúc:</span>
                        <span className="font-medium text-slate-700">{new Date(exam.end_at).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
              <div className="grid grid-cols-2 gap-2 border-t border-slate-100 p-4">
                <Link to={`/exams/${exam.id}`}>
                  <Button variant="ghost" className="w-full gap-2">
                    <Eye className="h-4 w-4" /> Xem trước
                  </Button>
                </Link>
                <Link to={`/exams/edit/${exam.id}`}>
                  <Button variant="outline" className="w-full gap-2">
                    <Edit2 className="h-4 w-4" /> Chỉnh sửa
                  </Button>
                </Link>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
