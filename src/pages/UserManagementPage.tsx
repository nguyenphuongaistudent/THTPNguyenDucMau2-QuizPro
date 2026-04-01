import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Modal } from '../components/ui/Modal';
import { Search, UserPlus, Shield, User as UserIcon, Trash2, FileUp, Download, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export default function UserManagementPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [addingUser, setAddingUser] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    fullName: '',
    username: '',
    role: 'student',
    school: '',
    className: '',
    dob: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) toast.error(error.message);
    else setUsers(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);
    
    if (error) toast.error(error.message);
    else {
      toast.success('Cập nhật vai trò thành công');
      fetchUsers();
    }
  };

  const confirmDeleteUser = (userId: string) => {
    setUserToDelete(userId);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    setDeleting(true);
    try {
      const { error: rpcError } = await supabase.rpc('delete_user', { user_id: userToDelete });
      
      if (rpcError) throw rpcError;
      
      toast.success('Đã xóa người dùng thành công');
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (error: any) {
      toast.error('Lỗi khi xóa người dùng: ' + error.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;

    setDeleting(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const id of selectedIds) {
        const { error } = await supabase.rpc('delete_user', { user_id: id });
        if (error) failCount++;
        else successCount++;
      }
      
      toast.success(`Đã xóa thành công ${successCount} người dùng. Thất bại: ${failCount}`);
      setSelectedIds([]);
      setIsBulkDeleteModalOpen(false);
      fetchUsers();
    } catch (error: any) {
      toast.error('Lỗi khi xóa người dùng: ' + error.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingUser(true);

    try {
      const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      });

      const { error } = await tempClient.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          data: {
            full_name: newUser.fullName,
            username: newUser.username,
            dob: newUser.dob,
            school: newUser.school,
            class: newUser.className,
            role: newUser.role,
          },
        },
      });

      if (error) throw error;

      toast.success('Thêm người dùng thành công');
      setIsAddUserModalOpen(false);
      setNewUser({
        email: '',
        password: '',
        fullName: '',
        username: '',
        role: 'student',
        school: '',
        className: '',
        dob: ''
      });
      fetchUsers();
    } catch (error: any) {
      toast.error('Lỗi khi thêm người dùng: ' + error.message);
    } finally {
      setAddingUser(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredUsers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredUsers.map(u => u.id));
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        if (data.length === 0) {
          toast.error('File Excel trống');
          setImporting(false);
          return;
        }

        // Create a temporary client to avoid signing out the admin
        const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
          }
        });

        let successCount = 0;
        let failCount = 0;

        const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          
          // Show progress toast every 5 users or at the end
          if (i % 5 === 0 || i === data.length - 1) {
            toast.info(`Đang xử lý: ${i + 1}/${data.length} người dùng...`, { id: 'import-progress' });
          }

          // Map Excel columns to metadata
          // Expected columns: Tên đăng nhập, Họ và tên, Ngày sinh, Trường, Lớp học, Email, Mật khẩu
          const username = row['Tên đăng nhập'] || row['username'];
          const fullName = row['Họ và tên'] || row['full_name'];
          const dob = row['Ngày sinh'] || row['dob'];
          const school = row['Trường'] || row['school'];
          const className = row['Lớp học'] || row['class'];
          const email = row['Email'] || row['email'];
          const password = row['Mật khẩu'] || row['password'];

          if (!email || !password) {
            failCount++;
            continue;
          }

          const { error } = await tempClient.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: fullName,
                username: username,
                dob: dob,
                school: school,
                class: className,
                role: 'student', // Default to student
              },
            },
          });

          if (error) {
            console.error(`Error creating user ${email}:`, error.message);
            failCount++;
          } else {
            successCount++;
          }

          // Add a small delay between requests to avoid rate limits (e.g., 500ms)
          if (i < data.length - 1) {
            await sleep(500);
          }
        }

        toast.dismiss('import-progress');
        toast.success(`Đã nhập thành công ${successCount} người dùng. Thất bại: ${failCount}`);
        fetchUsers();
      } catch (error: any) {
        toast.error('Lỗi khi đọc file Excel: ' + error.message);
      } finally {
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const downloadTemplate = () => {
    const template = [
      {
        'Tên đăng nhập': 'nguyenvana',
        'Họ và tên': 'Nguyễn Văn A',
        'Ngày sinh': '2005-01-01',
        'Trường': 'THPT Chuyên',
        'Lớp học': '12A1',
        'Email': 'vana@example.com',
        'Mật khẩu': '123456'
      }
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "template_import_nguoidung.xlsx");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Quản lý người dùng</h1>
        <div className="flex flex-wrap gap-2">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".xlsx, .xls"
            onChange={handleImportExcel}
          />
          {selectedIds.length > 0 && (
            <Button 
              variant="destructive" 
              className="gap-2" 
              onClick={() => setIsBulkDeleteModalOpen(true)}
              disabled={deleting}
            >
              <Trash2 className="h-4 w-4" /> Xóa đã chọn ({selectedIds.length})
            </Button>
          )}
          <Button variant="outline" className="gap-2" onClick={downloadTemplate}>
            <Download className="h-4 w-4" /> Mẫu Excel
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()} loading={importing}>
            <FileUp className="h-4 w-4" /> Nhập Excel
          </Button>
          <Button className="gap-2" onClick={() => setIsAddUserModalOpen(true)}>
            <UserPlus className="h-4 w-4" /> Thêm người dùng
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input 
          className="pl-10" 
          placeholder="Tìm kiếm theo tên hoặc email..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-500">
                  <th className="px-6 py-4 font-medium w-10">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300"
                      checked={filteredUsers.length > 0 && selectedIds.length === filteredUsers.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="px-6 py-4 font-medium">Người dùng</th>
                  <th className="px-6 py-4 font-medium">Thông tin</th>
                  <th className="px-6 py-4 font-medium">Vai trò</th>
                  <th className="px-6 py-4 font-medium">Ngày tham gia</th>
                  <th className="px-6 py-4 font-medium text-right">Thao tác</th>
                </tr>
</thead>
<tbody className="divide-y divide-slate-50">
  {loading ? (
    <tr>
      <td colSpan={6} className="py-10 text-center text-slate-500">Đang tải danh sách...</td>
    </tr>
  ) : filteredUsers.length === 0 ? (
    <tr>
      <td colSpan={6} className="py-10 text-center text-slate-500">Không tìm thấy người dùng nào.</td>
    </tr>
  ) : (
    filteredUsers.map((u) => (
      <tr key={u.id} className={cn(selectedIds.includes(u.id) && "bg-slate-50")}>
        <td className="px-6 py-4">
          <input 
            type="checkbox" 
            className="rounded border-slate-300"
            checked={selectedIds.includes(u.id)}
            onChange={() => toggleSelect(u.id)}
          />
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
              <UserIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium text-slate-900">{u.full_name}</p>
              <p className="text-xs text-slate-500">{u.email}</p>
              {u.username && <p className="text-[10px] text-slate-400">@{u.username}</p>}
            </div>
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="text-xs space-y-1">
            <p><span className="text-slate-400">Trường:</span> {u.school || 'N/A'}</p>
            <p><span className="text-slate-400">Lớp:</span> {u.class || 'N/A'}</p>
            {u.dob && <p><span className="text-slate-400">NS:</span> {u.dob}</p>}
          </div>
        </td>
                      <td className="px-6 py-4">
                        <select 
                          className={cn(
                            "rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider outline-none",
                            u.role === 'admin' ? "bg-purple-100 text-purple-700" :
                            u.role === 'teacher' ? "bg-blue-100 text-blue-700" :
                            "bg-green-100 text-green-700"
                          )}
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        >
                          <option value="student">Học sinh</option>
                          <option value="teacher">Giáo viên</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-red-500 hover:bg-red-50" 
                          onClick={() => confirmDeleteUser(u.id)}
                          disabled={deleting}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => !deleting && setIsDeleteModalOpen(false)}
        title="Xác nhận xóa"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} disabled={deleting}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser} loading={deleting}>
              Xóa người dùng
            </Button>
          </>
        }
      >
        <div className="flex items-center gap-4 text-slate-600">
          <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <p>Bạn có chắc chắn muốn xóa người dùng này? Thao tác này sẽ xóa tất cả dữ liệu liên quan và không thể hoàn tác.</p>
        </div>
      </Modal>

      {/* Bulk Delete Confirmation Modal */}
      <Modal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => !deleting && setIsBulkDeleteModalOpen(false)}
        title="Xác nhận xóa hàng loạt"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsBulkDeleteModalOpen(false)} disabled={deleting}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleDeleteSelected} loading={deleting}>
              Xóa {selectedIds.length} người dùng
            </Button>
          </>
        }
      >
        <div className="flex items-center gap-4 text-slate-600">
          <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <p>Bạn có chắc chắn muốn xóa <strong>{selectedIds.length}</strong> người dùng đã chọn? Thao tác này sẽ xóa tất cả dữ liệu liên quan và không thể hoàn tác.</p>
        </div>
      </Modal>

      {/* Add User Modal */}
      <Modal
        isOpen={isAddUserModalOpen}
        onClose={() => !addingUser && setIsAddUserModalOpen(false)}
        title="Thêm người dùng mới"
      >
        <form onSubmit={handleAddUser} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Họ và tên</Label>
              <Input
                id="fullName"
                required
                value={newUser.fullName}
                onChange={e => setNewUser({ ...newUser, fullName: e.target.value })}
                placeholder="Nguyễn Văn A"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Tên đăng nhập</Label>
              <Input
                id="username"
                value={newUser.username}
                onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                placeholder="vana123"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={newUser.email}
              onChange={e => setNewUser({ ...newUser, email: e.target.value })}
              placeholder="vana@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Mật khẩu</Label>
            <Input
              id="password"
              type="password"
              required
              value={newUser.password}
              onChange={e => setNewUser({ ...newUser, password: e.target.value })}
              placeholder="••••••••"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="role">Vai trò</Label>
              <select
                id="role"
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/10"
                value={newUser.role}
                onChange={e => setNewUser({ ...newUser, role: e.target.value })}
              >
                <option value="student">Học sinh</option>
                <option value="teacher">Giáo viên</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dob">Ngày sinh</Label>
              <Input
                id="dob"
                type="date"
                value={newUser.dob}
                onChange={e => setNewUser({ ...newUser, dob: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="school">Trường</Label>
              <Input
                id="school"
                value={newUser.school}
                onChange={e => setNewUser({ ...newUser, school: e.target.value })}
                placeholder="THPT Chuyên"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="className">Lớp học</Label>
              <Input
                id="className"
                value={newUser.className}
                onChange={e => setNewUser({ ...newUser, className: e.target.value })}
                placeholder="12A1"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsAddUserModalOpen(false)} disabled={addingUser}>
              Hủy
            </Button>
            <Button type="submit" loading={addingUser}>
              Tạo người dùng
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
