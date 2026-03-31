import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { Button } from './ui/Button';
import { 
  LayoutDashboard, 
  BookOpen, 
  ClipboardList, 
  Users, 
  LogOut, 
  Menu, 
  X,
  Settings,
  BarChart3
} from 'lucide-react';
import { cn } from '../lib/utils';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, signOut } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'teacher', 'student'] },
    { name: 'Kỳ thi', href: '/exams', icon: ClipboardList, roles: ['admin', 'teacher', 'student'] },
    { name: 'Quản lý đề thi', href: '/exams/manage', icon: Settings, roles: ['admin', 'teacher'] },
    { name: 'Ngân hàng câu hỏi', href: '/questions', icon: BookOpen, roles: ['admin', 'teacher'] },
    { name: 'Thống kê', href: '/reports', icon: BarChart3, roles: ['admin', 'teacher'] },
    { name: 'Kết quả của tôi', href: '/results', icon: BarChart3, roles: ['student'] },
    { name: 'Quản lý người dùng', href: '/users', icon: Users, roles: ['admin'] },
  ];

  const filteredNavigation = navigation.filter(item => user && item.roles.includes(user.role));

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar for desktop */}
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 border-r border-slate-200 bg-white lg:block">
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center border-b border-slate-100 px-6">
            <Link to="/dashboard" className="text-xl font-bold text-blue-600">EduQuizPro</Link>
          </div>
          <nav className="flex-1 space-y-1 px-4 py-6">
            {filteredNavigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  location.pathname === item.href
                    ? "bg-blue-50 text-blue-600"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <item.icon className={cn(
                  "mr-3 h-5 w-5 shrink-0",
                  location.pathname === item.href ? "text-blue-600" : "text-slate-400 group-hover:text-slate-500"
                )} />
                {item.name}
              </Link>
            ))}
          </nav>
          <div className="border-t border-slate-100 p-4 space-y-4">
            <div className="flex items-center gap-3 px-2">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                {user?.full_name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium text-slate-900">{user?.full_name}</p>
                <p className="truncate text-xs text-slate-500 capitalize">{user?.role}</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors" 
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              <span>Đăng xuất</span>
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white lg:hidden">
        <div className="flex h-16 items-center justify-between px-4">
          <Link to="/dashboard" className="text-xl font-bold text-blue-600">EduQuizPro</Link>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="rounded-md p-2 text-slate-600 hover:bg-slate-100"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </header>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="fixed inset-y-0 left-0 w-64 bg-white" onClick={e => e.stopPropagation()}>
            <div className="flex h-16 items-center border-b border-slate-100 px-6">
              <span className="text-xl font-bold text-blue-600">EduQuizPro</span>
            </div>
            <nav className="space-y-1 px-4 py-6">
              {filteredNavigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    location.pathname === item.href
                      ? "bg-blue-50 text-blue-600"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <item.icon className="mr-3 h-5 w-5 shrink-0" />
                  {item.name}
                </Link>
              ))}
              <button
                onClick={handleSignOut}
                className="group flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="mr-3 h-5 w-5 shrink-0" />
                Đăng xuất
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
