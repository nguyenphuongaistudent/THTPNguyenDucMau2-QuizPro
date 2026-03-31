import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/Card';
import { toast } from 'sonner';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isRegister) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role: role,
            },
          },
        });
        if (error) throw error;
        toast.success('Đăng ký thành công! Vui lòng kiểm tra email.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigate('/dashboard');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold text-blue-600">EduQuizPro</CardTitle>
          <CardDescription>
            {isRegister ? 'Tạo tài khoản mới để bắt đầu' : 'Đăng nhập vào hệ thống của bạn'}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleAuth}>
          <CardContent className="space-y-4">
            {isRegister && (
              <>
                <Input
                  label="Họ và tên"
                  placeholder="Nguyễn Văn A"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Bạn là?</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="role"
                        value="student"
                        checked={role === 'student'}
                        onChange={() => setRole('student')}
                      />
                      Học sinh
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="role"
                        value="teacher"
                        checked={role === 'teacher'}
                        onChange={() => setRole('teacher')}
                      />
                      Giáo viên
                    </label>
                  </div>
                </div>
              </>
            )}
            <Input
              label="Email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Mật khẩu"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button className="w-full" loading={loading}>
              {isRegister ? 'Đăng ký' : 'Đăng nhập'}
            </Button>
            <button
              type="button"
              className="text-sm text-blue-600 hover:underline"
              onClick={() => setIsRegister(!isRegister)}
            >
              {isRegister ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký ngay'}
            </button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
