import { useState, useEffect } from 'react';
import { Code, Database, Globe, Layers, Lock, Zap, BookOpen, Plus, Trash2, Sparkles, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { conceptsAPI } from '../src/lib/api';

// Icon mapping for categories
const categoryIcons = {
  JavaScript: Zap,
  Database: Database,
  Backend: Globe,
  Security: Lock,
  Frontend: Globe,
  General: BookOpen,
  Default: BookOpen,
};

const getIconForCategory = (category) => {
  return categoryIcons[category] || categoryIcons.Default;
};

export function ConceptExplainer() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [copiedCode, setCopiedCode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [generateTopic, setGenerateTopic] = useState('');
  const [generateCategory, setGenerateCategory] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch concepts
  const { data: conceptsData, isLoading, error } = useQuery({
    queryKey: ['concepts'],
    queryFn: () => conceptsAPI.getAll(),
  });

  const concepts = conceptsData || [];
  const [selectedConcept, setSelectedConcept] = useState(null);

  // Set first concept as selected when concepts load
  useEffect(() => {
    if (concepts.length > 0 && !selectedConcept) {
      setSelectedConcept(concepts[0]);
    }
  }, [concepts, selectedConcept]);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => conceptsAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['concepts']);
      // If deleted concept was selected, select first available
      if (selectedConcept && concepts.length > 1) {
        const remaining = concepts.filter(c => c.id !== selectedConcept.id);
        setSelectedConcept(remaining[0] || null);
      } else if (concepts.length === 1) {
        setSelectedConcept(null);
      }
    },
  });

  // Generate mutation
  const generateMutation = useMutation({
    mutationFn: ({ topic, category }) => conceptsAPI.generate(topic, category),
    onSuccess: (newConcept) => {
      queryClient.invalidateQueries(['concepts']);
      setSelectedConcept(newConcept);
      setShowGenerateDialog(false);
      setGenerateTopic('');
      setGenerateCategory('');
      setIsGenerating(false);
    },
    onError: () => {
      setIsGenerating(false);
    },
  });

  const filteredConcepts = concepts.filter(
    (concept) =>
      concept.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      concept.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const copyCodeToClipboard = () => {
    if (selectedConcept?.example) {
      navigator.clipboard.writeText(selectedConcept.example);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const askMentorAboutConcept = () => {
    navigate('/mentor');
  };

  const handleGenerate = async () => {
    if (!generateTopic.trim()) return;
    
    setIsGenerating(true);
    generateMutation.mutate({
      topic: generateTopic.trim(),
      category: generateCategory.trim() || undefined,
    });
  };

  const handleDelete = (conceptId, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this concept?')) {
      deleteMutation.mutate(conceptId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#1E1E1E]">
        <div className="text-center">
          <BookOpen className="w-16 h-16 text-[#666666] mx-auto mb-4 animate-pulse" />
          <p className="text-[#888888]">Loading concepts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#1E1E1E]">
        <div className="text-center">
          <p className="text-red-500 mb-4">Error loading concepts: {error.message}</p>
          <button
            onClick={() => queryClient.invalidateQueries(['concepts'])}
            className="btn btn-primary btn-md"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#1E1E1E]">
      {/* Sidebar - Concept List */}
      <div className="w-80 bg-[#252525] border-r border-[#2A2A2A] flex flex-col">
        <div className="p-6 border-b border-[#2A2A2A]">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-semibold text-[#E0E0E0]">Concept Explainer</h1>
            <button
              onClick={() => setShowGenerateDialog(true)}
              className="btn btn-primary btn-icon"
              title="Generate new concept"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <input
            type="text"
            placeholder="Search concepts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1E1E1E] text-[#E0E0E0] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0070F3] placeholder-[#666666]"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredConcepts.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="w-12 h-12 text-[#666666] mx-auto mb-4" />
              <p className="text-[#888888] text-sm mb-4">No concepts found</p>
              <button
                onClick={() => setShowGenerateDialog(true)}
                className="btn btn-primary btn-sm mx-auto"
              >
                <Sparkles className="w-4 h-4" />
                Generate Concept
              </button>
            </div>
          ) : (
            filteredConcepts.map((concept) => {
              const Icon = getIconForCategory(concept.category);
              return (
                <div
                  key={concept.id}
                  className={`relative group rounded-lg transition-colors ${
                    selectedConcept?.id === concept.id
                      ? 'bg-[#0070F3] text-white'
                      : 'bg-[#1E1E1E] text-[#E0E0E0] hover:bg-[#2A2A2A]'
                  }`}
                >
                  <button
                    onClick={() => setSelectedConcept(concept)}
                    className="w-full text-left p-4 pr-10"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span className="font-medium">{concept.title}</span>
                    </div>
                    <span className={`text-xs ${selectedConcept?.id === concept.id ? 'opacity-90' : 'opacity-80'}`}>
                      {concept.category}
                    </span>
                  </button>
                  <button
                    onClick={(e) => handleDelete(concept.id, e)}
                    className={`absolute top-2 right-2 p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                      selectedConcept?.id === concept.id
                        ? 'hover:bg-blue-600 text-white'
                        : 'hover:bg-red-600 text-white bg-[#2A2A2A]'
                    }`}
                    title="Delete concept"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Content - Concept Details */}
      <div className="flex-1 overflow-y-auto">
        {selectedConcept ? (
          <div className="max-w-4xl mx-auto p-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-lg bg-[#0070F3] flex items-center justify-center">
                  {(() => {
                    const Icon = getIconForCategory(selectedConcept.category);
                    return <Icon className="w-6 h-6 text-white" />;
                  })()}
                </div>
                <div className="flex-1">
                  <h1 className="text-3xl font-semibold text-[#E0E0E0]">{selectedConcept.title}</h1>
                  <p className="text-[#888888]">{selectedConcept.category}</p>
                </div>
              </div>
              <p className="text-lg text-[#B0B0B0]">{selectedConcept.description}</p>
            </div>

            {/* What Problem It Solves */}
            {selectedConcept.problemItSolves && (
              <div className="mb-8 bg-[#252525] rounded-lg p-6 border border-[#2A2A2A]">
                <h2 className="text-xl font-semibold text-[#E0E0E0] mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[#0070F3]" />
                  What Problem Does This Solve?
                </h2>
                <p className="text-[#B0B0B0] whitespace-pre-wrap">{selectedConcept.problemItSolves}</p>
              </div>
            )}

            {/* How It Works Under The Hood */}
            {selectedConcept.howItWorksUnderHood && (
              <div className="mb-8 bg-[#252525] rounded-lg p-6 border border-[#2A2A2A]">
                <h2 className="text-xl font-semibold text-[#E0E0E0] mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[#0070F3]" />
                  How It Works Under The Hood
                </h2>
                <p className="text-[#B0B0B0] whitespace-pre-wrap">{selectedConcept.howItWorksUnderHood}</p>
              </div>
            )}

            {/* Common Junior Mistakes */}
            {selectedConcept.commonJuniorMistakes && selectedConcept.commonJuniorMistakes.length > 0 && (
              <div className="mb-8 bg-[#252525] rounded-lg p-6 border border-[#FFC107] border-opacity-30">
                <h2 className="text-xl font-semibold text-[#FFC107] mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[#FFC107]" />
                  Common Mistakes Juniors Make
                </h2>
                <ul className="space-y-3">
                  {selectedConcept.commonJuniorMistakes.map((mistake, index) => (
                    <li key={index} className="flex gap-3 text-[#B0B0B0]">
                      <span className="text-[#FFC107] font-semibold flex-shrink-0">⚠️</span>
                      {mistake}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Senior Engineer Perspective */}
            {selectedConcept.seniorEngineerPerspective && (
              <div className="mb-8 bg-[#252525] rounded-lg p-6 border border-[#28A745] border-opacity-30">
                <h2 className="text-xl font-semibold text-[#28A745] mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[#28A745]" />
                  How a Senior Engineer Thinks About This
                </h2>
                <p className="text-[#B0B0B0] whitespace-pre-wrap">{selectedConcept.seniorEngineerPerspective}</p>
              </div>
            )}

            {/* Key Points */}
            {selectedConcept.keyPoints && selectedConcept.keyPoints.length > 0 && (
              <div className="mb-8 bg-[#252525] rounded-lg p-6 border border-[#2A2A2A]">
                <h2 className="text-xl font-semibold text-[#E0E0E0] mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[#0070F3]" />
                  Key Concepts
                </h2>
                <ul className="space-y-3">
                  {selectedConcept.keyPoints.map((point, index) => (
                    <li key={index} className="flex gap-3 text-[#B0B0B0]">
                      <span className="text-[#0070F3] font-semibold flex-shrink-0">{index + 1}.</span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Code Example */}
            {selectedConcept.example && (
              <div className="mb-8 bg-[#252525] rounded-lg border border-[#2A2A2A] overflow-hidden">
                <div className="bg-[#1E1E1E] px-6 py-3 border-b border-[#2A2A2A] flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-[#E0E0E0] flex items-center gap-2">
                    <Code className="w-5 h-5 text-[#0070F3]" />
                    Code Example
                  </h2>
                  <button 
                    onClick={copyCodeToClipboard}
                    className="text-sm text-[#0070F3] hover:underline"
                  >
                    {copiedCode ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <pre className="p-6 overflow-x-auto">
                  <code className="text-sm text-[#B0B0B0] font-mono">{selectedConcept.example}</code>
                </pre>
              </div>
            )}

            {/* Related Concepts */}
            {selectedConcept.relatedConcepts && selectedConcept.relatedConcepts.length > 0 && (
              <div className="bg-[#252525] rounded-lg p-6 border border-[#2A2A2A]">
                <h2 className="text-xl font-semibold text-[#E0E0E0] mb-4 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[#0070F3]" />
                  Related Concepts
                </h2>
                <div className="flex flex-wrap gap-3">
                  {selectedConcept.relatedConcepts.map((related, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setSearchQuery(related);
                        const found = concepts.find(c => 
                          c.title.toLowerCase().includes(related.toLowerCase())
                        );
                        if (found) setSelectedConcept(found);
                      }}
                      className="px-4 py-2 bg-[#1E1E1E] text-[#E0E0E0] rounded-lg border border-[#2A2A2A] hover:border-[#0070F3] transition-colors text-sm"
                    >
                      {related}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Ask Mentor */}
            <div className="mt-8 bg-[#252525] rounded-lg p-6 border border-[#FFC107] border-opacity-30">
              <p className="text-[#E0E0E0] mb-3">Still confused about this concept?</p>
              <button 
                onClick={askMentorAboutConcept}
                className="btn btn-primary btn-md"
              >
                Ask Your Mentor
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <BookOpen className="w-16 h-16 text-[#666666] mx-auto mb-4" />
              <p className="text-[#888888] mb-4">No concepts yet</p>
              <button
                onClick={() => setShowGenerateDialog(true)}
                className="btn btn-primary btn-md mx-auto"
              >
                <Sparkles className="w-5 h-5" />
                Generate Your First Concept
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Generate Concept Dialog */}
      {showGenerateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#252525] rounded-lg p-6 w-full max-w-md border border-[#2A2A2A]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-[#E0E0E0] flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#0070F3]" />
                Generate New Concept
              </h2>
              <button
                onClick={() => {
                  setShowGenerateDialog(false);
                  setGenerateTopic('');
                  setGenerateCategory('');
                }}
                className="text-[#888888] hover:text-[#E0E0E0]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#E0E0E0] mb-2">
                  Concept Topic *
                </label>
                <input
                  type="text"
                  value={generateTopic}
                  onChange={(e) => setGenerateTopic(e.target.value)}
                  placeholder="e.g., React Hooks, GraphQL, Docker..."
                  className="w-full bg-[#1E1E1E] text-[#E0E0E0] border border-[#2A2A2A] rounded-lg px-3 py-2 focus:outline-none focus:border-[#0070F3] placeholder-[#666666]"
                  disabled={isGenerating}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#E0E0E0] mb-2">
                  Category (optional)
                </label>
                <input
                  type="text"
                  value={generateCategory}
                  onChange={(e) => setGenerateCategory(e.target.value)}
                  placeholder="e.g., JavaScript, Backend, Database..."
                  className="w-full bg-[#1E1E1E] text-[#E0E0E0] border border-[#2A2A2A] rounded-lg px-3 py-2 focus:outline-none focus:border-[#0070F3] placeholder-[#666666]"
                  disabled={isGenerating}
                />
              </div>

              {generateMutation.error && (
                <div className="bg-red-900 bg-opacity-30 border border-red-500 rounded-lg p-3">
                  <p className="text-red-400 text-sm">
                    {generateMutation.error.response?.data?.error || generateMutation.error.message || 'Failed to generate concept'}
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleGenerate}
                  disabled={!generateTopic.trim() || isGenerating}
                  className="btn btn-primary btn-md flex-1"
                >
                  {isGenerating ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowGenerateDialog(false);
                    setGenerateTopic('');
                    setGenerateCategory('');
                  }}
                  disabled={isGenerating}
                  className="px-4 py-2 bg-[#1E1E1E] text-[#E0E0E0] rounded-lg border border-[#2A2A2A] hover:border-[#2A2A2A] transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
