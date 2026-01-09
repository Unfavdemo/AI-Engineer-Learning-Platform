import { useNavigate } from 'react-router-dom';
import { 
  Code, 
  MessageSquare, 
  BookOpen, 
  Target, 
  TrendingUp, 
  Zap, 
  CheckCircle,
  ArrowRight,
  Sparkles,
  BarChart3
} from 'lucide-react';

export function LandingPage() {
  const navigate = useNavigate();

  const features = [
    {
      icon: MessageSquare,
      title: 'AI Mentor',
      description: 'Get instant guidance on concepts, code reviews, and career advice from your AI mentor',
      color: 'text-[#0070F3]',
    },
    {
      icon: Code,
      title: 'Project Builder',
      description: 'Build interview-worthy projects with templates and milestone tracking',
      color: 'text-[#28A745]',
    },
    {
      icon: BookOpen,
      title: 'Concept Explainer',
      description: 'Deep dive into technical concepts with senior engineer perspectives',
      color: 'text-[#FFC107]',
    },
    {
      icon: Target,
      title: 'Interview Practice',
      description: 'Practice explaining your projects with AI-powered feedback',
      color: 'text-[#D9534F]',
    },
    {
      icon: TrendingUp,
      title: 'Skill Tracker',
      description: 'Track your progress and identify areas for growth',
      color: 'text-[#9C27B0]',
    },
    {
      icon: Sparkles,
      title: 'Resume Builder',
      description: 'Transform your projects into compelling, hire-ready resume bullets',
      color: 'text-[#00BCD4]',
    },
  ];

  const benefits = [
    'Build projects that demonstrate engineering thinking',
    'Get AI-powered feedback on your explanations',
    'Learn concepts from a senior engineer perspective',
    'Track your skills and identify gaps',
    'Practice interview scenarios with realistic feedback',
    'Create resume bullets that get you hired',
  ];

  return (
    <div className="min-h-screen bg-[#1E1E1E] text-[#E0E0E0]">
      {/* Navigation */}
      <nav className="border-b border-[#2A2A2A] bg-[#171717]" aria-label="Main navigation">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code className="w-6 h-6 text-[#0070F3]" aria-hidden="true" />
            <span className="text-xl font-semibold">AI Engineer</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/login')}
              className="text-[#B0B0B0] hover:text-[#E0E0E0] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0070F3] focus:ring-offset-2 focus:ring-offset-[#171717] rounded"
              aria-label="Login to your account"
            >
              Login
            </button>
            <button
              onClick={() => navigate('/login')}
              className="btn btn-primary btn-md focus:outline-none focus:ring-2 focus:ring-[#0070F3] focus:ring-offset-2 focus:ring-offset-[#171717]"
              aria-label="Get started with AI Engineer"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-20" aria-labelledby="hero-heading">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-[#0070F3]/20 text-[#0070F3] px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            <span>Transform Your Engineering Career</span>
          </div>
          <h1 id="hero-heading" className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-[#E0E0E0] to-[#B0B0B0] bg-clip-text text-transparent">
            Build Projects That Get You Hired
          </h1>
          <p className="text-xl text-[#888888] max-w-2xl mx-auto mb-8">
            Stop building tutorial projects. Start building projects that demonstrate engineering thinking, 
            problem-solving, and scalability awareness—the skills that get you $70k+ offers.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/login')}
              className="btn btn-primary btn-lg focus:outline-none focus:ring-2 focus:ring-[#0070F3] focus:ring-offset-2 focus:ring-offset-[#1E1E1E]"
              aria-label="Start learning for free"
            >
              Start Learning Free
              <ArrowRight className="w-5 h-5" aria-hidden="true" />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="btn btn-secondary btn-lg focus:outline-none focus:ring-2 focus:ring-[#0070F3] focus:ring-offset-2 focus:ring-offset-[#1E1E1E]"
              aria-label="See how it works"
            >
              See How It Works
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          <div className="bg-[#252525] rounded-lg p-6 border border-[#2A2A2A] text-center">
            <div className="text-3xl font-bold text-[#0070F3] mb-2">10K+</div>
            <div className="text-[#888888]">Engineers Learning</div>
          </div>
          <div className="bg-[#252525] rounded-lg p-6 border border-[#2A2A2A] text-center">
            <div className="text-3xl font-bold text-[#28A745] mb-2">$70k+</div>
            <div className="text-[#888888]">Average Starting Salary</div>
          </div>
          <div className="bg-[#252525] rounded-lg p-6 border border-[#2A2A2A] text-center">
            <div className="text-3xl font-bold text-[#FFC107] mb-2">500+</div>
            <div className="text-[#888888]">Projects Built</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-[#171717] py-20" aria-labelledby="features-heading">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 id="features-heading" className="text-4xl font-bold mb-4">Everything You Need to Land Your Dream Job</h2>
            <p className="text-[#888888] text-lg max-w-2xl mx-auto">
              A complete platform to build your skills, create impressive projects, and ace your interviews
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-[#252525] rounded-lg p-6 border border-[#2A2A2A] hover:border-[#0070F3] transition-colors"
              >
                <div className={`w-12 h-12 rounded-lg bg-[#1E1E1E] flex items-center justify-center mb-4 ${feature.color}`}>
                  <feature.icon className="w-6 h-6" aria-hidden="true" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-[#888888]">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="max-w-7xl mx-auto px-6 py-20" aria-labelledby="benefits-heading">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 id="benefits-heading" className="text-4xl font-bold mb-6">
              Why Engineers Choose Our Platform
            </h2>
            <p className="text-[#888888] text-lg mb-8">
              We don't just teach you to code. We teach you to think like an engineer—understanding 
              trade-offs, scalability, and the "why" behind every decision.
            </p>
            <div className="space-y-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-[#28A745] flex-shrink-0 mt-0.5" />
                  <span className="text-[#E0E0E0]">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-[#252525] rounded-lg p-8 border border-[#2A2A2A]">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#0070F3] flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Build Real Projects</h3>
                  <p className="text-sm text-[#888888]">Not tutorials—actual projects that demonstrate your skills</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#28A745] flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Track Your Progress</h3>
                  <p className="text-sm text-[#888888]">See your skills improve with detailed analytics</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#FFC107] flex items-center justify-center">
                  <Target className="w-6 h-6 text-white" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Ace Interviews</h3>
                  <p className="text-sm text-[#888888]">Practice with AI-powered feedback and STAR format</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-[#0070F3] to-[#0060D9] py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to Transform Your Career?</h2>
          <p className="text-xl text-white/90 mb-8">
            Join thousands of engineers building their path to $70k+ offers
          </p>
          <button
            onClick={() => navigate('/login')}
            className="bg-white text-[#0070F3] px-8 py-4 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 text-lg font-semibold mx-auto focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#0070F3]"
            aria-label="Get started for free"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#171717] border-t border-[#2A2A2A] py-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <Code className="w-5 h-5 text-[#0070F3]" aria-hidden="true" />
              <span className="font-semibold">AI Engineer Learning Platform</span>
            </div>
            <div className="text-[#888888] text-sm">
              © 2024 AI Engineer. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
