import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Bot, User, Cpu } from 'lucide-react';
import { aiAPI } from '../src/lib/api';

// Component to show current model info
function ModelInfo() {
  const { data: modelInfo } = useQuery({
    queryKey: ['ai-model'],
    queryFn: () => aiAPI.getModel(),
    refetchOnWindowFocus: false,
    retry: false,
    enabled: !!localStorage.getItem('token'),
  });

  if (!modelInfo?.model) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-[#888888] bg-[#1E1E1E] px-3 py-1.5 rounded-lg border border-[#2A2A2A]" role="status" aria-label={`Using AI model: ${modelInfo.model}`}>
      <Cpu className="w-3 h-3" aria-hidden="true" />
      <span>Using: {modelInfo.model}</span>
    </div>
  );
}

export function AIMentor() {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  // Fetch messages
  const { data, isLoading } = useQuery({
    queryKey: ['ai-messages'],
    queryFn: () => aiAPI.getMessages(50),
  });

  const messages = data || [];

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (message) => aiAPI.sendMessage(message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-messages'] });
      setIsTyping(false);
    },
    onError: (error) => {
      setIsTyping(false);
      console.error('Failed to send message:', error);
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize with welcome message if no messages
  useEffect(() => {
    if (!isLoading && messages.length === 0) {
      // The welcome message will be shown via UI, not stored initially
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    setInput('');
    setIsTyping(true);

    try {
      await sendMessageMutation.mutateAsync(userMessage);
    } catch (error) {
      // Error is already handled by the mutation's onError
      // Just log for debugging
      console.error('Failed to send message:', error);
    }
  };

  const suggestedQuestions = [
    "How do I explain my project in an interview?",
    "What's the difference between async/await and callbacks?",
    "Help me understand database indexing",
    "How should I structure my API?",
  ];

  // Show welcome message if no messages yet
  const displayMessages = messages.length === 0 ? [
    {
      id: 'welcome',
      role: 'mentor',
      content: "Hi! I'm your AI mentor. I'm here to help you understand concepts, review your code, answer questions, and guide your learning journey. What would you like to work on today?",
      created_at: new Date().toISOString(),
    },
  ] : messages;

  return (
    <div className="flex flex-col h-screen bg-[#1E1E1E]">
      {/* Header */}
      <header className="bg-[#252525] border-b border-[#2A2A2A] p-6" role="banner">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-[#E0E0E0] mb-2">AI Mentor</h1>
              <p className="text-[#888888]">Your safe space to ask anything. No question is too basic.</p>
            </div>
            <ModelInfo />
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6" role="log" aria-label="Conversation with AI mentor">
        <div className="max-w-4xl mx-auto space-y-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="text-[#888888]" role="status" aria-live="polite" aria-label="Loading messages">Loading messages...</div>
            </div>
          ) : (
            <>
              {displayMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'mentor' && (
                    <div className="w-10 h-10 rounded-lg bg-[#0070F3] flex items-center justify-center flex-shrink-0" aria-label="AI Mentor">
                      <Bot className="w-6 h-6 text-white" aria-hidden="true" />
                    </div>
                  )}
                  <div
                    className={`max-w-2xl rounded-lg p-4 ${
                      message.role === 'user'
                        ? 'bg-[#0070F3] text-white'
                        : 'bg-[#252525] text-[#E0E0E0] border border-[#2A2A2A]'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <span className="text-xs opacity-70 mt-2 block">
                      {new Date(message.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  {message.role === 'user' && (
                    <div className="w-10 h-10 rounded-lg bg-[#252525] border border-[#2A2A2A] flex items-center justify-center flex-shrink-0" aria-label="You">
                      <User className="w-6 h-6 text-[#E0E0E0]" aria-hidden="true" />
                    </div>
                  )}
                </div>
              ))}
            </>
          )}

          {isTyping && (
            <div className="flex gap-4" role="status" aria-live="polite" aria-label="AI mentor is typing">
              <div className="w-10 h-10 rounded-lg bg-[#0070F3] flex items-center justify-center flex-shrink-0" aria-label="AI Mentor">
                <Bot className="w-6 h-6 text-white" aria-hidden="true" />
              </div>
              <div className="bg-[#252525] rounded-lg p-4 border border-[#2A2A2A]">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-[#888888] rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-[#888888] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-[#888888] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Suggested Questions */}
      {displayMessages.length === 1 && !isLoading && (
        <div className="px-6 pb-4">
          <div className="max-w-4xl mx-auto">
            <p className="text-sm text-[#888888] mb-3">Suggested questions:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {suggestedQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => setInput(question)}
                  className="text-left text-sm text-[#E0E0E0] bg-[#252525] border border-[#2A2A2A] rounded-lg p-3 hover:border-[#0070F3] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0070F3] focus:ring-offset-2 focus:ring-offset-[#1E1E1E]"
                  aria-label={`Use suggested question: ${question}`}
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="bg-[#252525] border-t border-[#2A2A2A] p-6" role="form" aria-label="Send message to AI mentor">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            <label htmlFor="message-input" className="sr-only">Message input</label>
            <input
              type="text"
              id="message-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask anything... concepts, code, career advice"
              disabled={isTyping}
              className="flex-1 bg-[#1E1E1E] text-[#E0E0E0] border border-[#2A2A2A] rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0070F3] focus:border-[#0070F3] placeholder-[#666666] disabled:opacity-50"
              aria-label="Type your message to the AI mentor"
              aria-disabled={isTyping}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="btn btn-primary btn-lg focus:outline-none focus:ring-2 focus:ring-[#0070F3] focus:ring-offset-2 focus:ring-offset-[#252525]"
              aria-label="Send message"
              aria-disabled={!input.trim() || isTyping}
            >
              <Send className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
          {sendMessageMutation.isError && (
            <div className="mt-2" role="alert" aria-live="assertive">
              <p className="text-red-400 text-sm">
                {sendMessageMutation.error?.response?.data?.error || 
                 sendMessageMutation.error?.message || 
                 'Failed to send message. Please try again.'}
              </p>
              {sendMessageMutation.error?.response?.status === 503 && (
                <p className="text-yellow-400 text-xs mt-1">
                  Tip: Make sure OPENAI_API_KEY is set in your server's .env file
                </p>
              )}
              {(sendMessageMutation.error?.code === 'ECONNREFUSED' || 
                sendMessageMutation.error?.message?.includes('Network Error') ||
                sendMessageMutation.error?.message?.includes('Network error')) && (
                <p className="text-yellow-400 text-xs mt-1">
                  Tip: Make sure the server is running on port 5000
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
