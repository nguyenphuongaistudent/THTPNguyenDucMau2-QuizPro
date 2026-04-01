import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { CheckCircle2, XCircle, Trophy, Clock, ArrowLeft } from 'lucide-react';
import { formatDateTime, cn } from '../lib/utils';

export default function ResultPage() {
  const { attemptId } = useParams();
  const [attempt, setAttempt] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResult = async () => {
      if (!attemptId) return;
      
      const { data, error } = await supabase
        .from('attempts')
        .select('*, exams(title, pass_score)')
        .eq('id', attemptId)
        .single();
      
      if (error) console.error(error);
      else setAttempt(data);
      setLoading(false);
    };

    fetchResult();
  }, [attemptId]);

  if (loading) return <div className="flex h-screen items-center justify-center">Đang tải kết quả...</div>;
  if (!attempt) return <div className="flex h-screen items-center justify-center">Không tìm thấy kết quả.</div>;

  const isPassed = attempt.score >= (attempt.exams?.pass_score || 50) / 10;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600">
          <ArrowLeft className="h-4 w-4" /> Quay lại Dashboard
        </Link>
      </div>

      <Card className="overflow-hidden">
          <div className={cn(
            "h-2 w-full",
            isPassed ? "bg-green-500" : "bg-red-500"
          )} />
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
              {isPassed ? (
                <Trophy className="h-10 w-10 text-yellow-500" />
              ) : (
                <XCircle className="h-10 w-10 text-red-500" />
              )}
            </div>
            <CardTitle className="text-2xl font-bold">{attempt.exams?.title || 'Đề thi'}</CardTitle>
            <p className={cn(
              "text-lg font-semibold",
              isPassed ? "text-green-600" : "text-red-600"
            )}>
              {isPassed ? 'CHÚC MỪNG! BẠN ĐÃ VƯỢT QUA' : 'RẤT TIẾC! BẠN CHƯA ĐẠT'}
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-slate-50 p-4 text-center">
                <p className="text-sm text-slate-500">Điểm số</p>
                <p className="text-3xl font-bold text-slate-900">{attempt.score.toFixed(1)} / 10</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4 text-center">
                <p className="text-sm text-slate-500">Trạng thái</p>
                <p className={cn(
                  "text-xl font-bold capitalize",
                  attempt.status === 'completed' ? "text-blue-600" : 
                  attempt.status === 'abandoned' ? "text-red-600" : "text-orange-600"
                )}>
                  {attempt.status === 'completed' ? 'Hoàn thành' : 
                   attempt.status === 'abandoned' ? 'Đã thoát' : 'Hết giờ'}
                </p>
              </div>
            </div>

            <div className="space-y-3 border-t pt-6">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 flex items-center gap-2"><Clock className="h-4 w-4" /> Bắt đầu</span>
                <span className="font-medium text-slate-700">{formatDateTime(attempt.start_time)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 flex items-center gap-2"><Clock className="h-4 w-4" /> Kết thúc</span>
                <span className="font-medium text-slate-700">{formatDateTime(attempt.end_time)}</span>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 bg-slate-50">
            <Link to="/dashboard" className="w-full">
              <Button className="w-full">Về trang chủ</Button>
            </Link>
            <Button variant="outline" className="w-full" onClick={() => window.print()}>
              In kết quả
            </Button>
          </CardFooter>
        </Card>
    </div>
  );
}
