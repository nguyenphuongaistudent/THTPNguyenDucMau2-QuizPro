import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Plus, BookOpen, Users, ClipboardList } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Skeleton } from '../components/ui/Skeleton';
import { toast } from 'sonner';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    exams: 0,
    questions: 0,
    attempts: 0,
    students: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.id) return;
      setLoading(true);

      try {
        if (user.role === 'student') {
          const { count: attemptCount, error: attemptError } = await supabase
            .from('attempts')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);
          
          if (attemptError) throw attemptError;

          const { count: examCount, error: examError } = await supabase
            .from('exams')
            .select('*', { count: 'exact', head: true })
            .eq('is_published', true);

          if (examError) throw examError;

          setStats(prev => ({ ...prev, attempts: attemptCount || 0, exams: examCount || 0 }));
        } else {
          let examQuery = supabase
            .from('exams')
            .select('*', { count: 'exact', head: true });
          
          if (user.role === 'teacher') {
            examQuery = examQuery.eq('created_by', user.id);
          }
          
          const { count: examCount, error: examError } = await examQuery;
          if (examError) throw examError;
          
          let questionQuery = supabase
            .from('questions')
            .select('*', { count: 'exact', head: true });

          if (user.role === 'teacher') {
            questionQuery = questionQuery.eq('created_by', user.id);
          }

          const { count: questionCount, error: questionError } = await questionQuery;
          if (questionError) throw questionError;
          
          const { count: studentCount, error: studentError } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'student');

          if (studentError) throw studentError;

          setStats(prev => ({ ...prev, exams: examCount || 0, questions: questionCount || 0, students: studentCount || 0 }));
        }
      } catch (error: any) {
        console.error('Error fetching stats:', error);
        toast.error('Không thể tải thông tin thống kê');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      className="space-y-8"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Chào mừng trở lại, {user?.full_name || 'Người dùng'}!
          </h2>
          <div className="flex flex-wrap gap-2 text-sm text-slate-500">
            {user?.role === 'student' && (
              <>
                {user.school && <span>Trường: <span className="font-medium text-slate-700">{user.school}</span></span>}
                {user.class && <span>Lớp: <span className="font-medium text-slate-700">{user.class}</span></span>}
              </>
            )}
            {!user?.school && !user?.class && <p>Đây là những gì đang diễn ra trong hệ thống của bạn.</p>}
          </div>
        </div>
        {user?.role !== 'student' && (
          <Link to="/exams/create">
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Tạo đề thi
            </Button>
          </Link>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-12 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Đề thi</CardTitle>
                  <ClipboardList className="h-4 w-4 text-slate-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.exams}</div>
                  <p className="text-xs text-slate-500">Đề thi hiện có</p>
                </CardContent>
              </Card>
            </motion.div>
            
            {user?.role !== 'student' ? (
              <>
                <motion.div variants={itemVariants}>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Câu hỏi</CardTitle>
                      <BookOpen className="h-4 w-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.questions}</div>
                      <p className="text-xs text-slate-500">Trong ngân hàng</p>
                    </CardContent>
                  </Card>
                </motion.div>
                <motion.div variants={itemVariants}>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Học sinh</CardTitle>
                      <Users className="h-4 w-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.students}</div>
                      <p className="text-xs text-slate-500">Đã tham gia</p>
                    </CardContent>
                  </Card>
                </motion.div>
              </>
            ) : (
              <motion.div variants={itemVariants}>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Lượt thi</CardTitle>
                    <Plus className="h-4 w-4 text-slate-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.attempts}</div>
                    <p className="text-xs text-slate-500">Đã hoàn thành</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </>
        )}
      </div>

      {/* Quick Actions / Recent Activity */}
      <div className="mt-12 grid gap-8 lg:grid-cols-2">
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Hành động nhanh</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              {user?.role === 'student' ? (
                <>
                  <Link to="/exams">
                    <Button variant="outline" className="w-full justify-start gap-3">
                      <ClipboardList className="h-5 w-5 text-blue-500" />
                      Xem danh sách đề thi
                    </Button>
                  </Link>
                  <Link to="/results">
                    <Button variant="outline" className="w-full justify-start gap-3">
                      <BookOpen className="h-5 w-5 text-green-500" />
                      Xem kết quả học tập
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/questions">
                    <Button variant="outline" className="w-full justify-start gap-3">
                      <BookOpen className="h-5 w-5 text-blue-500" />
                      Quản lý ngân hàng câu hỏi
                    </Button>
                  </Link>
                  <Link to="/exams/manage">
                    <Button variant="outline" className="w-full justify-start gap-3">
                      <ClipboardList className="h-5 w-5 text-purple-500" />
                      Quản lý đề thi
                    </Button>
                  </Link>
                  <Link to="/reports">
                    <Button variant="outline" className="w-full justify-start gap-3">
                      <Users className="h-5 w-5 text-orange-500" />
                      Thống kê & Báo cáo
                    </Button>
                  </Link>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Thông báo mới nhất</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                <p className="text-sm italic">Chưa có thông báo mới nào.</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
