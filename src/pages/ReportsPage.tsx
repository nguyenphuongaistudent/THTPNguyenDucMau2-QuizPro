import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/useAuthStore';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, ClipboardList, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '../lib/utils';

export default function ReportsPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [recentAttempts, setRecentAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      
      // Fetch stats based on role
      const { data: attempts } = await supabase
        .from('attempts')
        .select('*, exams(title, pass_score), profiles(full_name)')
        .order('created_at', { ascending: false });

      if (attempts) {
        setRecentAttempts(attempts.slice(0, 10));
        
        const total = attempts.length;
        const passed = attempts.filter(a => a.score >= a.exams.pass_score / 10).length;
        const failed = total - passed;
        
        // Group by exam
        const examStats: Record<string, { name: string, avg: number, count: number }> = {};
        attempts.forEach(a => {
          if (!examStats[a.exam_id]) {
            examStats[a.exam_id] = { name: a.exams.title, avg: 0, count: 0 };
          }
          examStats[a.exam_id].avg += a.score;
          examStats[a.exam_id].count += 1;
        });

        const chartData = Object.values(examStats).map(e => ({
          name: e.name,
          avg: parseFloat((e.avg / e.count).toFixed(1))
        }));

        setStats({
          total,
          passed,
          failed,
          chartData,
          pieData: [
            { name: 'Đạt', value: passed },
            { name: 'Không đạt', value: failed }
          ]
        });
      }
      setLoading(false);
    };

    fetchStats();
  }, []);

  const COLORS = ['#22c55e', '#ef4444'];

  if (loading) return <div className="py-20 text-center">Đang tải báo cáo...</div>;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-900">Thống kê & Báo cáo</h1>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tổng lượt thi</CardTitle>
            <ClipboardList className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Số lượt đạt</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.passed || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Số lượt không đạt</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.failed || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Điểm trung bình theo đề thi</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 10]} />
                <Tooltip />
                <Bar dataKey="avg" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tỷ lệ đạt/không đạt</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats?.pieData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats?.pieData.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Lượt thi gần đây</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500">
                  <th className="pb-3 font-medium">Học sinh</th>
                  <th className="pb-3 font-medium">Đề thi</th>
                  <th className="pb-3 font-medium">Điểm</th>
                  <th className="pb-3 font-medium">Kết quả</th>
                  <th className="pb-3 font-medium">Thời gian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentAttempts.map((a) => {
                  const passed = a.score >= a.exams.pass_score / 10;
                  return (
                    <tr key={a.id}>
                      <td className="py-3 font-medium text-slate-900">{a.profiles?.full_name}</td>
                      <td className="py-3 text-slate-600">{a.exams.title}</td>
                      <td className="py-3 font-bold">{a.score.toFixed(1)}</td>
                      <td className="py-3">
                        <span className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                          passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        )}>
                          {passed ? 'Đạt' : 'Không đạt'}
                        </span>
                      </td>
                      <td className="py-3 text-slate-400">{new Date(a.created_at).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
