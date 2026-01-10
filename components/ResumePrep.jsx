import { useState, useEffect } from 'react';
import { FileText, Copy, Check, Sparkles, AlertCircle, MessageSquare, Target, Upload, Download, Edit2, Save, X, Loader2, CheckCircle, XCircle, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsAPI, resumesAPI } from '../src/lib/api';

export function ResumePrep() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('bullets'); // 'bullets', 'upload', 'editor'
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [resumeContent, setResumeContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showStarAnswers, setShowStarAnswers] = useState(false);
  const [starSituation, setStarSituation] = useState('');
  const [starTask, setStarTask] = useState('');
  const [starAction, setStarAction] = useState('');
  const [starResult, setStarResult] = useState('');
  const [generatedStarAnswer, setGeneratedStarAnswer] = useState(null);
  const [editDecisions, setEditDecisions] = useState({}); // Track approve/disapprove for each edit

  // Fetch projects
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsAPI.getAll,
  });

  // Fetch project bullets
  const { data: bulletsByProject = [], isLoading: bulletsLoading, refetch: refetchBullets } = useQuery({
    queryKey: ['project-bullets'],
    queryFn: resumesAPI.getProjectBullets,
  });

  // Fetch resume
  const { data: resume, isLoading: resumeLoading, refetch: refetchResume } = useQuery({
    queryKey: ['resume'],
    queryFn: resumesAPI.get,
  });

  // Set first project as selected
  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  // Load resume content when resume is fetched
  useEffect(() => {
    if (resume?.content) {
      setResumeContent(resume.content);
    }
  }, [resume]);

  // Generate bullets mutation
  const generateBulletsMutation = useMutation({
    mutationFn: (projectId) => resumesAPI.generateProjectBullets(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries(['project-bullets']);
    },
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: (file) => resumesAPI.upload(file),
    onSuccess: (data) => {
      queryClient.invalidateQueries(['resume']);
      // Set the uploaded file and content immediately
      setUploadedFile(data);
      if (data.content) {
        setResumeContent(data.content);
      }
      setIsUploading(false);
      setActiveTab('editor');
    },
    onError: () => {
      setIsUploading(false);
    },
  });

  // Feedback mutation
  const feedbackMutation = useMutation({
    mutationFn: ({ resumeId, content }) => resumesAPI.getFeedback(resumeId, content),
  });

  // Recommendations mutation
  const recommendationsMutation = useMutation({
    mutationFn: ({ resumeId, content }) => resumesAPI.getRecommendations(resumeId, content),
  });

  // Update resume mutation
  const updateResumeMutation = useMutation({
    mutationFn: ({ id, content }) => resumesAPI.update(id, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries(['resume']);
      setIsEditing(false);
    },
  });

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    uploadMutation.mutate(file);
  };

  const handleGenerateBullets = (projectId) => {
    generateBulletsMutation.mutate(projectId);
  };

  const handleGetFeedback = () => {
    if (resume?.id) {
      feedbackMutation.mutate({ resumeId: resume.id, content: resumeContent });
    } else if (resumeContent) {
      feedbackMutation.mutate({ content: resumeContent });
    }
  };

  const handleGetRecommendations = () => {
    if (resume?.id) {
      recommendationsMutation.mutate({ resumeId: resume.id, content: resumeContent });
      setEditDecisions({}); // Reset decisions when getting new recommendations
    } else if (resumeContent) {
      recommendationsMutation.mutate({ content: resumeContent });
      setEditDecisions({}); // Reset decisions when getting new recommendations
    }
  };

  const handleApproveEdit = (editId) => {
    setEditDecisions(prev => ({ ...prev, [editId]: 'approved' }));
  };

  const handleDisapproveEdit = (editId) => {
    setEditDecisions(prev => ({ ...prev, [editId]: 'disapproved' }));
  };

  const handleApplyApprovedEdits = () => {
    if (!recommendationsMutation.data?.edits) return;

    let updatedContent = resumeContent;
    const approvedEdits = recommendationsMutation.data.edits.filter(
      edit => editDecisions[edit.id] === 'approved'
    );

    if (approvedEdits.length === 0) {
      alert('No edits approved. Please approve at least one edit to apply changes.');
      return;
    }

    // Apply edits one at a time, tracking positions
    // Sort by position in document (from end to start to maintain indices)
    const editsWithPositions = approvedEdits
      .map(edit => ({
        ...edit,
        position: updatedContent.indexOf(edit.originalText)
      }))
      .filter(edit => edit.position !== -1) // Only include edits where original text is found
      .sort((a, b) => b.position - a.position); // Sort from end to start

    // Apply edits from end to start to maintain correct indices
    editsWithPositions.forEach(edit => {
      // Replace only the first occurrence at the found position
      const before = updatedContent.substring(0, edit.position);
      const after = updatedContent.substring(edit.position + edit.originalText.length);
      updatedContent = before + edit.suggestedText + after;
    });

    setResumeContent(updatedContent);
    setEditDecisions({}); // Clear decisions after applying
    
    // Auto-save the updated content
    if (resume?.id) {
      updateResumeMutation.mutate({ id: resume.id, content: updatedContent });
    } else {
      // If no resume ID, just update the local state
      alert(`Applied ${editsWithPositions.length} edit(s) to your resume. Don't forget to save!`);
    }
  };

  const handleSaveResume = () => {
    if (resume?.id) {
      updateResumeMutation.mutate({ id: resume.id, content: resumeContent });
    }
  };

  const handleDownload = async () => {
    if (!resume?.id) return;

    try {
      const response = await resumesAPI.download(resume.id);
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = resume.fileName || 'resume.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download resume');
    }
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const selectedProjectBullets = bulletsByProject.find(b => b.projectId === selectedProjectId);

  return (
    <div className="p-8 bg-[#1E1E1E] min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-[#E0E0E0] mb-2">Resume Builder</h1>
          <p className="text-[#888888]">Transform your projects into compelling, hire-ready resume bullets</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-[#2A2A2A]">
          <button
            onClick={() => setActiveTab('bullets')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'bullets'
                ? 'text-[#0070F3] border-b-2 border-[#0070F3]'
                : 'text-[#888888] hover:text-[#E0E0E0]'
            }`}
          >
            Project Bullets
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'upload'
                ? 'text-[#0070F3] border-b-2 border-[#0070F3]'
                : 'text-[#888888] hover:text-[#E0E0E0]'
            }`}
          >
            Upload Resume
          </button>
          <button
            onClick={() => setActiveTab('editor')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'editor'
                ? 'text-[#0070F3] border-b-2 border-[#0070F3]'
                : 'text-[#888888] hover:text-[#E0E0E0]'
            }`}
          >
            Resume Editor
          </button>
        </div>

        {/* Project Bullets Tab */}
        {activeTab === 'bullets' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Project Selection Sidebar */}
            <div className="bg-[#252525] rounded-lg p-6 border border-[#2A2A2A] lg:col-span-1">
              <h2 className="text-lg font-semibold text-[#E0E0E0] mb-4">Your Projects</h2>
              {projectsLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-6 h-6 text-[#888888] animate-spin mx-auto" />
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-[#888888] text-sm mb-4">No projects yet</p>
                  <p className="text-[#666666] text-xs">Create projects in the Project Builder</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => setSelectedProjectId(project.id)}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                        selectedProjectId === project.id
                          ? 'bg-[#0070F3] text-white'
                          : 'bg-[#1E1E1E] text-[#E0E0E0] hover:bg-[#2A2A2A]'
                      }`}
                    >
                      {project.name}
                    </button>
                  ))}
                </div>
              )}

              {/* STAR Template Reference */}
              <div className="mt-6 bg-[#1E1E1E] rounded-lg p-4 border border-[#FFC107] border-opacity-30">
                <h3 className="text-sm font-semibold text-[#FFC107] mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  STAR Framework
                </h3>
                <div className="space-y-2 text-xs text-[#B0B0B0]">
                  <div>
                    <span className="text-[#E0E0E0] font-semibold">S</span>ituation
                  </div>
                  <div>
                    <span className="text-[#E0E0E0] font-semibold">T</span>ask
                  </div>
                  <div>
                    <span className="text-[#E0E0E0] font-semibold">A</span>ction
                  </div>
                  <div>
                    <span className="text-[#E0E0E0] font-semibold">R</span>esult
                  </div>
                </div>
              </div>
            </div>

            {/* Bullets Content */}
            <div className="lg:col-span-2 space-y-6">
              {selectedProject ? (
                <>
                  {/* Generate Bullets Button */}
                  {!selectedProjectBullets && (
                    <div className="bg-[#252525] rounded-lg p-6 border border-[#2A2A2A]">
                      <div className="text-center py-8">
                        <Sparkles className="w-12 h-12 text-[#0070F3] mx-auto mb-4" />
                        <p className="text-[#E0E0E0] mb-4">No bullets generated yet for this project</p>
                        <button
                          onClick={() => handleGenerateBullets(selectedProjectId)}
                          disabled={generateBulletsMutation.isPending}
                          className="bg-[#0070F3] text-white px-6 py-3 rounded-lg hover:bg-[#0060D9] transition-colors flex items-center gap-2 mx-auto disabled:opacity-50"
                        >
                          {generateBulletsMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4" />
                              Generate AI Bullets
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Display Bullets */}
                  {selectedProjectBullets && selectedProjectBullets.bullets && (
                    <div className="bg-[#252525] rounded-lg p-6 border border-[#2A2A2A]">
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-[#E0E0E0] flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-[#0070F3]" />
                          AI-Enhanced Bullets for {selectedProjectBullets.projectName}
                        </h2>
                        <button
                          onClick={() => handleGenerateBullets(selectedProjectId)}
                          disabled={generateBulletsMutation.isPending}
                          className="text-sm text-[#0070F3] hover:text-[#0060D9] hover:underline disabled:opacity-50"
                        >
                          Regenerate
                        </button>
                      </div>

                      <div className="space-y-6">
                        {selectedProjectBullets.bullets.map((bullet, index) => (
                          <div key={bullet.id} className="bg-[#1E1E1E] rounded-lg p-5 border border-[#2A2A2A]">
                            {/* Original */}
                            {bullet.originalDescription && (
                              <div className="mb-4">
                                <p className="text-xs text-[#888888] mb-2">Before:</p>
                                <p className="text-sm text-[#B0B0B0] line-through opacity-60">{bullet.originalDescription}</p>
                              </div>
                            )}

                            {/* Improved */}
                            <div className="mb-4">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs text-[#28A745] font-semibold">After:</p>
                                <button
                                  onClick={() => copyToClipboard(bullet.enhancedBullet, `bullet-${bullet.id}`)}
                                  className="flex items-center gap-1 text-xs text-[#0070F3] hover:text-[#0060D9] hover:underline"
                                >
                                  {copiedIndex === `bullet-${bullet.id}` ? (
                                    <>
                                      <Check className="w-3 h-3" />
                                      Copied!
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      Copy
                                    </>
                                  )}
                                </button>
                              </div>
                              <p className="text-[#E0E0E0] leading-relaxed">{bullet.enhancedBullet}</p>
                            </div>

                            {/* Impact & Keywords */}
                            {bullet.impactExplanation && (
                              <div className="pt-4 border-t border-[#2A2A2A]">
                                <p className="text-xs text-[#888888] mb-2">Why this works:</p>
                                <p className="text-sm text-[#B0B0B0] mb-3">{bullet.impactExplanation}</p>
                                {bullet.keywords && bullet.keywords.length > 0 && (
                                  <div className="flex flex-wrap gap-2">
                                    {bullet.keywords.map((keyword, kidx) => (
                                      <span
                                        key={kidx}
                                        className="text-xs bg-[#252525] text-[#0070F3] px-2 py-1 rounded border border-[#0070F3] border-opacity-30"
                                      >
                                        {keyword}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* STAR Format Section */}
                  <div className="bg-[#252525] rounded-lg p-6 border border-[#2A2A2A]">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold text-[#E0E0E0] flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-[#0070F3]" />
                        STAR Format Interview Answers
                      </h2>
                      <button
                        onClick={() => setShowStarAnswers(!showStarAnswers)}
                        className="text-sm text-[#0070F3] hover:text-[#0060D9] hover:underline"
                      >
                        {showStarAnswers ? 'Hide' : 'Show'} Generator
                      </button>
                    </div>
                    
                    {showStarAnswers && (
                      <div className="space-y-4 mt-6">
                        <div>
                          <label className="block text-sm text-[#B0B0B0] mb-2">
                            <strong className="text-[#E0E0E0]">S</strong>ituation
                          </label>
                          <textarea
                            value={starSituation}
                            onChange={(e) => setStarSituation(e.target.value)}
                            placeholder="e.g., Building an e-commerce API that needed to handle authentication..."
                            className="w-full bg-[#1E1E1E] text-[#E0E0E0] border border-[#2A2A2A] rounded-lg p-3 focus:outline-none focus:border-[#0070F3] placeholder-[#666666] resize-none"
                            rows={2}
                          />
                        </div>

                        <div>
                          <label className="block text-sm text-[#B0B0B0] mb-2">
                            <strong className="text-[#E0E0E0]">T</strong>ask
                          </label>
                          <textarea
                            value={starTask}
                            onChange={(e) => setStarTask(e.target.value)}
                            placeholder="e.g., I was responsible for designing the authentication system..."
                            className="w-full bg-[#1E1E1E] text-[#E0E0E0] border border-[#2A2A2A] rounded-lg p-3 focus:outline-none focus:border-[#0070F3] placeholder-[#666666] resize-none"
                            rows={2}
                          />
                        </div>

                        <div>
                          <label className="block text-sm text-[#B0B0B0] mb-2">
                            <strong className="text-[#E0E0E0]">A</strong>ction
                          </label>
                          <textarea
                            value={starAction}
                            onChange={(e) => setStarAction(e.target.value)}
                            placeholder="e.g., I chose JWT over sessions because we needed stateless auth..."
                            className="w-full bg-[#1E1E1E] text-[#E0E0E0] border border-[#2A2A2A] rounded-lg p-3 focus:outline-none focus:border-[#0070F3] placeholder-[#666666] resize-none"
                            rows={4}
                          />
                        </div>

                        <div>
                          <label className="block text-sm text-[#B0B0B0] mb-2">
                            <strong className="text-[#E0E0E0]">R</strong>esult
                          </label>
                          <textarea
                            value={starResult}
                            onChange={(e) => setStarResult(e.target.value)}
                            placeholder="e.g., Successfully handled 10K+ daily transactions..."
                            className="w-full bg-[#1E1E1E] text-[#E0E0E0] border border-[#2A2A2A] rounded-lg p-3 focus:outline-none focus:border-[#0070F3] placeholder-[#666666] resize-none"
                            rows={2}
                          />
                        </div>

                        <button
                          onClick={() => {
                            if (!starSituation || !starTask || !starAction || !starResult) {
                              alert('Please fill in all STAR components');
                              return;
                            }
                            
                            const starAnswer = `**Situation:** ${starSituation}\n\n**Task:** ${starTask}\n\n**Action:** ${starAction}\n\n**Result:** ${starResult}`;
                            setGeneratedStarAnswer(starAnswer);
                          }}
                          className="w-full bg-[#0070F3] text-white py-3 rounded-lg hover:bg-[#0060D9] transition-colors flex items-center justify-center gap-2"
                        >
                          <Sparkles className="w-4 h-4" />
                          Generate STAR Answer
                        </button>

                        {generatedStarAnswer && (
                          <div className="bg-[#1E1E1E] rounded-lg p-4 border border-[#28A745] border-opacity-30">
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-xs text-[#28A745] font-semibold">Generated STAR Answer:</p>
                              <button
                                onClick={() => copyToClipboard(generatedStarAnswer, 'star')}
                                className="flex items-center gap-1 text-xs text-[#0070F3] hover:text-[#0060D9] hover:underline"
                              >
                                {copiedIndex === 'star' ? (
                                  <>
                                    <Check className="w-3 h-3" />
                                    Copied!
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    Copy
                                  </>
                                )}
                              </button>
                            </div>
                            <pre className="text-sm text-[#E0E0E0] whitespace-pre-wrap font-sans">{generatedStarAnswer}</pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="bg-[#252525] rounded-lg p-6 border border-[#2A2A2A] text-center py-12">
                  <p className="text-[#888888]">Select a project to generate bullets</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Upload Resume Tab */}
        {activeTab === 'upload' && (
          <div className="bg-[#252525] rounded-lg p-8 border border-[#2A2A2A]">
            <h2 className="text-xl font-semibold text-[#E0E0E0] mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5 text-[#0070F3]" />
              Upload Your Resume
            </h2>
            
            <div className="border-2 border-dashed border-[#2A2A2A] rounded-lg p-12 text-center hover:border-[#0070F3] transition-colors">
              <input
                type="file"
                id="resume-upload"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isUploading}
              />
              <label
                htmlFor="resume-upload"
                className={`cursor-pointer ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Upload className="w-12 h-12 text-[#0070F3] mx-auto mb-4" />
                <p className="text-[#E0E0E0] mb-2">
                  {isUploading ? 'Uploading...' : 'Click to upload or drag and drop'}
                </p>
                <p className="text-sm text-[#888888]">PDF, DOC, DOCX, or TXT (Max 5MB)</p>
              </label>
            </div>

            {uploadMutation.error && (
              <div className="mt-4 bg-red-900 bg-opacity-30 border border-red-500 rounded-lg p-3">
                <p className="text-red-400 text-sm">
                  {uploadMutation.error.response?.data?.error || uploadMutation.error.message || 'Failed to upload resume'}
                </p>
              </div>
            )}

            {uploadedFile && (
              <div className="mt-6 bg-[#1E1E1E] rounded-lg p-4 border border-[#28A745] border-opacity-30">
                <p className="text-[#28A745] text-sm font-semibold mb-2">✓ Resume uploaded successfully!</p>
                <p className="text-[#B0B0B0] text-sm">{uploadedFile.fileName}</p>
              </div>
            )}
          </div>
        )}

        {/* Resume Editor Tab */}
        {activeTab === 'editor' && (
          <div className="space-y-6">
            {resumeLoading ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 text-[#888888] animate-spin mx-auto" />
              </div>
            ) : resume ? (
              <>
                <div className="bg-[#252525] rounded-lg p-6 border border-[#2A2A2A]">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-semibold text-[#E0E0E0] flex items-center gap-2">
                        <FileText className="w-5 h-5 text-[#0070F3]" />
                        Resume Editor
                      </h2>
                      <p className="text-sm text-[#888888] mt-1">{resume.fileName || 'Resume'}</p>
                    </div>
                    <div className="flex gap-2">
                      {isEditing ? (
                        <>
                          <button
                            onClick={handleSaveResume}
                            disabled={updateResumeMutation.isPending}
                            className="bg-[#28A745] text-white px-4 py-2 rounded-lg hover:bg-[#218838] transition-colors flex items-center gap-2 disabled:opacity-50"
                          >
                            {updateResumeMutation.isPending ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="w-4 h-4" />
                                Save
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setIsEditing(false);
                              setResumeContent(resume.content || '');
                            }}
                            className="bg-[#1E1E1E] text-[#E0E0E0] px-4 py-2 rounded-lg border border-[#2A2A2A] hover:border-[#2A2A2A] transition-colors flex items-center gap-2"
                          >
                            <X className="w-4 h-4" />
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setIsEditing(true)}
                            className="bg-[#0070F3] text-white px-4 py-2 rounded-lg hover:bg-[#0060D9] transition-colors flex items-center gap-2"
                          >
                            <Edit2 className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            onClick={handleDownload}
                            className="bg-[#1E1E1E] text-[#E0E0E0] px-4 py-2 rounded-lg border border-[#2A2A2A] hover:border-[#0070F3] transition-colors flex items-center gap-2"
                          >
                            <Download className="w-4 h-4" />
                            Download
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <textarea
                    value={resumeContent || ''}
                    onChange={(e) => setResumeContent(e.target.value)}
                    disabled={!isEditing}
                    className="w-full bg-[#1E1E1E] text-[#E0E0E0] border border-[#2A2A2A] rounded-lg p-4 focus:outline-none focus:border-[#0070F3] placeholder-[#666666] resize-none min-h-[500px] font-mono text-sm disabled:opacity-60 whitespace-pre-wrap"
                    placeholder={resumeContent ? "" : "Resume content will appear here after upload..."}
                  />
                </div>

                {/* AI Recommendations Section */}
                <div className="bg-[#252525] rounded-lg p-6 border border-[#2A2A2A]">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-[#E0E0E0] flex items-center gap-2">
                      <Target className="w-5 h-5 text-[#0070F3]" />
                      AI Recommendations
                    </h2>
                    <button
                      onClick={handleGetRecommendations}
                      disabled={recommendationsMutation.isPending || !resumeContent}
                      className="bg-[#0070F3] text-white px-4 py-2 rounded-lg hover:bg-[#0060D9] transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      {recommendationsMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Get Recommendations
                        </>
                      )}
                    </button>
                  </div>

                  {recommendationsMutation.error && (
                    <div className="mb-4 bg-red-900 bg-opacity-30 border border-red-500 rounded-lg p-3">
                      <p className="text-red-400 text-sm">
                        {recommendationsMutation.error.response?.data?.error || recommendationsMutation.error.message || 'Failed to get recommendations'}
                      </p>
                    </div>
                  )}

                  {recommendationsMutation.data && (
                    <div className="space-y-4">
                      {recommendationsMutation.data.summary && (
                        <div className="bg-[#1E1E1E] rounded-lg p-4 border border-[#0070F3] border-opacity-30">
                          <p className="text-sm font-semibold text-[#0070F3] mb-2">Summary:</p>
                          <p className="text-sm text-[#E0E0E0]">{recommendationsMutation.data.summary}</p>
                        </div>
                      )}

                      {recommendationsMutation.data.edits && recommendationsMutation.data.edits.length > 0 && (
                        <>
                          <div className="flex items-center justify-between mb-4">
                            <p className="text-sm text-[#888888]">
                              {recommendationsMutation.data.edits.filter(e => editDecisions[e.id] === 'approved').length} of {recommendationsMutation.data.edits.length} edits approved
                            </p>
                            {recommendationsMutation.data.edits.filter(e => editDecisions[e.id] === 'approved').length > 0 && (
                              <button
                                onClick={handleApplyApprovedEdits}
                                disabled={updateResumeMutation.isPending}
                                className="bg-[#28A745] text-white px-4 py-2 rounded-lg hover:bg-[#218838] transition-colors flex items-center gap-2 disabled:opacity-50"
                              >
                                {updateResumeMutation.isPending ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Applying...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="w-4 h-4" />
                                    Apply Approved Edits
                                  </>
                                )}
                              </button>
                            )}
                          </div>

                          <div className="space-y-4">
                            {recommendationsMutation.data.edits.map((edit) => {
                              const decision = editDecisions[edit.id];
                              const priorityColors = {
                                high: 'border-[#D9534F] bg-[#D9534F] bg-opacity-10',
                                medium: 'border-[#FFC107] bg-[#FFC107] bg-opacity-10',
                                low: 'border-[#28A745] bg-[#28A745] bg-opacity-10',
                              };
                              const categoryColors = {
                                'Action Verb': 'text-[#0070F3]',
                                'Quantification': 'text-[#28A745]',
                                'ATS Optimization': 'text-[#FFC107]',
                                'Technical Depth': 'text-[#9C27B0]',
                                'Clarity': 'text-[#00BCD4]',
                                'Structure': 'text-[#FF9800]',
                              };

                              return (
                                <div
                                  key={edit.id}
                                  className={`bg-[#1E1E1E] rounded-lg p-4 border-2 ${
                                    decision === 'approved'
                                      ? 'border-[#28A745] bg-[#28A745] bg-opacity-10'
                                      : decision === 'disapproved'
                                      ? 'border-[#D9534F] bg-[#D9534F] bg-opacity-10 opacity-60'
                                      : priorityColors[edit.priority] || 'border-[#2A2A2A]'
                                  }`}
                                >
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <span className={`text-xs font-semibold px-2 py-1 rounded ${categoryColors[edit.category] || 'text-[#888888]'} bg-[#252525]`}>
                                          {edit.category}
                                        </span>
                                        <span className={`text-xs px-2 py-1 rounded ${
                                          edit.priority === 'high' ? 'bg-[#D9534F] bg-opacity-20 text-[#D9534F]' :
                                          edit.priority === 'medium' ? 'bg-[#FFC107] bg-opacity-20 text-[#FFC107]' :
                                          'bg-[#28A745] bg-opacity-20 text-[#28A745]'
                                        }`}>
                                          {edit.priority} priority
                                        </span>
                                        {decision === 'approved' && (
                                          <span className="text-xs bg-[#28A745] bg-opacity-20 text-[#28A745] px-2 py-1 rounded flex items-center gap-1">
                                            <CheckCircle className="w-3 h-3" />
                                            Approved
                                          </span>
                                        )}
                                        {decision === 'disapproved' && (
                                          <span className="text-xs bg-[#D9534F] bg-opacity-20 text-[#D9534F] px-2 py-1 rounded flex items-center gap-1">
                                            <XCircle className="w-3 h-3" />
                                            Disapproved
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-xs text-[#888888] mb-2">{edit.reason}</p>
                                    </div>
                                    {!decision && (
                                      <div className="flex gap-2 ml-4">
                                        <button
                                          onClick={() => handleApproveEdit(edit.id)}
                                          className="p-2 bg-[#28A745] bg-opacity-20 hover:bg-[#28A745] hover:bg-opacity-30 rounded-lg transition-colors"
                                          title="Approve this edit"
                                        >
                                          <ThumbsUp className="w-4 h-4 text-[#28A745]" />
                                        </button>
                                        <button
                                          onClick={() => handleDisapproveEdit(edit.id)}
                                          className="p-2 bg-[#D9534F] bg-opacity-20 hover:bg-[#D9534F] hover:bg-opacity-30 rounded-lg transition-colors"
                                          title="Disapprove this edit"
                                        >
                                          <ThumbsDown className="w-4 h-4 text-[#D9534F]" />
                                        </button>
                                      </div>
                                    )}
                                    {decision && (
                                      <div className="flex gap-2 ml-4">
                                        <button
                                          onClick={() => setEditDecisions(prev => {
                                            const newDecisions = { ...prev };
                                            delete newDecisions[edit.id];
                                            return newDecisions;
                                          })}
                                          className="text-xs text-[#888888] hover:text-[#E0E0E0] underline"
                                        >
                                          Undo
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                  <div className="space-y-3">
                                    <div>
                                      <p className="text-xs text-[#888888] mb-1">Original:</p>
                                      <div className="bg-[#171717] rounded p-3 border border-[#2A2A2A]">
                                        <p className="text-sm text-[#B0B0B0] line-through">{edit.originalText}</p>
                                      </div>
                                    </div>
                                    <div>
                                      <p className="text-xs text-[#28A745] mb-1 font-semibold">Suggested:</p>
                                      <div className="bg-[#171717] rounded p-3 border border-[#28A745] border-opacity-30">
                                        <p className="text-sm text-[#E0E0E0]">{edit.suggestedText}</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* AI Feedback Section */}
                <div className="bg-[#252525] rounded-lg p-6 border border-[#2A2A2A]">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-[#E0E0E0] flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-[#0070F3]" />
                      AI Feedback
                    </h2>
                    <button
                      onClick={handleGetFeedback}
                      disabled={feedbackMutation.isPending || !resumeContent}
                      className="bg-[#0070F3] text-white px-4 py-2 rounded-lg hover:bg-[#0060D9] transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      {feedbackMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Get Feedback
                        </>
                      )}
                    </button>
                  </div>

                  {feedbackMutation.error && (
                    <div className="mb-4 bg-red-900 bg-opacity-30 border border-red-500 rounded-lg p-3">
                      <p className="text-red-400 text-sm">
                        {feedbackMutation.error.response?.data?.error || feedbackMutation.error.message || 'Failed to get feedback'}
                      </p>
                    </div>
                  )}

                  {feedbackMutation.data && (
                    <div className="bg-[#1E1E1E] rounded-lg p-4 border border-[#28A745] border-opacity-30">
                      <p className="text-sm text-[#E0E0E0] whitespace-pre-wrap">{feedbackMutation.data}</p>
                    </div>
                  )}

                  {resume.aiFeedback && !feedbackMutation.data && (
                    <div className="bg-[#1E1E1E] rounded-lg p-4 border border-[#2A2A2A]">
                      <p className="text-xs text-[#888888] mb-2">Previous feedback:</p>
                      <p className="text-sm text-[#E0E0E0] whitespace-pre-wrap">{resume.aiFeedback}</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="bg-[#252525] rounded-lg p-12 border border-[#2A2A2A] text-center">
                <FileText className="w-16 h-16 text-[#666666] mx-auto mb-4" />
                <p className="text-[#888888] mb-4">No resume uploaded yet</p>
                <button
                  onClick={() => setActiveTab('upload')}
                  className="bg-[#0070F3] text-white px-6 py-3 rounded-lg hover:bg-[#0060D9] transition-colors flex items-center gap-2 mx-auto"
                >
                  <Upload className="w-4 h-4" />
                  Upload Resume
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
