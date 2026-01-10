import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Folder, 
  BookOpen, 
  Mic, 
  FileText, 
  BarChart3, 
  Settings,
  LogOut
} from 'lucide-react';
import { useAuth } from '../src/lib/auth';

export function Sidebar({ darkMode }) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };
  const navItems = [
    { path: '/home', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/mentor', icon: MessageSquare, label: 'AI Mentor' },
    { path: '/projects', icon: Folder, label: 'Projects' },
    { path: '/explainer', icon: BookOpen, label: 'Learn' },
    { path: '/practice', icon: Mic, label: 'Practice' },
    { path: '/resume', icon: FileText, label: 'Resume' },
    { path: '/skills', icon: BarChart3, label: 'Skills' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <aside className="w-64 bg-[#171717] border-r border-[#2A2A2A] flex flex-col" aria-label="Main navigation">
      <div className="p-6 border-b border-[#2A2A2A]">
        <h1 className="text-xl font-semibold text-[#E0E0E0]">AI Engineer</h1>
        <p className="text-sm text-[#888888] mt-1">Learning Platform</p>
      </div>
      
      <nav className="flex-1 p-4 space-y-1" aria-label="Primary navigation">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#0070F3] focus:ring-offset-2 focus:ring-offset-[#171717] ${
                isActive
                  ? 'bg-[#0070F3] text-white'
                  : 'text-[#B0B0B0] hover:bg-[#252525] hover:text-[#E0E0E0]'
              }`
            }
            aria-current={({ isActive }) => isActive ? 'page' : undefined}
          >
            <item.icon className="w-5 h-5" aria-hidden="true" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-[#2A2A2A] space-y-3" aria-label="User account">
        {user && (
          <div className="px-4 py-2" role="status" aria-live="polite">
            <p className="text-sm text-[#E0E0E0] font-medium">{user.name || user.email}</p>
            <p className="text-xs text-[#888888]">{user.email}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-[#B0B0B0] hover:bg-[#252525] hover:text-[#E0E0E0] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0070F3] focus:ring-offset-2 focus:ring-offset-[#171717]"
          aria-label="Logout"
        >
          <LogOut className="w-5 h-5" aria-hidden="true" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
