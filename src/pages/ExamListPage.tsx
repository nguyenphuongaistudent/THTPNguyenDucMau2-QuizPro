import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/useAuthStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Clock, ClipboardList, Play, Calendar, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDuration, cn } from '../lib/utils';
import { motion } from 'framer-motion';
import { Skeleton } from '../components/ui/Skeleton';

export default function ExamListPage() {
  const [exams, setExams] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch exams
        let { data: examData, error: examError } = await supabase
          .from('exams')
          .select('*, profiles(full_name)')
          .eq('is_published', true)
          .order('created_at', { ascending: false });
        
        if (examError) {
          // If select '*' fails, try basic columns
          const { data: fallbackExams, error: fallbackError } = await supabase
            .from('exams')
            .select('id, title, description, duration, pass_score, is_published, profiles(full_name)')
            .eq('is_published', true)
            .order('created_at', { ascending: false });
          
          if (fallbackError) throw fallbackError;
          examData = fallbackExams;
        }
        setExams(examData || []);

        // Fetch user attempts if logged in
        if (user?.id) {
          const { data: attemptData, error: attemptError } = await supabase
            .from('attempts')
            .select('exam_id, status')
            .eq('user_id', user.id)
            .in('status', ['completed', 'timed_out', 'abandoned']);
          
          if (attemptError) throw attemptError;
          
          const attemptCounts: Record<string, number> = {};
          attemptData?.forEach(a => {
            attemptCounts[a.exam_id] = (attemptCounts[a.exam_id] || 0) + 1;
          });
          setAttempts(attemptCounts);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const getExamStatus = (exam: any) => {
    const now = new Date();
    const startAt = exam.start_at ? new Date(exam.start_at) : null;
    const endAt = exam.end_at ? new Date(exam.end_at) : null;

    if (startAt && now < startAt) return 'upcoming';
    if (endAt && now > endAt) return 'ended';
    return 'active';
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Danh sách đề thi</h1>
      </div>

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="flex flex-col">
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent className="flex-grow space-y-4">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </CardContent>
              <div className="p-6 pt-0">
                <Skeleton className="h-10 w-full" />
              </div>
            </Card>
          ))}
        </div>
      ) : exams.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center rounded-xl bg-white py-20 shadow-sm"
        >
          <ClipboardList className="mb-4 h-12 w-12 text-slate-200" />
          <p className="text-slate-500">Hiện không có đề thi nào khả dụng.</p>
        </motion.div>
      ) : (
        <motion.div 
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {exams.map((exam) => {
            const status = getExamStatus(exam);
            const userAttempts = attempts[exam.id] || 0;
            const maxAttempts = exam.max_attempts || 1;
            const isOutOfAttempts = userAttempts >= maxAttempts && user?.role === 'student';
            const canStart = status === 'active' && !isOutOfAttempts;

            return (
              <motion.div key={exam.id} variants={itemVariants}>
                <Card className="flex flex-col h-full hover:shadow-md transition-shadow relative overflow-hidden">
                  <div className={cn(
                    "absolute top-0 right-0 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white",
                    status === 'active' ? "bg-green-500" : 
                    status === 'upcoming' ? "bg-blue-500" : "bg-slate-500"
                  )}>
                    {status === 'active' ? 'Đang diễn ra' : 
                     status === 'upcoming' ? 'Sắp diễn ra' : 'Đã kết thúc'}
                  </div>
                  
                  <CardHeader>
                    <CardTitle className="line-clamp-1 text-lg pr-20">{exam.title}</CardTitle>
                    <CardDescription className="line-clamp-2">{exam.description || 'Không có mô tả.'}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Clock className="h-4 w-4" />
                        Thời gian: {formatDuration(exam.duration)}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <ClipboardList className="h-4 w-4" />
                        Điểm đạt: {exam.pass_score}%
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Calendar className="h-4 w-4" />
                        Lượt làm bài: {userAttempts} / {maxAttempts}
                      </div>
                    </div>

                    {(exam.start_at || exam.end_at) && (
                      <div className="rounded-lg bg-slate-50 p-3 text-[11px] text-slate-500 space-y-1">
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

                    <div className="text-xs text-slate-400">
                      Tạo bởi: {exam.profiles?.full_name}
                    </div>
                  </CardContent>
                  <div className="p-6 pt-0">
                    {isOutOfAttempts ? (
                      <div className="flex items-center justify-center gap-2 rounded-lg bg-red-50 p-3 text-xs font-medium text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        Hết lượt làm bài
                      </div>
                    ) : status === 'upcoming' ? (
                      <div className="flex items-center justify-center gap-2 rounded-lg bg-blue-50 p-3 text-xs font-medium text-blue-600">
                        <Calendar className="h-4 w-4" />
                        Chưa đến giờ thi
                      </div>
                    ) : status === 'ended' ? (
                      <div className="flex items-center justify-center gap-2 rounded-lg bg-slate-100 p-3 text-xs font-medium text-slate-500">
                        <Clock className="h-4 w-4" />
                        Đã hết hạn thi
                      </div>
                    ) : (
                      <Link to={`/quiz/${exam.id}`}>
                        <Button className="w-full gap-2">
                          <Play className="h-4 w-4" /> Bắt đầu thi
                        </Button>
                      </Link>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
