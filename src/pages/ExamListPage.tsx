import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/useAuthStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Clock, ClipboardList, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDuration } from '../lib/utils';
import { motion } from 'framer-motion';
import { Skeleton } from '../components/ui/Skeleton';

export default function ExamListPage() {
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const { data, error } = await supabase
          .from('exams')
          .select('*, profiles(full_name)')
          .eq('is_published', true)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setExams(data || []);
      } catch (error) {
        console.error('Error fetching exams:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchExams();
  }, []);

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
        <h1 className="text-2xl font-bold text-slate-900">Kỳ thi đang diễn ra</h1>
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
          <p className="text-slate-500">Hiện không có kỳ thi nào đang mở.</p>
        </motion.div>
      ) : (
        <motion.div 
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {exams.map((exam) => (
            <motion.div key={exam.id} variants={itemVariants}>
              <Card className="flex flex-col h-full hover:shadow-md transition-shadow">
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
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
