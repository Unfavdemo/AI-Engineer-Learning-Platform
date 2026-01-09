import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Clock, CheckCircle, AlertCircle, Folder, MessageSquare, Mic } from 'lucide-react';
import { Link } from 'react-router-dom';
import { dashboardAPI } from '../src/lib/api';

export function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardAPI.getStats(),
  });

  const { data: recentProjects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['dashboard-recent-projects'],
    queryFn: () => dashboardAPI.getRecentProjects(3),
  });

  const { data: notifications = [], isLoading: notificationsLoading } = useQuery({
    queryKey: ['dashboard-notifications'],
    queryFn: () => dashboardAPI.getNotifications(),
  });

  const { data: skillGaps = [], isLoading: skillGapsLoading } = useQuery({
    queryKey: ['dashboard-skill-gaps'],
    queryFn: () => dashboardAPI.getSkillGaps(),
  });

  return (
    <div className="p-8 bg-[#1E1E1E] min-h-screen">
      <div className="max-w-7xl mx-auto" role="main" aria-label="Dashboard">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-[#E0E0E0] mb-2">Welcome back, Engineer</h1>
          <p className="text-[#888888]">Continue building your career-defining projects</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-[#252525] rounded-lg p-6 border border-[#2A2A2A]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#888888] text-sm">Active Projects</span>
              <Folder className="w-5 h-5 text-[#0070F3]" aria-hidden="true" />
            </div>
            <p className="text-3xl font-semibold text-[#E0E0E0]">
              {statsLoading ? '...' : (stats?.activeProjects || 0)}
            </p>
          </div>

          <div className="bg-[#252525] rounded-lg p-6 border border-[#2A2A2A]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#888888] text-sm">Skills Mastered</span>
              <CheckCircle className="w-5 h-5 text-[#28A745]" aria-hidden="true" />
            </div>
            <p className="text-3xl font-semibold text-[#E0E0E0]">
              {statsLoading ? '...' : (stats?.skillsMastered || 0)}
            </p>
          </div>

          <div className="bg-[#252525] rounded-lg p-6 border border-[#2A2A2A]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#888888] text-sm">Practice Sessions</span>
              <TrendingUp className="w-5 h-5 text-[#0070F3]" aria-hidden="true" />
            </div>
            <p className="text-3xl font-semibold text-[#E0E0E0]">
              {statsLoading ? '...' : (stats?.practiceSessions || 0)}
            </p>
          </div>

          <div className="bg-[#252525] rounded-lg p-6 border border-[#2A2A2A]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#888888] text-sm">Hours Invested</span>
              <Clock className="w-5 h-5 text-[#0070F3]" aria-hidden="true" />
            </div>
            <p className="text-3xl font-semibold text-[#E0E0E0]">
              {statsLoading ? '...' : (stats?.hoursInvested || 0)}
            </p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Projects */}
          <div className="lg:col-span-2 bg-[#252525] rounded-lg p-6 border border-[#2A2A2A]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-[#E0E0E0]">Recent Projects</h2>
              <Link to="/projects" className="text-[#0070F3] text-sm hover:text-[#0060D9] hover:underline focus:outline-none focus:ring-2 focus:ring-[#0070F3] focus:ring-offset-2 focus:ring-offset-[#252525] rounded">
                View all
              </Link>
            </div>
            {projectsLoading ? (
              <div className="text-[#888888]" role="status" aria-live="polite" aria-label="Loading projects">Loading projects...</div>
            ) : recentProjects && recentProjects.length > 0 ? (
              <div className="space-y-4">
                {recentProjects.map((project) => (
                  <div key={project.id} className="bg-[#1E1E1E] rounded-lg p-4 border border-[#2A2A2A]">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-[#E0E0E0] font-medium">{project.name}</h3>
                      <span className="text-xs text-[#888888]">{project.lastUpdated}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="w-full bg-[#171717] rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              project.status === 'completed' ? 'bg-[#28A745]' : 'bg-[#0070F3]'
                            }`}
                            style={{ width: `${project.progress}%` }}
                          ></div>
                        </div>
                      </div>
                      <span className="text-sm text-[#888888]">{project.progress}%</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[#888888]">No projects yet. <Link to="/projects" className="text-[#0070F3] hover:text-[#0060D9] hover:underline">Create one</Link></div>
            )}
          </div>

          {/* Notifications & Skill Gaps */}
          <div className="space-y-6">
            {/* Notifications */}
            <div className="bg-[#252525] rounded-lg p-6 border border-[#2A2A2A]">
              <h2 className="text-xl font-semibold text-[#E0E0E0] mb-4">Notifications</h2>
              {notificationsLoading ? (
                <div className="text-[#888888] text-sm" role="status" aria-live="polite" aria-label="Loading notifications">Loading...</div>
              ) : notifications && notifications.length > 0 ? (
                <div className="space-y-3">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 rounded-lg border-l-4 ${
                        notification.type === 'mentor'
                          ? 'bg-[#1E1E1E] border-[#0070F3]'
                          : notification.type === 'success'
                          ? 'bg-[#1E1E1E] border-[#28A745]'
                          : 'bg-[#1E1E1E] border-[#FFC107]'
                      }`}
                    >
                      <p className="text-sm text-[#E0E0E0] mb-1">{notification.message}</p>
                      <span className="text-xs text-[#888888]">{notification.time}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[#888888] text-sm">No notifications</div>
              )}
            </div>

            {/* Skill Gaps */}
            <div className="bg-[#252525] rounded-lg p-6 border border-[#2A2A2A]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-[#E0E0E0]">Focus Areas</h2>
                <Link to="/skills" className="text-[#0070F3] text-sm hover:text-[#0060D9] hover:underline focus:outline-none focus:ring-2 focus:ring-[#0070F3] focus:ring-offset-2 focus:ring-offset-[#252525] rounded">
                  View all
                </Link>
              </div>
              {skillGapsLoading ? (
                <div className="text-[#888888] text-sm" role="status" aria-live="polite" aria-label="Loading skill gaps">Loading...</div>
              ) : skillGaps && skillGaps.length > 0 ? (
                <div className="space-y-4">
                  {skillGaps.map((skill, index) => (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-[#E0E0E0]">{skill.skill}</span>
                        <span className="text-xs text-[#888888]">{skill.level}%</span>
                      </div>
                      <div className="w-full bg-[#1E1E1E] rounded-full h-2">
                        <div
                          className="bg-[#FFC107] h-2 rounded-full"
                          style={{ width: `${skill.level}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[#888888] text-sm">No skill gaps identified</div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            to="/mentor"
            className="bg-[#252525] rounded-lg p-6 border border-[#2A2A2A] hover:border-[#0070F3] transition-colors group focus:outline-none focus:ring-2 focus:ring-[#0070F3] focus:ring-offset-2 focus:ring-offset-[#1E1E1E]"
            aria-label="Go to AI Mentor"
          >
            <MessageSquare className="w-8 h-8 text-[#0070F3] mb-3" aria-hidden="true" />
            <h3 className="text-lg font-semibold text-[#E0E0E0] mb-2">Ask Your Mentor</h3>
            <p className="text-sm text-[#888888]">Get guidance on concepts, code, or career decisions</p>
          </Link>

          <Link
            to="/practice"
            className="bg-[#252525] rounded-lg p-6 border border-[#2A2A2A] hover:border-[#0070F3] transition-colors group focus:outline-none focus:ring-2 focus:ring-[#0070F3] focus:ring-offset-2 focus:ring-offset-[#1E1E1E]"
            aria-label="Go to Practice Interview"
          >
            <Mic className="w-8 h-8 text-[#0070F3] mb-3" aria-hidden="true" />
            <h3 className="text-lg font-semibold text-[#E0E0E0] mb-2">Practice Interview</h3>
            <p className="text-sm text-[#888888]">Explain your projects like you're in an interview</p>
          </Link>

          <Link
            to="/projects"
            className="bg-[#252525] rounded-lg p-6 border border-[#2A2A2A] hover:border-[#0070F3] transition-colors group focus:outline-none focus:ring-2 focus:ring-[#0070F3] focus:ring-offset-2 focus:ring-offset-[#1E1E1E]"
            aria-label="Go to Projects"
          >
            <Folder className="w-8 h-8 text-[#0070F3] mb-3" aria-hidden="true" />
            <h3 className="text-lg font-semibold text-[#E0E0E0] mb-2">Start New Project</h3>
            <p className="text-sm text-[#888888]">Build something interview-worthy from scratch</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
