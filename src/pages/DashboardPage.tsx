import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Plus, BookOpen, Users, ClipboardList, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({
    exams: 0,
    questions: 0,
    attempts: 0,
    students: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;

      if (user.role === 'student') {
        const { count: attemptCount } = await supabase
          .from('attempts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        
        const { count: examCount } = await supabase
          .from('exams')
          .select('*', { count: 'exact', head: true })
          .eq('is_published', true);

        setStats(prev => ({ ...prev, attempts: attemptCount || 0, exams: examCount || 0 }));
      } else {
        let examQuery = supabase
          .from('exams')
          .select('*', { count: 'exact', head: true });
        
        if (user.role === 'teacher') {
          examQuery = examQuery.eq('created_by', user.id);
        }
        
        const { count: examCount } = await examQuery;
        
        let questionQuery = supabase
          .from('questions')
          .select('*', { count: 'exact', head: true });

        if (user.role === 'teacher') {
          questionQuery = questionQuery.eq('created_by', user.id);
        }

        const { count: questionCount } = await questionQuery;

        setStats(prev => ({ ...prev, exams: examCount || 0, questions: questionCount || 0 }));
      }
    };

    fetchStats();
  }, [user]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Chào mừng trở lại, {user?.full_name}!</h2>
          <p className="text-slate-500">Đây là những gì đang diễn ra trong hệ thống của bạn.</p>
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
          
          {user?.role !== 'student' ? (
            <>
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
            </>
          ) : (
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
          )}
        </div>

        {/* Quick Actions / Recent Activity */}
        <div className="mt-12 grid gap-8 lg:grid-cols-2">
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
                      <Plus className="h-5 w-5 text-blue-500" />
                      Quản lý ngân hàng câu hỏi
                    </Button>
                  </Link>
                  <Link to="/exams">
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
        </div>
      </div>
    );
}
