import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BarChart3, TrendingUp, Target, Award, DollarSign, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { skillsAPI } from '../src/lib/api';

export function SkillTracker() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: skills = [], isLoading } = useQuery({
    queryKey: ['skills'],
    queryFn: skillsAPI.getAll,
  });

  const updateSkillMutation = useMutation({
    mutationFn: ({ id, data }) => skillsAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  // Calculate category stats
  const categoryStats = skills.reduce((acc, skill) => {
    const category = skill.category;
    if (!acc[category]) {
      acc[category] = { total: 0, count: 0, skills: [] };
    }
    acc[category].total += skill.level;
    acc[category].count += 1;
    acc[category].skills.push(skill);
    return acc;
  }, {});

  const categoryStatsArray = Object.entries(categoryStats).map(([category, stats]) => ({
    category,
    avgLevel: Math.round(stats.total / stats.count),
    skills: stats.count,
    color: getCategoryColor(category),
  }));

  const skillGaps = skills
    .filter((skill) => skill.level < 70)
    .sort((a, b) => a.level - b.level)
    .slice(0, 5);

  const recommendations = [
    {
      skill: 'Database Optimization',
      reason: 'Critical for scaling your projects',
      action: 'Complete the "Indexing & Query Performance" module',
      route: '/explainer',
    },
    {
      skill: 'System Design Patterns',
      reason: 'Frequently tested in senior engineer interviews',
      action: 'Design a distributed cache system',
      route: '/projects',
    },
    {
      skill: 'API Security',
      reason: 'Strengthen your authentication knowledge',
      action: 'Implement OAuth 2.0 in your next project',
      route: '/explainer',
    },
  ];

  const handleRecommendationClick = (route) => {
    navigate(route);
  };

  function getCategoryColor(category) {
    const colors = {
      Backend: '#0070F3',
      Frontend: '#28A745',
      Database: '#FFC107',
      DevOps: '#D9534F',
      Architecture: '#9C27B0',
      Security: '#F44336',
    };
    return colors[category] || '#888888';
  }

  if (isLoading) {
    return (
      <div className="p-8 bg-[#1E1E1E] min-h-screen">
        <div className="text-[#888888]">Loading skills...</div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-[#1E1E1E] min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-[#E0E0E0] mb-2">Skill Tracker</h1>
          <p className="text-[#888888]">Track your progress and identify areas for growth</p>
        </div>

        {/* Category Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {categoryStatsArray.length > 0 ? (
            categoryStatsArray.map((stat) => (
              <div key={stat.category} className="bg-[#252525] rounded-lg p-6 border border-[#2A2A2A]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[#E0E0E0] font-semibold">{stat.category}</h3>
                  <BarChart3 className="w-5 h-5" style={{ color: stat.color }} />
                </div>
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[#888888]">Avg Level</span>
                    <span className="text-2xl font-semibold text-[#E0E0E0]">{stat.avgLevel}%</span>
                  </div>
                  <div className="w-full bg-[#1E1E1E] rounded-full h-2">
                    <div
                      className="h-2 rounded-full"
                      style={{ width: `${stat.avgLevel}%`, backgroundColor: stat.color }}
                    ></div>
                  </div>
                </div>
                <p className="text-xs text-[#888888]">{stat.skills} skill{stat.skills !== 1 ? 's' : ''}</p>
              </div>
            ))
          ) : (
            <div className="col-span-4 text-center text-[#888888] py-8">
              No skills tracked yet. Skills will be automatically tracked as you complete projects.
            </div>
          )}
        </div>

        {/* Skills List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-[#252525] rounded-lg p-6 border border-[#2A2A2A]">
            <h2 className="text-xl font-semibold text-[#E0E0E0] mb-4">All Skills</h2>
            {skills.length > 0 ? (
              <div className="space-y-4">
                {skills.map((skill) => (
                  <div key={skill.id}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-[#E0E0E0] font-medium">{skill.name}</span>
                        <span className="text-xs text-[#888888] ml-2">({skill.category})</span>
                      </div>
                      <span className="text-sm text-[#888888]">{skill.level}%</span>
                    </div>
                    <div className="w-full bg-[#1E1E1E] rounded-full h-2 mb-1">
                      <div
                        className="bg-[#0070F3] h-2 rounded-full transition-all"
                        style={{ width: `${skill.level}%` }}
                      ></div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-[#888888]">
                      <span>{skill.progress}% to next level</span>
                      <span>{skill.projects} project{skill.projects !== 1 ? 's' : ''}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={skill.level}
                      onChange={(e) => {
                        updateSkillMutation.mutate({
                          id: skill.id,
                          data: { level: parseInt(e.target.value) },
                        });
                      }}
                      className="w-full mt-2"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[#888888] text-sm">No skills tracked yet.</div>
            )}
          </div>

          {/* Recommendations */}
          <div className="bg-[#252525] rounded-lg p-6 border border-[#2A2A2A]">
            <h2 className="text-xl font-semibold text-[#E0E0E0] mb-4">Recommendations</h2>
            <div className="space-y-4">
              {skillGaps.length > 0 ? (
                skillGaps.map((skill, index) => (
                  <div key={skill.id || index} className="bg-[#1E1E1E] rounded-lg p-4 border border-[#2A2A2A]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[#E0E0E0] font-medium">{skill.name}</span>
                      <span className="text-xs text-[#888888]">{skill.level}%</span>
                    </div>
                    <p className="text-sm text-[#888888] mb-3">
                      Focus on improving this skill to reach the next level
                    </p>
                    <div className="w-full bg-[#171717] rounded-full h-2">
                      <div
                        className="bg-[#FFC107] h-2 rounded-full"
                        style={{ width: `${skill.level}%` }}
                      ></div>
                    </div>
                  </div>
                ))
              ) : (
                recommendations.map((rec, index) => (
                  <div
                    key={index}
                    className="bg-[#1E1E1E] rounded-lg p-4 border border-[#2A2A2A] cursor-pointer hover:border-[#0070F3] transition-colors"
                    onClick={() => handleRecommendationClick(rec.route)}
                  >
                    <h3 className="text-[#E0E0E0] font-medium mb-1">{rec.skill}</h3>
                    <p className="text-sm text-[#888888] mb-2">{rec.reason}</p>
                    <p className="text-xs text-[#0070F3]">{rec.action}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* $70k Offer Assessment */}
        <div className="mt-8 bg-[#252525] rounded-lg p-6 border border-[#2A2A2A]">
          <h2 className="text-xl font-semibold text-[#E0E0E0] mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-[#28A745]" />
            What's Holding You Back from a $70k Offer?
          </h2>
          
          <div className="bg-[#1E1E1E] rounded-lg p-5 border border-[#D9534F] border-opacity-30 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-[#D9534F]" />
              <div>
                <div className="text-lg font-semibold text-[#D9534F]">Blocked by Key Gaps</div>
                <div className="text-sm text-[#888888]">Focus on these to unlock $70k+ offers</div>
              </div>
            </div>
            
            <div className="space-y-4 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-[#E0E0E0] mb-2">Engineering Thinking</h3>
                <div className="text-xs text-[#888888] space-y-1">
                  <p>❌ <strong className="text-[#E0E0E0]">Can't explain WHY:</strong> You built it, but don't understand reasoning</p>
                  <p>❌ <strong className="text-[#E0E0E0]">No trade-off discussions:</strong> Didn't consider alternatives</p>
                  <p>❌ <strong className="text-[#E0E0E0]">No scalability thinking:</strong> Can't answer "what breaks at scale?"</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-[#E0E0E0] mb-2">Technical Depth</h3>
                <div className="text-xs text-[#888888] space-y-1">
                  <p>⚠️ <strong className="text-[#E0E0E0]">System Design:</strong> Weak on architecture at scale</p>
                  <p>⚠️ <strong className="text-[#E0E0E0]">Database Optimization:</strong> Missing indexing knowledge</p>
                  <p>✅ <strong className="text-[#E0E0E0]">API Design:</strong> Solid RESTful patterns</p>
                </div>
              </div>
            </div>

            <div className="bg-[#FFC107] bg-opacity-10 border border-[#FFC107] border-opacity-30 rounded-lg p-3">
              <p className="text-xs text-[#E0E0E0] mb-2">
                <strong>💡 The $70k Test:</strong> Can you answer these about every project?
              </p>
              <ul className="text-xs text-[#888888] space-y-1 ml-4">
                <li>1. "Why did you choose this tech stack?" - Need reasoning, not "it's popular"</li>
                <li>2. "What would break at 10x users?" - Shows you think beyond MVP</li>
                <li>3. "What alternatives did you consider?" - Shows engineering judgment</li>
                <li>4. "Walk me through the architecture" - Must understand system design</li>
                <li>5. "What would you improve?" - Shows self-awareness</li>
              </ul>
              <p className="text-xs text-[#FFC107] mt-3 font-medium">
                If you can't answer these, the project won't help you get hired. Build something that demonstrates engineering thinking.
              </p>
            </div>
          </div>

          {/* Market Expectations */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[#E0E0E0]">Market Expectations:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#1E1E1E] rounded-lg p-4 border border-[#0070F3] border-opacity-30">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs bg-[#0070F3] bg-opacity-20 text-[#0070F3] px-2 py-1 rounded">Junior ($50k-$65k)</span>
                  <CheckCircle className="w-4 h-4 text-[#28A745]" />
                </div>
                <ul className="text-xs text-[#888888] space-y-1">
                  <li>• Can code (syntax, basic patterns)</li>
                  <li>• Can debug with console.log</li>
                  <li>• Can follow tutorials</li>
                  <li>• Basic stack understanding</li>
                </ul>
              </div>
              
              <div className="bg-[#1E1E1E] rounded-lg p-4 border border-[#FFC107] border-opacity-30">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs bg-[#FFC107] bg-opacity-20 text-[#FFC107] px-2 py-1 rounded">Mid-Level ($65k-$85k) - TARGET</span>
                  <XCircle className="w-4 h-4 text-[#D9534F]" />
                </div>
                <ul className="text-xs text-[#888888] space-y-1">
                  <li>• Can explain WHY decisions were made</li>
                  <li>• Understands trade-offs & alternatives</li>
                  <li>• Thinks about scalability</li>
                  <li>• Can walk through architecture</li>
                  <li>• Understands how things work under the hood</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
