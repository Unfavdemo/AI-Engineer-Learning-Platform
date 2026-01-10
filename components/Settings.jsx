import { Moon, Sun, Bell, Lock, User, Sliders } from 'lucide-react';
import { useState } from 'react';

export function Settings({ darkMode, setDarkMode }) {
  const [mentorStyle, setMentorStyle] = useState('Encouraging & Supportive');
  const [explanationDepth, setExplanationDepth] = useState('Intermediate');
  const [notifications, setNotifications] = useState({
    mentorFeedback: true,
    milestones: true,
    dailyReminders: false,
    weeklyReport: true,
  });
  const [focusAreas, setFocusAreas] = useState({
    backend: true,
    frontend: false,
    systemDesign: false,
    interviewPrep: true,
    codeQuality: false,
  });
  const [saveMessage, setSaveMessage] = useState('');

  const handleSave = () => {
    setSaveMessage('Settings saved successfully!');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleCancel = () => {
    setSaveMessage('Changes discarded');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const toggleNotification = (key) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleFocusArea = (key) => {
    setFocusAreas(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="p-8 bg-[#1E1E1E] min-h-screen">
      <div className="max-w-4xl mx-auto" role="main" aria-label="Settings">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-[#E0E0E0] mb-2">Settings</h1>
          <p className="text-[#888888]">Customize your learning experience</p>
          {saveMessage && (
            <div className="mt-4 bg-[#28A745] bg-opacity-20 border border-[#28A745] text-[#28A745] px-4 py-2 rounded-lg">
              {saveMessage}
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Appearance */}
          <div className="bg-[#252525] rounded-lg p-6 border border-[#2A2A2A]">
            <h2 className="text-xl font-semibold text-[#E0E0E0] mb-6 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-[#0070F3]" aria-hidden="true" />
              Appearance
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[#E0E0E0] font-medium mb-1">Dark Mode</h3>
                  <p className="text-sm text-[#888888]">Toggle between light and dark theme</p>
                </div>
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setDarkMode(!darkMode);
                    }
                  }}
                  aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                  aria-pressed={darkMode}
                  role="switch"
                  className={`relative w-14 h-7 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#0070F3] focus:ring-offset-2 focus:ring-offset-[#252525] ${
                    darkMode ? 'bg-[#0070F3]' : 'bg-[#666666]'
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform flex items-center justify-center ${
                      darkMode ? 'translate-x-7' : 'translate-x-0'
                    }`}
                  >
                    {darkMode ? <Moon className="w-3 h-3" aria-hidden="true" /> : <Sun className="w-3 h-3" aria-hidden="true" />}
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* AI Mentor Preferences */}
          <div className="bg-[#252525] rounded-lg p-6 border border-[#2A2A2A]">
            <h2 className="text-xl font-semibold text-[#E0E0E0] mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-[#0070F3]" aria-hidden="true" />
              AI Mentor Preferences
            </h2>
            <div className="space-y-6">
              <div>
                <label htmlFor="mentor-style" className="block text-[#E0E0E0] font-medium mb-3">Mentor Style</label>
                <select 
                  id="mentor-style"
                  value={mentorStyle}
                  onChange={(e) => setMentorStyle(e.target.value)}
                  className="w-full bg-[#1E1E1E] text-[#E0E0E0] border border-[#2A2A2A] rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0070F3] focus:border-[#0070F3]"
                  aria-label="Select mentor style"
                >
                  <option>Encouraging & Supportive</option>
                  <option>Direct & Technical</option>
                  <option>Socratic (Question-based)</option>
                  <option>Senior Engineer Perspective</option>
                </select>
              </div>

              <div>
                <label className="block text-[#E0E0E0] font-medium mb-3">Explanation Depth</label>
                <select 
                  value={explanationDepth}
                  onChange={(e) => setExplanationDepth(e.target.value)}
                  className="w-full bg-[#1E1E1E] text-[#E0E0E0] border border-[#2A2A2A] rounded-lg px-4 py-3 focus:outline-none focus:border-[#0070F3]"
                >
                  <option>Beginner-friendly</option>
                  <option>Intermediate</option>
                  <option>Advanced & In-depth</option>
                </select>
              </div>

              <div>
                <label className="block text-[#E0E0E0] font-semibold text-base mb-3">Focus Areas</label>
                <div className="space-y-2">
                  {[
                    { key: 'backend', label: 'Backend Development' },
                    { key: 'frontend', label: 'Frontend Development' },
                    { key: 'systemDesign', label: 'System Design' },
                    { key: 'interviewPrep', label: 'Interview Prep' },
                    { key: 'codeQuality', label: 'Code Quality' },
                  ].map((area) => (
                    <label key={area.key} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        id={`focus-area-${area.key}`}
                        checked={focusAreas[area.key]}
                        onChange={() => toggleFocusArea(area.key)}
                        aria-label={`Toggle ${area.label} focus area`}
                      />
                      <span className="text-[#E0E0E0] text-base font-normal">{area.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-[#252525] rounded-lg p-6 border border-[#2A2A2A]">
            <h2 className="text-xl font-semibold text-[#E0E0E0] mb-6 flex items-center gap-2">
              <Bell className="w-5 h-5 text-[#0070F3]" aria-hidden="true" />
              Notifications
            </h2>
            <div className="space-y-4">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <h3 className="text-[#E0E0E0] font-medium mb-1">Mentor Feedback</h3>
                  <p className="text-sm text-[#888888]">Get notified when your mentor responds</p>
                </div>
                <input
                  type="checkbox"
                  id="notification-mentor-feedback"
                  checked={notifications.mentorFeedback}
                  onChange={() => toggleNotification('mentorFeedback')}
                  aria-label="Enable mentor feedback notifications"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <h3 className="text-[#E0E0E0] font-medium mb-1">Milestone Achievements</h3>
                  <p className="text-sm text-[#888888]">Celebrate when you complete goals</p>
                </div>
                <input
                  type="checkbox"
                  id="notification-milestones"
                  checked={notifications.milestones}
                  onChange={() => toggleNotification('milestones')}
                  aria-label="Enable milestone achievement notifications"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <h3 className="text-[#E0E0E0] font-medium mb-1">Daily Learning Reminders</h3>
                  <p className="text-sm text-[#888888]">Stay consistent with gentle nudges</p>
                </div>
                <input
                  type="checkbox"
                  id="notification-daily-reminders"
                  checked={notifications.dailyReminders}
                  onChange={() => toggleNotification('dailyReminders')}
                  aria-label="Enable daily learning reminders"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <h3 className="text-[#E0E0E0] font-medium mb-1">Weekly Progress Report</h3>
                  <p className="text-sm text-[#888888]">Summary of your learning journey</p>
                </div>
                <input
                  type="checkbox"
                  id="notification-weekly-report"
                  checked={notifications.weeklyReport}
                  onChange={() => toggleNotification('weeklyReport')}
                  aria-label="Enable weekly progress report notifications"
                />
              </label>
            </div>
          </div>

          {/* Privacy & Security */}
          <div className="bg-[#252525] rounded-lg p-6 border border-[#2A2A2A]">
            <h2 className="text-xl font-semibold text-[#E0E0E0] mb-6 flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#0070F3]" aria-hidden="true" />
              Privacy & Security
            </h2>
            <div className="space-y-4">
              <button 
                onClick={() => alert('Change password functionality would open a modal here')}
                className="btn btn-secondary btn-md w-full justify-start focus:outline-none focus:ring-2 focus:ring-[#0070F3] focus:ring-offset-2 focus:ring-offset-[#252525]"
                aria-label="Change password"
              >
                Change Password
              </button>
              <button 
                onClick={() => alert('Exporting your data... This would download a JSON file with all your data')}
                className="btn btn-secondary btn-md w-full justify-start focus:outline-none focus:ring-2 focus:ring-[#0070F3] focus:ring-offset-2 focus:ring-offset-[#252525]"
                aria-label="Export my data"
              >
                Export My Data
              </button>
              <button 
                onClick={() => {
                  if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                    alert('Account deletion initiated. You would be logged out and redirected to homepage.');
                  }
                }}
                className="btn btn-destructive btn-md w-full justify-start focus:outline-none focus:ring-2 focus:ring-[#D9534F] focus:ring-offset-2 focus:ring-offset-[#252525]"
                aria-label="Delete account"
              >
                Delete Account
              </button>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-3">
            <button 
              onClick={handleCancel}
              className="btn btn-secondary btn-md focus:outline-none focus:ring-2 focus:ring-[#0070F3] focus:ring-offset-2 focus:ring-offset-[#1E1E1E]"
              aria-label="Cancel changes"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              className="btn btn-primary btn-md focus:outline-none focus:ring-2 focus:ring-[#0070F3] focus:ring-offset-2 focus:ring-offset-[#1E1E1E]"
              aria-label="Save changes"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}