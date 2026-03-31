import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/useAuthStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Clock, ClipboardList, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDuration } from '../lib/utils';

export default function ExamListPage() {
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    const fetchExams = async () => {
      const { data, error } = await supabase
        .from('exams')
        .select('*, profiles(full_name)')
        .eq('is_published', true)
        .order('created_at', { ascending: false });
      
      if (error) console.error(error);
      else setExams(data || []);
      setLoading(false);
    };

    fetchExams();
  }, []);

  if (loading) return <div className="py-20 text-center">Đang tải danh sách đề thi...</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Kỳ thi đang diễn ra</h1>
      </div>

        {exams.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl bg-white py-20 shadow-sm">
            <ClipboardList className="mb-4 h-12 w-12 text-slate-200" />
            <p className="text-slate-500">Hiện không có kỳ thi nào đang mở.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {exams.map((exam) => (
              <Card key={exam.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="line-clamp-1 text-lg">{exam.title}</CardTitle>
                  <CardDescription className="line-clamp-2">{exam.description || 'Không có mô tả.'}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow space-y-4">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Clock className="h-4 w-4" />
                    Thời gian: {formatDuration(exam.duration)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <ClipboardList className="h-4 w-4" />
                    Điểm đạt: {exam.pass_score}%
                  </div>
                  <div className="text-xs text-slate-400">
                    Tạo bởi: {exam.profiles?.full_name}
                  </div>
                </CardContent>
                <div className="p-6 pt-0">
                  <Link to={`/quiz/${exam.id}`}>
                    <Button className="w-full gap-2">
                      <Play className="h-4 w-4" /> Bắt đầu thi
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
    </div>
  );
}
