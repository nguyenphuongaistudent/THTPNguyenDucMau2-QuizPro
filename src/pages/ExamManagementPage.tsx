import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/useAuthStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Plus, Search, Clock, ClipboardList, Trash2, Edit2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { formatDuration, cn } from '../lib/utils';

export default function ExamManagementPage() {
  const { user } = useAuthStore();
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchExams = async () => {
    setLoading(true);
    const query = supabase
      .from('exams')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false });
    
    if (user?.role === 'teacher') {
      query.eq('created_by', user.id);
    }

    const { data, error } = await query;
    if (error) toast.error(error.message);
    else setExams(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchExams();
  }, [user]);

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

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input 
          className="pl-10" 
          placeholder="Tìm kiếm đề thi..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full py-20 text-center text-slate-500">Đang tải đề thi...</div>
        ) : filteredExams.length === 0 ? (
          <div className="col-span-full py-20 text-center text-slate-500">Chưa có đề thi nào.</div>
        ) : (
          filteredExams.map((exam) => (
            <Card key={exam.id} className="group relative flex flex-col overflow-hidden">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <span className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                    exam.is_published ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
                  )}>
                    {exam.is_published ? 'Công khai' : 'Nháp'}
                  </span>
                  <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button variant="ghost" size="icon" onClick={() => togglePublish(exam.id, exam.is_published)}>
                      {exam.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50" onClick={() => handleDelete(exam.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardTitle className="line-clamp-1 mt-2 text-lg">{exam.title}</CardTitle>
                <CardDescription className="line-clamp-2">{exam.description || 'Không có mô tả.'}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow space-y-3">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Clock className="h-4 w-4" />
                  Thời gian: {formatDuration(exam.duration)}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <ClipboardList className="h-4 w-4" />
                  Điểm đạt: {exam.pass_score}%
                </div>
              </CardContent>
              <div className="border-t border-slate-100 p-4">
                <Link to={`/exams/edit/${exam.id}`}>
                  <Button variant="outline" className="w-full gap-2">
                    <Edit2 className="h-4 w-4" /> Chỉnh sửa đề thi
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
