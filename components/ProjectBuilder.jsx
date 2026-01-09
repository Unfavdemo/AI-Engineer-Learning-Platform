import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, CheckCircle, Circle, Clock, Code, Database, Globe, Edit2, Save, X, Sparkles, Target } from 'lucide-react';
import { projectsAPI } from '../src/lib/api';

export function ProjectBuilder() {
  const [showNewProject, setShowNewProject] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTechStack, setEditTechStack] = useState([]);
  const [newTechItem, setNewTechItem] = useState('');
  const [newMilestone, setNewMilestone] = useState('');
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [implementedRecommendations, setImplementedRecommendations] = useState(new Set());
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsAPI.getAll,
  });

  const createProjectMutation = useMutation({
    mutationFn: projectsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-recent-projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setShowNewProject(false);
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: ({ id, data }) => projectsAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-recent-projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: projectsAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-recent-projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      if (selectedProjectId) setSelectedProjectId(null);
    },
  });

  const updateMilestoneMutation = useMutation({
    mutationFn: ({ projectId, milestoneId, completed }) =>
      projectsAPI.updateMilestone(projectId, milestoneId, { completed }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const addMilestoneMutation = useMutation({
    mutationFn: ({ projectId, title }) =>
      projectsAPI.addMilestone(projectId, { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setNewMilestone('');
    },
  });

  // AI Recommendations query
  const { data: recommendations, isLoading: recommendationsLoading, refetch: refetchRecommendations } = useQuery({
    queryKey: ['project-recommendations', selectedProjectId],
    queryFn: () => projectsAPI.getRecommendations(selectedProjectId),
    enabled: !!selectedProjectId && showRecommendations,
  });

  // Load implemented recommendations from localStorage
  useEffect(() => {
    if (selectedProjectId) {
      const key = `implemented-recommendations-${selectedProjectId}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          setImplementedRecommendations(new Set(JSON.parse(stored)));
        } catch (e) {
          console.error('Failed to load implemented recommendations:', e);
        }
      }
    }
  }, [selectedProjectId]);

  // Save implemented recommendations to localStorage
  const saveImplementedRecommendations = (newSet) => {
    setImplementedRecommendations(newSet);
    if (selectedProjectId) {
      const key = `implemented-recommendations-${selectedProjectId}`;
      localStorage.setItem(key, JSON.stringify(Array.from(newSet)));
    }
  };

  const addRecommendationAsMilestone = (recommendationText, category) => {
    if (selectedProject && recommendationText.trim()) {
      const milestoneTitle = recommendationText.length > 100 
        ? `${recommendationText.substring(0, 97)}...`
        : recommendationText;
      
      addMilestoneMutation.mutate({
        projectId: selectedProject.id,
        title: milestoneTitle,
      });

      // Mark as implemented
      const key = `${category}-${recommendationText}`;
      const newSet = new Set(implementedRecommendations);
      newSet.add(key);
      saveImplementedRecommendations(newSet);
    }
  };

  const markRecommendationAsImplemented = (recommendationText, category) => {
    const key = `${category}-${recommendationText}`;
    const newSet = new Set(implementedRecommendations);
    newSet.add(key);
    saveImplementedRecommendations(newSet);
  };

  const isRecommendationImplemented = (recommendationText, category) => {
    const key = `${category}-${recommendationText}`;
    return implementedRecommendations.has(key);
  };

  const templates = [
    {
      name: 'Microservices Architecture',
      description: 'Build a system with multiple services, API gateway, and message queuing',
      icon: Database,
      tags: ['Backend', 'System Design', 'Advanced'],
      techStack: ['Node.js', 'Docker', 'RabbitMQ', 'PostgreSQL'],
    },
    {
      name: 'Full-Stack Dashboard',
      description: 'Analytics dashboard with real-time data visualization and admin panel',
      icon: Code,
      tags: ['Full-Stack', 'Frontend', 'Backend'],
      techStack: ['React', 'Node.js', 'MongoDB', 'Chart.js'],
    },
    {
      name: 'Data Pipeline',
      description: 'ETL pipeline with batch processing, data validation, and storage',
      icon: Globe,
      tags: ['Backend', 'Data Engineering', 'Advanced'],
      techStack: ['Python', 'Apache Airflow', 'PostgreSQL', 'Redis'],
    },
  ];

  const createProjectFromTemplate = (template) => {
    createProjectMutation.mutate({
      name: template.name,
      description: template.description,
      techStack: template.techStack,
      status: 'planning',
      progress: 0,
    });
  };

  const toggleMilestone = (projectId, milestoneId, currentStatus) => {
    updateMilestoneMutation.mutate({
      projectId,
      milestoneId,
      completed: !currentStatus,
    });
  };

  const selectedProject = selectedProjectId
    ? projects.find((p) => p.id === selectedProjectId)
    : null;

  // Initialize edit state when project is selected
  useEffect(() => {
    if (selectedProject && !isEditing) {
      setEditName(selectedProject.name || '');
      setEditDescription(selectedProject.description || '');
      setEditTechStack(selectedProject.techStack || []);
    }
  }, [selectedProject, isEditing]);

  const startEditing = () => {
    if (selectedProject) {
      setEditName(selectedProject.name || '');
      setEditDescription(selectedProject.description || '');
      setEditTechStack([...selectedProject.techStack] || []);
      setIsEditing(true);
    }
  };

  const cancelEditing = () => {
    setIsEditing(false);
    if (selectedProject) {
      setEditName(selectedProject.name || '');
      setEditDescription(selectedProject.description || '');
      setEditTechStack(selectedProject.techStack || []);
    }
  };

  const saveEditing = () => {
    if (selectedProject) {
      updateProjectMutation.mutate({
        id: selectedProject.id,
        data: {
          name: editName,
          description: editDescription,
          techStack: editTechStack,
        },
      });
      setIsEditing(false);
    }
  };

  const addTechItem = () => {
    if (newTechItem.trim() && !editTechStack.includes(newTechItem.trim())) {
      setEditTechStack([...editTechStack, newTechItem.trim()]);
      setNewTechItem('');
    }
  };

  const removeTechItem = (index) => {
    setEditTechStack(editTechStack.filter((_, i) => i !== index));
  };

  const addMilestone = () => {
    if (newMilestone.trim() && selectedProject) {
      addMilestoneMutation.mutate({
        projectId: selectedProject.id,
        title: newMilestone.trim(),
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 bg-[#1E1E1E] min-h-screen">
        <div className="text-[#888888]">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-[#1E1E1E] min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold text-[#E0E0E0] mb-2">Project Builder</h1>
            <p className="text-[#888888]">Build projects that demonstrate your skills</p>
          </div>
          <button
            onClick={() => setShowNewProject(!showNewProject)}
            className="btn btn-primary btn-lg"
          >
            <Plus className="w-5 h-5" />
            New Project
          </button>
        </div>

        {showNewProject && (
          <div className="mb-8 bg-[#252525] rounded-lg p-6 border border-[#2A2A2A]">
            <h2 className="text-xl font-semibold text-[#E0E0E0] mb-4">Choose a Template</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {templates.map((template, index) => {
                const IconComponent = template.icon;
                return (
                <div
                  key={index}
                  onClick={() => createProjectFromTemplate(template)}
                  className="bg-[#1E1E1E] rounded-lg p-4 border border-[#2A2A2A] hover:border-[#0070F3] transition-colors cursor-pointer"
                >
                  <IconComponent className="w-8 h-8 text-[#0070F3] mb-3" />
                  <h3 className="text-[#E0E0E0] font-semibold mb-2">{template.name}</h3>
                  <p className="text-sm text-[#888888] mb-3">{template.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {template.tags.map((tag, tagIndex) => (
                      <span
                        key={tagIndex}
                        className="text-xs bg-[#252525] text-[#888888] px-2 py-1 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Projects List */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-xl font-semibold text-[#E0E0E0] mb-4">Your Projects</h2>
            {projects.length === 0 ? (
              <div className="text-[#888888]">No projects yet. Create one to get started!</div>
            ) : (
              projects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => setSelectedProjectId(project.id)}
                  className={`bg-[#252525] rounded-lg p-4 border cursor-pointer transition-colors ${
                    selectedProjectId === project.id
                      ? 'border-[#0070F3]'
                      : 'border-[#2A2A2A] hover:border-[#0070F3]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[#E0E0E0] font-medium">{project.name}</h3>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        project.status === 'completed'
                          ? 'bg-[#28A745] text-white'
                          : project.status === 'in-progress'
                          ? 'bg-[#0070F3] text-white'
                          : 'bg-[#888888] text-[#E0E0E0]'
                      }`}
                    >
                      {project.status}
                    </span>
                  </div>
                  <div className="w-full bg-[#1E1E1E] rounded-full h-2 mb-2">
                    <div
                      className="bg-[#0070F3] h-2 rounded-full"
                      style={{ width: `${project.progress}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-[#888888]">{project.progress}% complete</p>
                </div>
              ))
            )}
          </div>

          {/* Project Details */}
          <div className="lg:col-span-2">
            {selectedProject ? (
              <div className="space-y-6">
                {/* Project Details Card */}
                <div className="bg-[#252525] rounded-lg p-6 border border-[#2A2A2A]">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex-1">
                      {isEditing ? (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm text-[#E0E0E0] mb-2">Project Name</label>
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full bg-[#1E1E1E] text-[#E0E0E0] border border-[#2A2A2A] rounded-lg px-4 py-2 focus:outline-none focus:border-[#0070F3]"
                              placeholder="Project name"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-[#E0E0E0] mb-2">Description</label>
                            <textarea
                              value={editDescription}
                              onChange={(e) => setEditDescription(e.target.value)}
                              rows={3}
                              className="w-full bg-[#1E1E1E] text-[#E0E0E0] border border-[#2A2A2A] rounded-lg px-4 py-2 focus:outline-none focus:border-[#0070F3]"
                              placeholder="Project description"
                            />
                          </div>
                        </div>
                      ) : (
                        <div>
                          <h2 className="text-2xl font-semibold text-[#E0E0E0] mb-2">
                            {selectedProject.name}
                          </h2>
                          <p className="text-[#888888]">{selectedProject.description || 'No description'}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {isEditing ? (
                        <>
                          <button
                            onClick={saveEditing}
                            className="btn btn-success btn-md"
                          >
                            <Save className="w-4 h-4" />
                            Save
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="btn btn-secondary btn-md"
                          >
                            <X className="w-4 h-4" />
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={startEditing}
                            className="btn btn-primary btn-md"
                          >
                            <Edit2 className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this project?')) {
                                deleteProjectMutation.mutate(selectedProject.id);
                              }
                            }}
                            className="btn btn-ghost btn-sm text-red-400 hover:text-red-300"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                {/* Tech Stack */}
                <div className="mb-6">
                  <h3 className="text-[#E0E0E0] font-semibold mb-3">Tech Stack</h3>
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {editTechStack.map((tech, index) => (
                          <span
                            key={index}
                            className="bg-[#1E1E1E] text-[#E0E0E0] px-3 py-1 rounded-lg text-sm flex items-center gap-2"
                          >
                            {tech}
                            <button
                              onClick={() => removeTechItem(index)}
                              className="btn btn-ghost btn-sm text-red-400 hover:text-red-300 p-0 h-auto"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newTechItem}
                          onChange={(e) => setNewTechItem(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && addTechItem()}
                          placeholder="Add technology..."
                          className="flex-1 bg-[#1E1E1E] text-[#E0E0E0] border border-[#2A2A2A] rounded-lg px-4 py-2 focus:outline-none focus:border-[#0070F3]"
                        />
                        <button
                          onClick={addTechItem}
                          className="btn btn-primary btn-md"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {selectedProject.techStack && selectedProject.techStack.length > 0 ? (
                        selectedProject.techStack.map((tech, index) => (
                          <span
                            key={index}
                            className="bg-[#1E1E1E] text-[#E0E0E0] px-3 py-1 rounded-lg text-sm"
                          >
                            {tech}
                          </span>
                        ))
                      ) : (
                        <span className="text-[#888888] text-sm">No tech stack specified</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Progress */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[#E0E0E0] font-semibold">Progress</span>
                    <span className="text-[#888888]">{selectedProject.progress}%</span>
                  </div>
                  <div className="w-full bg-[#1E1E1E] rounded-full h-3">
                    <div
                      className="bg-[#0070F3] h-3 rounded-full transition-all"
                      style={{ width: `${selectedProject.progress}%` }}
                    ></div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={selectedProject.progress}
                    onChange={(e) => {
                      updateProjectMutation.mutate({
                        id: selectedProject.id,
                        data: { progress: parseInt(e.target.value) },
                      });
                    }}
                    className="w-full mt-2"
                  />
                </div>

                {/* Status */}
                <div className="mb-6">
                  <label className="block text-[#E0E0E0] font-semibold mb-2">Status</label>
                  <select
                    value={selectedProject.status}
                    onChange={(e) => {
                      updateProjectMutation.mutate({
                        id: selectedProject.id,
                        data: { status: e.target.value },
                      });
                    }}
                    className="bg-[#1E1E1E] text-[#E0E0E0] border border-[#2A2A2A] rounded-lg px-4 py-2"
                  >
                    <option value="planning">Planning</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                {/* Milestones */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[#E0E0E0] font-semibold">Milestones</h3>
                  </div>
                  {selectedProject.milestones && selectedProject.milestones.length > 0 ? (
                    <div className="space-y-3 mb-3">
                      {selectedProject.milestones.map((milestone) => (
                        <div
                          key={milestone.id}
                          className="flex items-center gap-3 bg-[#1E1E1E] rounded-lg p-3 border border-[#2A2A2A]"
                        >
                          <button
                            onClick={() =>
                              toggleMilestone(selectedProject.id, milestone.id, milestone.completed)
                            }
                            className="flex-shrink-0"
                          >
                            {milestone.completed ? (
                              <CheckCircle className="w-5 h-5 text-[#28A745]" />
                            ) : (
                              <Circle className="w-5 h-5 text-[#888888]" />
                            )}
                          </button>
                          <span
                            className={`flex-1 ${
                              milestone.completed
                                ? 'text-[#888888] line-through'
                                : 'text-[#E0E0E0]'
                            }`}
                          >
                            {milestone.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[#888888] text-sm mb-3">No milestones yet</div>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMilestone}
                      onChange={(e) => setNewMilestone(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addMilestone()}
                      placeholder="Add milestone..."
                      className="flex-1 bg-[#1E1E1E] text-[#E0E0E0] border border-[#2A2A2A] rounded-lg px-4 py-2 focus:outline-none focus:border-[#0070F3]"
                    />
                    <button
                      onClick={addMilestone}
                      disabled={!newMilestone.trim()}
                      className="btn btn-primary btn-md"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* AI Recommendations */}
              <div className="bg-[#252525] rounded-lg p-6 border border-[#2A2A2A]">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#FFC107]" />
                    <h3 className="text-xl font-semibold text-[#E0E0E0]">AI Recommendations</h3>
                  </div>
                  <button
                    onClick={() => {
                      setShowRecommendations(!showRecommendations);
                      if (!showRecommendations) {
                        refetchRecommendations();
                      }
                    }}
                    className="btn btn-warning btn-sm"
                  >
                    <Target className="w-4 h-4" />
                    {showRecommendations ? 'Hide' : 'Get Recommendations'}
                  </button>
                </div>

                {showRecommendations && (
                  <div>
                    {recommendationsLoading ? (
                      <div className="text-[#888888]">Analyzing your project...</div>
                    ) : recommendations ? (
                      <div className="space-y-6">
                        {/* Overall Assessment */}
                        {recommendations.overallAssessment && (
                          <div className="bg-[#1E1E1E] rounded-lg p-4 border border-[#2A2A2A]">
                            <h4 className="text-[#E0E0E0] font-semibold mb-2">Overall Assessment</h4>
                            <p className="text-[#B0B0B0] text-sm">{recommendations.overallAssessment}</p>
                          </div>
                        )}

                        {/* Technical Improvements */}
                        {recommendations.technicalImprovements && recommendations.technicalImprovements.length > 0 && (
                          <div>
                            <h4 className="text-[#E0E0E0] font-semibold mb-3 flex items-center gap-2">
                              <Code className="w-4 h-4 text-[#0070F3]" />
                              Technical Improvements
                            </h4>
                            <ul className="space-y-2">
                              {recommendations.technicalImprovements.map((improvement, index) => {
                                const isImplemented = isRecommendationImplemented(improvement, 'technical');
                                return (
                                  <li key={index} className={`flex items-start gap-3 text-sm bg-[#1E1E1E] rounded-lg p-3 border ${
                                    isImplemented ? 'border-[#28A745] border-opacity-50 opacity-75' : 'border-[#2A2A2A]'
                                  }`}>
                                    <span className={`font-semibold flex-shrink-0 mt-0.5 ${
                                      isImplemented ? 'text-[#28A745]' : 'text-[#0070F3]'
                                    }`}>
                                      {isImplemented ? '✓' : '•'}
                                    </span>
                                    <span className={`flex-1 ${isImplemented ? 'text-[#888888] line-through' : 'text-[#B0B0B0]'}`}>
                                      {improvement}
                                    </span>
                                    {!isImplemented && (
                                      <div className="flex gap-2 flex-shrink-0">
                                        <button
                                          onClick={() => addRecommendationAsMilestone(improvement, 'technical')}
                                          className="btn btn-primary btn-sm"
                                          title="Add as milestone"
                                        >
                                          <Plus className="w-3 h-3" />
                                          Add
                                        </button>
                                        <button
                                          onClick={() => markRecommendationAsImplemented(improvement, 'technical')}
                                          className="btn btn-success-outline btn-sm"
                                          title="Mark as implemented"
                                        >
                                          Done
                                        </button>
                                      </div>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}

                        {/* Architecture Suggestions */}
                        {recommendations.architectureSuggestions && recommendations.architectureSuggestions.length > 0 && (
                          <div>
                            <h4 className="text-[#E0E0E0] font-semibold mb-3 flex items-center gap-2">
                              <Database className="w-4 h-4 text-[#28A745]" />
                              Architecture Suggestions
                            </h4>
                            <ul className="space-y-2">
                              {recommendations.architectureSuggestions.map((suggestion, index) => {
                                const isImplemented = isRecommendationImplemented(suggestion, 'architecture');
                                return (
                                  <li key={index} className={`flex items-start gap-3 text-sm bg-[#1E1E1E] rounded-lg p-3 border ${
                                    isImplemented ? 'border-[#28A745] border-opacity-50 opacity-75' : 'border-[#2A2A2A]'
                                  }`}>
                                    <span className={`font-semibold flex-shrink-0 mt-0.5 ${
                                      isImplemented ? 'text-[#28A745]' : 'text-[#28A745]'
                                    }`}>
                                      {isImplemented ? '✓' : '•'}
                                    </span>
                                    <span className={`flex-1 ${isImplemented ? 'text-[#888888] line-through' : 'text-[#B0B0B0]'}`}>
                                      {suggestion}
                                    </span>
                                    {!isImplemented && (
                                      <div className="flex gap-2 flex-shrink-0">
                                        <button
                                          onClick={() => addRecommendationAsMilestone(suggestion, 'architecture')}
                                          className="btn btn-success btn-sm"
                                          title="Add as milestone"
                                        >
                                          <Plus className="w-3 h-3" />
                                          Add
                                        </button>
                                        <button
                                          onClick={() => markRecommendationAsImplemented(suggestion, 'architecture')}
                                          className="btn btn-success-outline btn-sm"
                                          title="Mark as implemented"
                                        >
                                          Done
                                        </button>
                                      </div>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}

                        {/* Skills to Develop */}
                        {recommendations.skillsToDevelop && recommendations.skillsToDevelop.length > 0 && (
                          <div>
                            <h4 className="text-[#E0E0E0] font-semibold mb-3 flex items-center gap-2">
                              <Target className="w-4 h-4 text-[#FFC107]" />
                              Skills to Develop
                            </h4>
                            <div className="space-y-3">
                              {recommendations.skillsToDevelop.map((skill, index) => {
                                const skillText = `Develop ${skill.skill}: ${skill.reason}`;
                                const isImplemented = isRecommendationImplemented(skillText, 'skill');
                                return (
                                  <div key={index} className={`bg-[#1E1E1E] rounded-lg p-3 border ${
                                    isImplemented ? 'border-[#28A745] border-opacity-50 opacity-75' : 'border-[#2A2A2A]'
                                  }`}>
                                    <div className="flex items-center justify-between mb-1">
                                      <span className={`font-medium ${isImplemented ? 'text-[#888888] line-through' : 'text-[#E0E0E0]'}`}>
                                        {skill.skill}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <span className={`text-xs px-2 py-1 rounded ${
                                          skill.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                                          skill.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                          'bg-blue-500/20 text-blue-400'
                                        }`}>
                                          {skill.priority}
                                        </span>
                                        {!isImplemented && (
                                          <button
                                            onClick={() => markRecommendationAsImplemented(skillText, 'skill')}
                                            className="btn btn-success-outline btn-sm"
                                            title="Mark as implemented"
                                          >
                                            Done
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                    <p className={`text-xs ${isImplemented ? 'text-[#666666]' : 'text-[#888888]'}`}>{skill.reason}</p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Interview Readiness */}
                        {recommendations.interviewReadiness && recommendations.interviewReadiness.length > 0 && (
                          <div>
                            <h4 className="text-[#E0E0E0] font-semibold mb-3 flex items-center gap-2">
                              <Clock className="w-4 h-4 text-[#28A745]" />
                              Interview Readiness
                            </h4>
                            <ul className="space-y-2">
                              {recommendations.interviewReadiness.map((point, index) => {
                                const isImplemented = isRecommendationImplemented(point, 'interview');
                                return (
                                  <li key={index} className={`flex items-start gap-3 text-sm bg-[#1E1E1E] rounded-lg p-3 border ${
                                    isImplemented ? 'border-[#28A745] border-opacity-50 opacity-75' : 'border-[#2A2A2A]'
                                  }`}>
                                    <span className={`font-semibold flex-shrink-0 mt-0.5 ${
                                      isImplemented ? 'text-[#28A745]' : 'text-[#28A745]'
                                    }`}>
                                      {isImplemented ? '✓' : '✓'}
                                    </span>
                                    <span className={`flex-1 ${isImplemented ? 'text-[#888888] line-through' : 'text-[#B0B0B0]'}`}>
                                      {point}
                                    </span>
                                    {!isImplemented && (
                                      <button
                                        onClick={() => markRecommendationAsImplemented(point, 'interview')}
                                        className="btn btn-success btn-sm bg-opacity-20 border border-[#28A745] border-opacity-30 hover:bg-opacity-30 flex-shrink-0"
                                        title="Mark as implemented"
                                      >
                                        Done
                                      </button>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}

                        {/* Next Steps */}
                        {recommendations.nextSteps && recommendations.nextSteps.length > 0 && (
                          <div>
                            <h4 className="text-[#E0E0E0] font-semibold mb-3 flex items-center gap-2">
                              <Plus className="w-4 h-4 text-[#0070F3]" />
                              Next Steps
                            </h4>
                            <ol className="space-y-2">
                              {recommendations.nextSteps.map((step, index) => {
                                const isImplemented = isRecommendationImplemented(step, 'nextstep');
                                return (
                                  <li key={index} className={`flex items-start gap-3 text-sm bg-[#1E1E1E] rounded-lg p-3 border ${
                                    isImplemented ? 'border-[#28A745] border-opacity-50 opacity-75' : 'border-[#2A2A2A]'
                                  }`}>
                                    <span className={`font-semibold flex-shrink-0 mt-0.5 ${
                                      isImplemented ? 'text-[#28A745]' : 'text-[#0070F3]'
                                    }`}>
                                      {isImplemented ? '✓' : `${index + 1}.`}
                                    </span>
                                    <span className={`flex-1 ${isImplemented ? 'text-[#888888] line-through' : 'text-[#B0B0B0]'}`}>
                                      {step}
                                    </span>
                                    {!isImplemented && (
                                      <div className="flex gap-2 flex-shrink-0">
                                        <button
                                          onClick={() => addRecommendationAsMilestone(step, 'nextstep')}
                                          className="btn btn-primary btn-sm"
                                          title="Add as milestone"
                                        >
                                          <Plus className="w-3 h-3" />
                                          Add
                                        </button>
                                        <button
                                          onClick={() => markRecommendationAsImplemented(step, 'nextstep')}
                                          className="btn btn-success-outline btn-sm"
                                          title="Mark as implemented"
                                        >
                                          Done
                                        </button>
                                      </div>
                                    )}
                                  </li>
                                );
                              })}
                            </ol>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-[#888888] text-sm">Failed to load recommendations. Please try again.</div>
                    )}
                  </div>
                )}
              </div>
            </div>
            ) : (
              <div className="bg-[#252525] rounded-lg p-6 border border-[#2A2A2A] text-center">
                <p className="text-[#888888]">Select a project to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
