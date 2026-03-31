import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { CheckCircle2, XCircle, Clock, Eye } from 'lucide-react';
import { formatDateTime, cn } from '../lib/utils';
import { Link } from 'react-router-dom';

export default function MyResultsPage() {
  const { user } = useAuthStore();
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAttempts = async () => {
      if (!user) return;
      setLoading(true);
      
      const { data, error } = await supabase
        .from('attempts')
        .select('*, exams(title, pass_score)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) console.error(error);
      else setAttempts(data || []);
      setLoading(false);
    };

    fetchAttempts();
  }, [user]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Kết quả học tập</h1>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="py-20 text-center text-slate-500">Đang tải kết quả...</div>
        ) : attempts.length === 0 ? (
          <Card className="py-20 text-center text-slate-500">
            <CardContent>
              Bạn chưa thực hiện bài thi nào.
              <div className="mt-4">
                <Link to="/exams">
                  <Button>Khám phá đề thi</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          attempts.map((attempt) => {
            const isPassed = attempt.score >= attempt.exams.pass_score / 10;
            return (
              <Card key={attempt.id} className="overflow-hidden transition-all hover:shadow-md">
                <CardContent className="p-0">
                  <div className="flex flex-col sm:flex-row">
                    <div className={cn(
                      "w-2 sm:w-auto sm:min-w-[8px]",
                      isPassed ? "bg-green-500" : "bg-red-500"
                    )} />
                    <div className="flex flex-1 flex-col p-6 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-1">
                        <h3 className="text-lg font-bold text-slate-900">{attempt.exams.title}</h3>
                        <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-4 w-4" />
                            {formatDateTime(attempt.created_at)}
                          </span>
                          <span className="flex items-center gap-1.5">
                            Trạng thái: 
                            <span className={cn(
                              "font-medium",
                              attempt.status === 'completed' ? "text-blue-600" : "text-orange-600"
                            )}>
                              {attempt.status === 'completed' ? 'Hoàn thành' : 'Hết giờ'}
                            </span>
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-4 flex items-center gap-6 sm:mt-0">
                        <div className="text-right">
                          <p className="text-sm text-slate-500">Điểm số</p>
                          <p className={cn(
                            "text-2xl font-bold",
                            isPassed ? "text-green-600" : "text-red-600"
                          )}>
                            {attempt.score.toFixed(1)} / 10
                          </p>
                        </div>
                        <Link to={`/results/${attempt.id}`}>
                          <Button variant="outline" size="sm" className="gap-2">
                            <Eye className="h-4 w-4" /> Chi tiết
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
