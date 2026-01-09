import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Play, Square, Mic, MicOff, Clock, CheckCircle, AlertCircle, TrendingUp, Target, XCircle, AlertTriangle, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { projectsAPI, practiceAPI } from '../src/lib/api';

export function PracticeMode() {
  const [session, setSession] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [userResponse, setUserResponse] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [micPermission, setMicPermission] = useState(null); // null = not checked, 'granted', 'denied', 'prompt'
  const [showMicPrompt, setShowMicPrompt] = useState(false);
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [micTestTranscript, setMicTestTranscript] = useState('');
  
  // Speech recognition and synthesis refs
  const recognitionRef = useRef(null);
  const synthRef = useRef(null);
  const testRecognitionRef = useRef(null);
  const testTranscriptRef = useRef(''); // Track test transcript across callbacks
  const shouldKeepTestingRef = useRef(false); // Track if we should keep testing (avoids state timing issues)
  
  // Fetch projects from API
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsAPI.getAll,
  });
  
  // Fetch past sessions
  const { data: pastSessions = [], refetch: refetchSessions } = useQuery({
    queryKey: ['practice-sessions'],
    queryFn: practiceAPI.getSessions,
  });

  // Analyze response mutation
  const analyzeResponseMutation = useMutation({
    mutationFn: practiceAPI.analyzeResponse,
    onSuccess: (analysis) => {
      setIsAnalyzing(false);
      if (session) {
        const updatedQuestions = [...session.questions];
        updatedQuestions[session.currentQuestion] = {
          ...updatedQuestions[session.currentQuestion],
          answered: true,
          userResponse: userResponse, // Store the transcript
          feedback: analysis.feedback || '',
          score: analysis.score || 0,
          clarity: analysis.clarity || 0,
          depth: analysis.depth || 0,
          redFlags: analysis.redFlags || [],
          hireReadiness: analysis.hireReadiness || 'getting-there',
          strengths: analysis.strengths || [],
          improvements: analysis.improvements || [],
          acceptanceCriteria: analysis.acceptanceCriteria || [],
          canProceed: analysis.canProceed !== undefined ? analysis.canProceed : (analysis.score >= 60 && (analysis.acceptanceCriteria || []).filter(c => c.met).length >= 2),
        };
        
        setSession({
          ...session,
          questions: updatedQuestions,
        });
      }
    },
    onError: (error) => {
      setIsAnalyzing(false);
      console.error('Analysis error:', error);
      alert(error.response?.data?.error || 'Failed to analyze response. Please try again.');
    },
  });

  // Check microphone permission status
  const checkMicPermission = async () => {
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const result = await navigator.permissions.query({ name: 'microphone' });
        setMicPermission(result.state);
        
        // Listen for permission changes
        result.onchange = () => {
          setMicPermission(result.state);
        };
      } catch (e) {
        // Fallback for browsers that don't support permissions API
        console.log('Permissions API not fully supported');
      }
    }
  };

  // Test microphone functionality
  const testMicrophone = async () => {
    if (isTestingMic) {
      // Stop testing
      shouldKeepTestingRef.current = false;
      if (testRecognitionRef.current) {
        try {
          testRecognitionRef.current.stop();
        } catch (e) {
          console.error('Error stopping test recognition:', e);
        }
      }
      setIsTestingMic(false);
      setMicTestTranscript('');
      testTranscriptRef.current = '';
      return;
    }

    // Check for browser support
    if (typeof window === 'undefined') {
      alert('Browser not supported');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    // Request microphone permission first if not already granted
    if (micPermission !== 'granted') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Permission granted - stop the stream immediately (we just needed permission)
        stream.getTracks().forEach(track => track.stop());
        setMicPermission('granted');
      } catch (error) {
        console.error('Microphone permission error:', error);
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          setMicPermission('denied');
          alert('Microphone permission denied. Please enable microphone access in your browser settings.');
          return;
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          alert('No microphone found. Please connect a microphone device.');
          return;
        } else {
          alert('Failed to access microphone. Please check your browser settings.');
          return;
        }
      }
    }

    // Stop any ongoing recognition from the main session
    if (recognitionRef.current && isRecording) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore errors
      }
    }

    // Create new recognition instance for testing
    testTranscriptRef.current = ''; // Reset transcript for new test
    shouldKeepTestingRef.current = true; // Set flag to keep testing
    
    try {
      testRecognitionRef.current = new SpeechRecognition();
      testRecognitionRef.current.continuous = true;
      testRecognitionRef.current.interimResults = true;
      testRecognitionRef.current.lang = 'en-US';

      testRecognitionRef.current.onresult = (event) => {
        console.log('🎤 Test recognition onresult fired!', { 
          resultIndex: event.resultIndex, 
          resultsLength: event.results.length,
          event: event
        });
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          const isFinal = event.results[i].isFinal;
          const confidence = event.results[i][0].confidence;
          console.log(`📝 Result ${i}:`, { transcript, isFinal, confidence });
          
          if (isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }
        
        testTranscriptRef.current += finalTranscript;
        const displayText = testTranscriptRef.current + (interimTranscript || '');
        console.log('✅ Updating transcript:', { 
          finalTranscript, 
          interimTranscript, 
          full: testTranscriptRef.current, 
          displayText,
          displayLength: displayText.length
        });
        setMicTestTranscript(displayText || '🎤 Listening... Speak clearly into your microphone.');
      };

      testRecognitionRef.current.onerror = (event) => {
        console.error('Test recognition error:', event.error, event);
        if (event.error === 'not-allowed') {
          setMicPermission('denied');
          alert('Microphone permission denied. Please enable microphone access in your browser settings.');
          setIsTestingMic(false);
          setMicTestTranscript('');
          testTranscriptRef.current = '';
        } else if (event.error === 'no-speech') {
          // This is normal - recognition ends after a period of no speech
          // The onend handler will restart it if we're still testing
          console.log('No speech detected - recognition will restart automatically');
          // Don't update the message or stop - let onend handle the restart
        } else if (event.error === 'audio-capture') {
          alert('No microphone found. Please connect a microphone device.');
          setIsTestingMic(false);
          setMicTestTranscript('');
          testTranscriptRef.current = '';
        } else if (event.error === 'aborted') {
          // User stopped manually or recognition was stopped
          shouldKeepTestingRef.current = false;
          setIsTestingMic(false);
        } else if (event.error === 'network') {
          setMicTestTranscript('Network error. Please check your internet connection and try again.');
          shouldKeepTestingRef.current = false;
          setIsTestingMic(false);
        } else {
          console.error('Recognition error:', event.error);
          setMicTestTranscript(`Error: ${event.error}. Please try again or check browser console for details.`);
          shouldKeepTestingRef.current = false;
          setIsTestingMic(false);
        }
      };

      testRecognitionRef.current.onstart = () => {
        console.log('✅ Test recognition started successfully - onstart callback fired');
        setMicTestTranscript('🎤 Listening... Speak clearly into your microphone. Say something now!');
      };

      testRecognitionRef.current.onend = () => {
        console.log('⚠️ Test recognition ended', { 
          transcript: testTranscriptRef.current,
          transcriptLength: testTranscriptRef.current.length,
          shouldKeepTesting: shouldKeepTestingRef.current,
          hasRecognition: !!testRecognitionRef.current
        });
        
        // Use ref instead of state to avoid timing issues
        // Always try to restart if we should keep testing
        if (shouldKeepTestingRef.current && testRecognitionRef.current) {
          console.log('🔄 Recognition ended but should keep testing - restarting in 100ms...');
          setTimeout(() => {
            // Double-check the ref before restarting
            if (shouldKeepTestingRef.current && testRecognitionRef.current) {
              try {
                console.log('🔄 Attempting to restart recognition...');
                testRecognitionRef.current.start();
                console.log('✅ Successfully restarted recognition');
              } catch (restartError) {
                console.log('⚠️ Restart error:', restartError.message || restartError);
                // If it says "already started", that's fine - it's working
                if (restartError.message && !restartError.message.includes('already') && !restartError.message.includes('aborted')) {
                  // Only show error if it's not the "already started" or "aborted" error
                  console.error('❌ Failed to restart recognition:', restartError);
                  // If restart fails, stop testing
                  shouldKeepTestingRef.current = false;
                  setIsTestingMic(false);
                  setMicTestTranscript('❌ Recognition stopped. Please try testing again.');
                } else {
                  console.log('✅ Restart error is expected (already started or aborted)');
                }
              }
            } else {
              console.log('⏹️ Stopped restarting - shouldKeepTesting is false or recognition is null');
            }
          }, 100);
        } else {
          // User stopped testing or flag is false
          console.log('⏹️ Not restarting - user stopped or flag is false');
          setIsTestingMic(false);
          if (testTranscriptRef.current === '' || testTranscriptRef.current.trim() === '') {
            setMicTestTranscript('Test ended. No speech was detected. Make sure your microphone is working and try again.');
          }
        }
      };

      console.log('Starting test recognition...');
      shouldKeepTestingRef.current = true; // Set flag before starting
      setIsTestingMic(true);
      setMicTestTranscript('Initializing... Please wait.');
      
      // Small delay to ensure everything is set up
      setTimeout(() => {
        try {
          console.log('Calling recognition.start()...', {
            hasRecognition: !!testRecognitionRef.current,
            continuous: testRecognitionRef.current?.continuous,
            lang: testRecognitionRef.current?.lang
          });
          
          if (!testRecognitionRef.current) {
            throw new Error('Recognition object is null');
          }
          
          testRecognitionRef.current.start();
          console.log('✅ Recognition start() called successfully - waiting for onstart callback...');
          
          // Fallback: Update message after a delay even if onstart doesn't fire
          // This helps if onstart callback has issues
          setTimeout(() => {
            if (shouldKeepTestingRef.current && micTestTranscript === 'Initializing... Please wait.') {
              console.log('⚠️ onstart callback may not have fired - updating message as fallback');
              setMicTestTranscript('🎤 Listening... (If you see this, recognition may have started. Try speaking.)');
            }
          }, 1000);
        } catch (startError) {
          console.error('❌ Error starting test recognition:', startError);
          shouldKeepTestingRef.current = false;
          setIsTestingMic(false);
          if (startError.message && startError.message.includes('already')) {
            // Already started, that's fine
            console.log('✅ Recognition already started - continuing');
            setMicTestTranscript('🎤 Listening... Speak clearly into your microphone.');
          } else {
            const errorMsg = startError.message || startError.toString() || 'Unknown error';
            console.error('❌ Start error details:', { error: startError, message: errorMsg, stack: startError.stack });
            setMicTestTranscript(`❌ Error: ${errorMsg}. Please check permissions and try again.`);
            alert(`Failed to start microphone test: ${errorMsg}\n\nCheck the browser console (F12) for more details.`);
            testTranscriptRef.current = '';
          }
        }
      }, 100);
    } catch (createError) {
      console.error('Error creating test recognition:', createError);
      alert(`Failed to initialize microphone test: ${createError.message || 'Unknown error'}. Please refresh the page and try again.`);
      setIsTestingMic(false);
    }
  };

  // Request microphone permission explicitly
  const requestMicPermission = async () => {
    try {
      // Request permission by trying to get user media
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Permission granted - stop the stream immediately (we just needed permission)
      stream.getTracks().forEach(track => track.stop());
      setMicPermission('granted');
      setShowMicPrompt(false);
      return true;
    } catch (error) {
      console.error('Microphone permission error:', error);
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setMicPermission('denied');
        setShowMicPrompt(false);
        alert('Microphone permission was denied. Please enable microphone access in your browser settings to use voice features.');
        return false;
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        alert('No microphone found. Please connect a microphone device.');
        return false;
      } else {
        alert('Failed to access microphone. Please check your browser settings.');
        return false;
      }
    }
  };

  // Initialize speech recognition and synthesis
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check microphone permission on mount
      checkMicPermission();
      
      // Check for Web Speech API support
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const speechSynthesis = window.speechSynthesis;
      
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';
        
        recognitionRef.current.onresult = (event) => {
          let interimTranscript = '';
          let finalTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            } else {
              interimTranscript += transcript;
            }
          }
          
          setUserResponse(prev => prev + finalTranscript);
        };
        
        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          if (event.error === 'no-speech') {
            // This is normal when user stops speaking
          } else if (event.error === 'audio-capture') {
            alert('No microphone found. Please connect a microphone.');
            setIsRecording(false);
          } else if (event.error === 'not-allowed') {
            alert('Microphone permission denied. Please enable microphone access in your browser settings.');
            setIsRecording(false);
          } else if (event.error === 'aborted') {
            // User stopped recognition manually
            setIsRecording(false);
          }
        };
        
        recognitionRef.current.onend = () => {
          // Check if we should still be recording (use a flag that won't cause closure issues)
          // We'll handle restart in the toggleRecording function instead
        };
      } else {
        console.warn('Speech recognition not supported in this browser. Please use Chrome, Edge, or Safari.');
      }
      
      if (speechSynthesis) {
        synthRef.current = speechSynthesis;
        // Load voices (needed for some browsers)
        if (speechSynthesis.getVoices().length === 0) {
          speechSynthesis.addEventListener('voiceschanged', () => {
            // Voices loaded
          });
        }
      } else {
        console.warn('Speech synthesis not supported in this browser');
      }
    }
    
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors on cleanup
        }
      }
      if (testRecognitionRef.current) {
        try {
          testRecognitionRef.current.stop();
        } catch (e) {
          // Ignore errors on cleanup
        }
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);
  

  // Timer effect
  useEffect(() => {
    if (session?.isActive) {
      const interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [session?.isActive]);

  // Speak question using text-to-speech
  const speakQuestion = (text) => {
    if (!synthRef.current) {
      console.warn('Speech synthesis not available');
      return;
    }
    
    // Cancel any ongoing speech (this will trigger 'interrupted' error on previous utterance, which is expected)
    synthRef.current.cancel();
    
    // Small delay to ensure cancellation is processed and to avoid speaking state conflicts
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9; // Slightly slower for clarity
      utterance.pitch = 1;
      utterance.volume = 1;
      
      // Try to use a natural-sounding voice
      const voices = synthRef.current.getVoices();
      // Prefer voices that sound natural (Google, Microsoft voices)
      const preferredVoice = voices.find(voice => 
        (voice.name.includes('Google') && voice.lang.startsWith('en')) ||
        (voice.name.includes('Microsoft') && voice.lang.startsWith('en')) ||
        (voice.name.includes('Samantha') && voice.lang.startsWith('en')) ||
        (voice.name.includes('Zira') && voice.lang.startsWith('en'))
      ) || voices.find(voice => voice.lang.startsWith('en-US')) || voices.find(voice => voice.lang.startsWith('en'));
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = (e) => {
        // "interrupted" error is expected when cancelling speech - not a real error
        if (e.error === 'interrupted' || e.error === 'canceled') {
          setIsSpeaking(false);
          return;
        }
        // Log actual errors (network issues, voice not available, etc.)
        console.error('Speech synthesis error:', e.error, e);
        setIsSpeaking(false);
      };
      
      synthRef.current.speak(utterance);
    }, 100);
  };

  // Stop speaking
  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  const startSession = async (project) => {
    // Check microphone permission when starting a session
    await checkMicPermission();
    
    const questions = [
      {
        id: 1,
        text: 'Walk me through the architecture of this project at a high level.',
        category: 'Architecture',
        answered: false,
      },
      {
        id: 2,
        text: 'What were the key technical challenges you faced, and how did you solve them?',
        category: 'Problem Solving',
        answered: false,
      },
      {
        id: 3,
        text: 'Why did you choose this tech stack over alternatives?',
        category: 'Technical Decisions',
        answered: false,
      },
      {
        id: 4,
        text: 'How did you handle authentication and authorization?',
        category: 'Security',
        answered: false,
      },
      {
        id: 5,
        text: 'What would you improve if you had more time?',
        category: 'Reflection',
        answered: false,
      },
    ];
    
    setSession({
      id: Date.now(),
      projectName: project.name,
      projectId: project.id,
      currentQuestion: 0,
      isActive: true,
      questions,
    });
    setElapsedTime(0);
    setUserResponse('');
    
    // Speak the first question after a short delay
    setTimeout(() => {
      speakQuestion(questions[0].text);
    }, 500);
  };

  const nextQuestion = async () => {
    if (!session) return;
    
    const currentQ = session.questions[session.currentQuestion];
    
    // Check if question is already answered and if we can proceed
    if (currentQ.answered) {
      // Check acceptance criteria
      if (currentQ.canProceed === false) {
        alert('Please meet the acceptance criteria before proceeding. Record a new response or improve your answer.');
        return;
      }
      
      // Criteria met, proceed to next question
      if (session.currentQuestion < session.questions.length - 1) {
        const nextQ = session.questions[session.currentQuestion + 1];
        setSession({
          ...session,
          currentQuestion: session.currentQuestion + 1,
        });
        setUserResponse(''); // Clear response for next question
        
        // Speak the next question
        setTimeout(() => {
          speakQuestion(nextQ.text);
        }, 500);
      } else {
        // End session
        setSession({
          ...session,
          isActive: false,
        });
        refetchSessions(); // Refresh past sessions
      }
      return;
    }
    
    // Stop recording if still recording
    if (isRecording) {
      toggleRecording();
    }
    
    // Stop any ongoing speech
    stopSpeaking();
    
    // If we have a user response, analyze it first
    if (userResponse.trim().length > 0) {
      setIsAnalyzing(true);
      
      try {
        await analyzeResponseMutation.mutateAsync({
          question: currentQ.text,
          questionCategory: currentQ.category,
          userResponse: userResponse.trim(),
          projectName: session.projectName,
        });
        // Analysis complete, don't auto-advance - let user review feedback and criteria
        // User must click "Next Question" again if criteria are met
      } catch (error) {
        console.error('Failed to analyze response:', error);
        setIsAnalyzing(false);
        return; // Don't proceed if analysis fails
      }
    } else {
      alert('Please record your response before proceeding.');
    }
  };

  const toggleRecording = async () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
      return;
    }
    
    if (isRecording) {
      // Stop recording
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error('Error stopping recognition:', e);
      }
      setIsRecording(false);
    } else {
      // Check microphone permission before starting
      if (micPermission === 'denied') {
        alert('Microphone permission was denied. Please enable microphone access in your browser settings.');
        return;
      }
      
      // If permission not granted, request it
      if (micPermission !== 'granted') {
        setShowMicPrompt(true);
        return;
      }
      
      // Start recording
      setUserResponse(''); // Clear previous response
      try {
        // Stop any ongoing speech when starting to record
        stopSpeaking();
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (e) {
        console.error('Error starting recognition:', e);
        if (e.message && e.message.includes('already')) {
          // Already started, just update state
          setIsRecording(true);
        } else if (e.message && e.message.includes('not-allowed')) {
          setMicPermission('denied');
          alert('Microphone permission denied. Please enable microphone access in your browser settings.');
        } else {
          alert('Failed to start recording. Please check microphone permissions.');
        }
      }
    }
  };
  
  // Handle permission request from prompt
  const handleGrantPermission = async () => {
    const granted = await requestMicPermission();
    if (granted) {
      // Permission granted, start recording
      setUserResponse('');
      try {
        stopSpeaking();
        if (recognitionRef.current) {
          recognitionRef.current.start();
          setIsRecording(true);
        }
      } catch (e) {
        console.error('Error starting recognition after permission:', e);
        alert('Failed to start recording. Please try again.');
      }
    }
  };

  const endSession = () => {
    if (session) {
      // Stop recording and speaking
      if (isRecording && recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors
        }
      }
      stopSpeaking();
      setIsRecording(false);
      setSession({ ...session, isActive: false });
      refetchSessions(); // Refresh past sessions
    }
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  return (
    <div className="p-8 bg-[#1E1E1E] min-h-screen">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-[#E0E0E0] mb-2">Interview Practice</h1>
          <p className="text-[#888888] mb-4">Practice explaining your projects like you're in a real interview</p>
          
          {/* Browser Compatibility Notice */}
          {typeof window !== 'undefined' && !window.SpeechRecognition && !window.webkitSpeechRecognition && (
            <div className="bg-[#FFC107] bg-opacity-20 border border-[#FFC107] border-opacity-30 rounded-lg p-4 mb-4">
              <p className="text-sm text-[#FFC107] flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <strong>Voice features require Chrome, Edge, or Safari.</strong> Speech recognition is not supported in your current browser.
              </p>
            </div>
          )}

          {/* Microphone Test Section */}
          {typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition) && (
            <div className="bg-[#252525] rounded-lg p-6 border border-[#2A2A2A] mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-[#E0E0E0] mb-1">Test Your Microphone</h3>
                  <p className="text-sm text-[#888888]">Make sure your microphone is working before starting a practice session</p>
                </div>
                <button
                  onClick={testMicrophone}
                  disabled={isRecording}
                  className={`btn ${isTestingMic ? 'btn-destructive' : 'btn-primary'} btn-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isTestingMic ? (
                    <>
                      <Square className="w-4 h-4" />
                      Stop Test
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4" />
                      Test Microphone
                    </>
                  )}
                </button>
              </div>

              {/* Browser Compatibility Check */}
              {typeof window !== 'undefined' && !window.SpeechRecognition && !window.webkitSpeechRecognition && (
                <div className="mb-4 bg-[#FFC107] bg-opacity-20 border border-[#FFC107] border-opacity-30 rounded-lg p-3">
                  <p className="text-sm text-[#FFC107]">
                    <strong>⚠️ Speech recognition not supported.</strong> Please use Chrome, Edge, or Safari for voice features.
                  </p>
                </div>
              )}
              
              {isTestingMic && (
                <div className="bg-[#1E1E1E] rounded-lg p-4 border border-[#2A2A2A]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-[#28A745] rounded-full animate-pulse"></div>
                    <p className="text-xs text-[#888888]">Speak into your microphone. Your words will appear below:</p>
                  </div>
                  <div className="bg-[#171717] rounded p-3 min-h-[80px] border border-[#2A2A2A]">
                    <p className="text-sm text-[#E0E0E0] whitespace-pre-wrap">
                      {micTestTranscript || 'Initializing...'}
                    </p>
                    {micTestTranscript && micTestTranscript.includes('Listening') && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex gap-1">
                          <div className="w-1 h-4 bg-[#0070F3] rounded animate-pulse" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-1 h-4 bg-[#0070F3] rounded animate-pulse" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-1 h-4 bg-[#0070F3] rounded animate-pulse" style={{ animationDelay: '300ms' }}></div>
                        </div>
                        <span className="text-xs text-[#888888]">Listening...</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 p-2 bg-[#252525] rounded border border-[#2A2A2A]">
                    <p className="text-xs text-[#888888] mb-1">
                      <strong className="text-[#E0E0E0]">Status:</strong> {micTestTranscript.includes('Error') ? 'Error detected' : micTestTranscript.includes('No speech') ? 'Waiting for speech' : 'Active and listening'}
                    </p>
                    <p className="text-xs text-[#666666]">
                      💡 If you don't see your words appearing, check:
                      <br />• Microphone is connected and not muted
                      <br />• Browser has microphone permission (check address bar)
                      <br />• You're speaking clearly and loudly enough
                      <br />• Check browser console (F12) for detailed logs
                    </p>
                  </div>
                </div>
              )}

              {micTestTranscript && !isTestingMic && 
               micTestTranscript !== 'Speak now... Your words will appear here.' && 
               micTestTranscript !== 'Listening... Speak now.' &&
               !micTestTranscript.includes('Error:') &&
               !micTestTranscript.includes('No speech detected') &&
               !micTestTranscript.includes('Test ended') && (
                <div className="mt-4 bg-[#28A745] bg-opacity-20 border border-[#28A745] border-opacity-30 rounded-lg p-3">
                  <p className="text-sm text-[#28A745] flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    <strong>Microphone is working!</strong> You can see your speech was transcribed above.
                  </p>
                </div>
              )}

              {micPermission === 'denied' && (
                <div className="mt-4 bg-[#D9534F] bg-opacity-20 border border-[#D9534F] border-opacity-30 rounded-lg p-4">
                  <p className="text-sm text-[#D9534F] flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4" />
                    <strong>Microphone permission denied.</strong>
                  </p>
                  <p className="text-xs text-[#B0B0B0] mb-3">To enable microphone access:</p>
                  <ol className="text-xs text-[#B0B0B0] space-y-1 ml-4 list-decimal">
                    <li>Click the lock icon (🔒) in your browser's address bar</li>
                    <li>Find "Microphone" in the permissions list</li>
                    <li>Change it to "Allow"</li>
                    <li>Refresh this page</li>
                  </ol>
                  <button
                    onClick={async () => {
                      setMicPermission(null);
                      await checkMicPermission();
                      await testMicrophone();
                    }}
                    className="mt-3 btn btn-secondary btn-sm"
                  >
                    Try Again
                  </button>
                </div>
              )}

              {/* Troubleshooting Tips */}
              {!isTestingMic && micPermission !== 'denied' && (
                <div className="mt-4 bg-[#1E1E1E] rounded-lg p-4 border border-[#2A2A2A]">
                  <p className="text-xs font-semibold text-[#E0E0E0] mb-2">💡 Troubleshooting Tips:</p>
                  <ul className="text-xs text-[#888888] space-y-1 ml-4 list-disc">
                    <li>Make sure you're using Chrome, Edge, or Safari (Firefox doesn't support speech recognition)</li>
                    <li>Check that your microphone is connected and not muted</li>
                    <li>Ensure your browser has microphone permission (check the address bar)</li>
                    <li>Speak clearly and wait a few seconds for transcription to appear</li>
                    <li>If nothing appears, try speaking louder or closer to the microphone</li>
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Analysis Criteria Info */}
          <div className="bg-[#252525] rounded-lg p-6 border border-[#2A2A2A] mb-6">
            <h3 className="text-lg font-semibold text-[#E0E0E0] mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-[#0070F3]" />
              How Your Answers Are Evaluated
            </h3>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-[#E0E0E0] mb-2">To Proceed to Next Question, You Need:</h4>
                <ul className="text-sm text-[#B0B0B0] space-y-2 ml-4 list-disc">
                  <li><strong className="text-[#E0E0E0]">Score ≥ 60%</strong> - Overall quality of your answer</li>
                  <li><strong className="text-[#E0E0E0]">At least 3 out of 5 acceptance criteria met</strong> - Specific requirements for each question</li>
                </ul>
              </div>
              
              <div className="bg-[#1E1E1E] rounded-lg p-4 border border-[#2A2A2A]">
                <h4 className="text-sm font-semibold text-[#FFC107] mb-2">Acceptance Criteria Examples:</h4>
                <ul className="text-xs text-[#B0B0B0] space-y-1 ml-4 list-disc">
                  <li>Response demonstrates understanding of architectural components</li>
                  <li>Candidate explains trade-offs or alternatives considered</li>
                  <li>Answer shows technical depth beyond surface-level explanation</li>
                  <li>Response is clear and well-structured</li>
                  <li>Candidate explains reasoning behind decisions</li>
                </ul>
              </div>

              <div className="bg-[#1E1E1E] rounded-lg p-4 border border-[#2A2A2A]">
                <h4 className="text-sm font-semibold text-[#0070F3] mb-2">What Makes a Good Answer:</h4>
                <ul className="text-xs text-[#B0B0B0] space-y-1 ml-4 list-disc">
                  <li><strong className="text-[#E0E0E0]">Clarity (0-100):</strong> Clear and well-structured explanation</li>
                  <li><strong className="text-[#E0E0E0">Technical Depth (0-100):</strong> Deep technical knowledge demonstrated</li>
                  <li><strong className="text-[#E0E0E0">Problem-Solving Process:</strong> Explain your reasoning, not just what you did</li>
                  <li><strong className="text-[#E0E0E0">Trade-offs & Alternatives:</strong> Consider alternatives and explain trade-offs</li>
                  <li><strong className="text-[#E0E0E0">Scalability Thinking:</strong> Think about scale, performance, and edge cases</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {!session || !session.isActive ? (
          <>
            {/* Project Selection */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-[#E0E0E0] mb-4">Select a Project to Practice</h2>
              {projectsLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 text-[#888888] animate-spin mx-auto" />
                </div>
              ) : projects.length === 0 ? (
                <div className="bg-[#252525] rounded-lg p-8 border border-[#2A2A2A] text-center">
                  <p className="text-[#888888] mb-4">No projects yet</p>
                  <p className="text-sm text-[#666666]">Create projects in the Project Builder to practice with them</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => startSession(project)}
                      className="text-left bg-[#252525] rounded-lg p-6 border border-[#2A2A2A] hover:border-[#0070F3] transition-colors group"
                    >
                      <h3 className="text-lg font-semibold text-[#E0E0E0] mb-3">{project.name}</h3>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {(project.tech_stack || []).map((tech, index) => (
                          <span
                            key={index}
                            className="text-xs bg-[#1E1E1E] text-[#B0B0B0] px-2 py-1 rounded"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 text-[#0070F3]">
                        <Play className="w-4 h-4" />
                        <span className="text-sm">Start Practice</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Past Sessions */}
            <div className="bg-[#252525] rounded-lg p-6 border border-[#2A2A2A]">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-[#E0E0E0]">Past Sessions</h2>
                <TrendingUp className="w-5 h-5 text-[#28A745]" />
              </div>
              <div className="space-y-3">
                {pastSessions.length === 0 ? (
                  <div className="bg-[#1E1E1E] rounded-lg p-8 border border-[#2A2A2A] text-center">
                    <p className="text-[#888888]">No practice sessions yet</p>
                    <p className="text-sm text-[#666666] mt-2">Start practicing to see your session history</p>
                  </div>
                ) : (
                  pastSessions.map((pastSession) => (
                    <div
                      key={pastSession.id}
                      className="bg-[#1E1E1E] rounded-lg p-4 border border-[#2A2A2A]"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-[#E0E0E0] font-medium">Practice Session</h3>
                        <span className="text-sm text-[#888888]">{formatDate(pastSession.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-[#28A745]" />
                          <span className="text-[#B0B0B0]">{pastSession.questionsAnswered || 1} questions</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[#B0B0B0]">Score:</span>
                          <span className="text-[#28A745] font-semibold">{pastSession.score || 0}%</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Session Results */}
            {session && !session.isActive && (
              <div className="mt-8 space-y-6">
                {/* Overall Assessment */}
                <div className="bg-[#252525] rounded-lg p-6 border border-[#2A2A2A]">
                  <h2 className="text-2xl font-semibold text-[#E0E0E0] mb-6">Session Complete!</h2>
                  
                  {/* Hire-Readiness Assessment */}
                  <div className="mb-6 bg-[#1E1E1E] rounded-lg p-5 border border-[#2A2A2A]">
                    <div className="flex items-center gap-3 mb-4">
                      <Target className="w-6 h-6 text-[#0070F3]" />
                      <h3 className="text-xl font-semibold text-[#E0E0E0]">Hire-Readiness Assessment</h3>
                    </div>
                    
                    {(() => {
                      const readyCount = session.questions.filter(q => q.hireReadiness === 'hire-ready').length;
                      const gettingThereCount = session.questions.filter(q => q.hireReadiness === 'getting-there').length;
                      const notReadyCount = session.questions.filter(q => q.hireReadiness === 'not-ready').length;
                      const avgScore = Math.round(session.questions.reduce((acc, q) => acc + (q.score || 0), 0) / session.questions.length);
                      
                      let overallStatus;
                      let statusColor;
                      let statusMessage;
                      
                      if (notReadyCount > 2 || avgScore < 70) {
                        overallStatus = 'not-ready';
                        statusColor = '#D9534F';
                        statusMessage = 'Not Hire-Ready Yet';
                      } else if (readyCount >= 3 && avgScore >= 80) {
                        overallStatus = 'hire-ready';
                        statusColor = '#28A745';
                        statusMessage = 'Hire-Ready';
                      } else {
                        overallStatus = 'getting-there';
                        statusColor = '#FFC107';
                        statusMessage = 'Getting There';
                      }
                      
                      return (
                        <div>
                          <div className="flex items-center gap-4 mb-4">
                            <div className={`text-3xl font-bold`} style={{ color: statusColor }}>
                              {avgScore}%
                            </div>
                            <div className={`text-lg font-semibold`} style={{ color: statusColor }}>
                              {statusMessage}
                            </div>
                            <div className="text-sm text-[#888888]">Average Score</div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4 mb-4">
                            <div className="text-center">
                              <div className="text-2xl font-semibold text-[#28A745]">{readyCount}</div>
                              <div className="text-xs text-[#888888]">Hire-Ready</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-semibold text-[#FFC107]">{gettingThereCount}</div>
                              <div className="text-xs text-[#888888]">Getting There</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-semibold text-[#D9534F]">{notReadyCount}</div>
                              <div className="text-xs text-[#888888]">Not Ready</div>
                            </div>
                          </div>
                          
                          {overallStatus === 'not-ready' && (
                            <div className="bg-[#D9534F] bg-opacity-20 border border-[#D9534F] border-opacity-30 rounded-lg p-4">
                              <p className="text-sm text-[#E0E0E0] mb-2"><strong>Issue:</strong> Your answers show tutorial-trained thinking rather than engineering reasoning.</p>
                              <p className="text-sm text-[#B0B0B0] mb-3">Focus on did you make decisions? What were the trade-offs? What would break at scale?</p>
                              <p className="text-sm text-[#FFC107]"><strong>Action:</strong> Use the AI Mentor to practice explaining your reasoning. Build projects where you understand every decision.</p>
                            </div>
                          )}
                          
                          {overallStatus === 'getting-there' && (
                            <div className="bg-[#FFC107] bg-opacity-20 border border-[#FFC107] border-opacity-30 rounded-lg p-4">
                              <p className="text-sm text-[#E0E0E0] mb-2"><strong>Progress:</strong> You're on the right track, but need more depth in your explanations.</p>
                              <p className="text-sm text-[#B0B0B0] mb-3">Focus on scalability considerations, explaining trade-offs more clearly, demonstrating senior-level thinking.</p>
                              <p className="text-sm text-[#0070F3]"><strong>Next Step:</strong> Practice answering "What would break at scale?" and "What alternatives did you consider?" for each project.</p>
                            </div>
                          )}
                          
                          {overallStatus === 'hire-ready' && (
                            <div className="bg-[#28A745] bg-opacity-20 border border-[#28A745] border-opacity-30 rounded-lg p-4">
                              <p className="text-sm text-[#E0E0E0] mb-2"><strong>Great job!</strong> Your answers demonstrate engineering thinking.</p>
                              <p className="text-sm text-[#B0B0B0]">You show-solving reasoning, trade-off awareness, scalability thinking. Keep practicing to maintain consistency.</p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  
                  {/* Detailed Feedback */}
                  <h3 className="text-lg font-semibold text-[#E0E0E0] mb-4">Detailed Feedback</h3>
                  <div className="space-y-4 mb-6">
                    {session.questions.map((question, index) => (
                      <div key={question.id} className="bg-[#1E1E1E] rounded-lg p-4 border border-[#2A2A2A]">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className="text-xs bg-[#252525] text-[#B0B0B0] px-2 py-1 rounded">
                                {question.category}
                              </span>
                              {question.hireReadiness === 'hire-ready' && (
                                <span className="text-xs bg-[#28A745] bg-opacity-20 text-[#28A745] px-2 py-1 rounded flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" />
                                  Hire-Ready
                                </span>
                              )}
                              {question.hireReadiness === 'getting-there' && (
                                <span className="text-xs bg-[#FFC107] bg-opacity-20 text-[#FFC107] px-2 py-1 rounded flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" />
                                  Getting There
                                </span>
                              )}
                              {question.hireReadiness === 'not-ready' && (
                                <span className="text-xs bg-[#D9534F] bg-opacity-20 text-[#D9534F] px-2 py-1 rounded flex items-center gap-1">
                                  <XCircle className="w-3 h-3" />
                                  Not Ready
                                </span>
                              )}
                              {question.score && (
                                <span className="text-xs bg-[#0070F3] bg-opacity-20 text-[#0070F3] px-2 py-1 rounded">
                                  {question.score}%
                                </span>
                              )}
                            </div>
                            <p className="text-[#E0E0E0] mb-3 font-medium">{question.text}</p>
                            
                            {/* User Transcript */}
                            {question.userResponse && (
                              <div className="mb-4 bg-[#252525] rounded-lg p-3 border border-[#2A2A2A]">
                                <div className="flex items-center gap-2 mb-2">
                                  <Mic className="w-3 h-3 text-[#0070F3]" />
                                  <p className="text-xs font-semibold text-[#B0B0B0]">Your Transcript:</p>
                                </div>
                                <p className="text-xs text-[#E0E0E0] whitespace-pre-wrap leading-relaxed">
                                  {question.userResponse}
                                </p>
                              </div>
                            )}
                            
                            {/* AI Feedback */}
                            {question.feedback && (
                              <div className="mb-3">
                                <p className="text-sm text-[#B0B0B0] mb-2 flex items-center gap-2">
                                  <Target className="w-3 h-3 text-[#0070F3]" />
                                  <strong className="text-[#E0E0E0]">AI Recommended Feedback:</strong>
                                </p>
                                <p className="text-sm text-[#888888] whitespace-pre-wrap leading-relaxed">{question.feedback}</p>
                              </div>
                            )}
                            
                            {/* Acceptance Criteria */}
                            {question.acceptanceCriteria && question.acceptanceCriteria.length > 0 && (
                              <div className="mb-3 bg-[#FFC107] bg-opacity-10 border border-[#FFC107] border-opacity-30 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <CheckCircle className="w-3 h-3 text-[#FFC107]" />
                                    <span className="text-xs font-semibold text-[#FFC107]">Acceptance Criteria:</span>
                                  </div>
                                  {question.canProceed && (
                                    <span className="text-xs bg-[#28A745] bg-opacity-20 text-[#28A745] px-2 py-1 rounded">
                                      Met
                                    </span>
                                  )}
                                </div>
                                <div className="space-y-2">
                                  {question.acceptanceCriteria.map((criterion, idx) => (
                                    <div
                                      key={idx}
                                      className={`flex items-start gap-2 p-2 rounded-lg border ${
                                        criterion.met
                                          ? 'bg-[#28A745] bg-opacity-10 border-[#28A745] border-opacity-30'
                                          : 'bg-[#D9534F] bg-opacity-10 border-[#D9534F] border-opacity-30'
                                      }`}
                                    >
                                      {criterion.met ? (
                                        <CheckCircle className="w-4 h-4 text-[#28A745] flex-shrink-0 mt-0.5" />
                                      ) : (
                                        <XCircle className="w-4 h-4 text-[#D9534F] flex-shrink-0 mt-0.5" />
                                      )}
                                      <div className="flex-1">
                                        <p className={`text-xs font-medium ${
                                          criterion.met ? 'text-[#28A745]' : 'text-[#D9534F]'
                                        }`}>
                                          {criterion.criterion}
                                        </p>
                                        {criterion.reason && (
                                          <p className="text-xs text-[#888888] mt-1">{criterion.reason}</p>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Strengths */}
                            {question.strengths && question.strengths.length > 0 && (
                              <div className="mb-3 bg-[#28A745] bg-opacity-10 border border-[#28A745] border-opacity-30 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <CheckCircle className="w-4 h-4 text-[#28A745]" />
                                  <span className="text-xs font-semibold text-[#28A745]">Strengths:</span>
                                </div>
                                <ul className="space-y-1">
                                  {question.strengths.map((strength, idx) => (
                                    <li key={idx} className="text-xs text-[#E0E0E0]">• {strength}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {/* Improvements */}
                            {question.improvements && question.improvements.length > 0 && (
                              <div className="mb-3 bg-[#0070F3] bg-opacity-10 border border-[#0070F3] border-opacity-30 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <Target className="w-4 h-4 text-[#0070F3]" />
                                  <span className="text-xs font-semibold text-[#0070F3]">Areas for Improvement:</span>
                                </div>
                                <ul className="space-y-1">
                                  {question.improvements.map((improvement, idx) => (
                                    <li key={idx} className="text-xs text-[#E0E0E0]">• {improvement}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {/* Metrics */}
                            <div className="grid grid-cols-2 gap-4 mb-3">
                              {question.clarity !== undefined && (
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs text-[#888888]">Clarity</span>
                                    <span className="text-xs text-[#E0E0E0]">{question.clarity}%</span>
                                  </div>
                                  <div className="w-full bg-[#171717] rounded-full h-2">
                                    <div className="bg-[#0070F3] h-2 rounded-full" style={{ width: `${question.clarity}%` }}></div>
                                  </div>
                                </div>
                              )}
                              {question.depth !== undefined && (
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs text-[#888888]">Depth</span>
                                    <span className="text-xs text-[#E0E0E0]">{question.depth}%</span>
                                  </div>
                                  <div className="w-full bg-[#171717] rounded-full h-2">
                                    <div className="bg-[#FFC107] h-2 rounded-full" style={{ width: `${question.depth}%` }}></div>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* Red Flags */}
                            {question.redFlags && question.redFlags.length > 0 && (
                              <div className="bg-[#D9534F] bg-opacity-10 border border-[#D9534F] border-opacity-30 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <AlertTriangle className="w-4 h-4 text-[#D9534F]" />
                                  <span className="text-xs font-semibold text-[#D9534F]">Red Flags:</span>
                                </div>
                                <ul className="space-y-1">
                                  {question.redFlags.map((flag, idx) => (
                                    <li key={idx} className="text-xs text-[#E0E0E0]">• {flag}</li>
                                  ))}
                                </ul>
                                <p className="text-xs text-[#888888] mt-2">⚠️ These are signs of tutorial-trained vs genuine understanding. Interviewers notice these.</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => setSession(null)}
                      className="btn btn-primary btn-lg"
                    >
                      Start New Session
                    </button>
                    <button
                      onClick={() => {
                        setSession({ ...session, isActive: true, currentQuestion: 0 });
                      }}
                      className="btn btn-secondary btn-lg"
                    >
                      Practice Same Project Again
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Active Session */
          <div className="space-y-6">
            {/* Session Header */}
            <div className="bg-[#252525] rounded-lg p-6 border border-[#2A2A2A]">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-[#E0E0E0] mb-1">{session.projectName}</h2>
                  <p className="text-[#888888]">
                    Question {session.currentQuestion + 1} of {session.questions.length}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-[#888888]">
                    <Clock className="w-5 h-5" />
                    <span>{Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}</span>
                  </div>
                  <button
                    onClick={endSession}
                    className="bg-[#D9534F] text-white px-4 py-2 rounded-lg hover:bg-[#C9302C] transition-colors flex items-center gap-2"
                  >
                    <Square className="w-4 h-4" />
                    End Session
                  </button>
                </div>
              </div>
            </div>

            {/* Progress */}
            <div className="bg-[#252525] rounded-lg p-4 border border-[#2A2A2A]">
              <div className="w-full bg-[#1E1E1E] rounded-full h-2">
                <div
                  className="bg-[#0070F3] h-2 rounded-full transition-all"
                  style={{ width: `${((session.currentQuestion + 1) / session.questions.length) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Current Question */}
            <div className="bg-[#252525] rounded-lg p-8 border border-[#2A2A2A]">
              <div className="mb-6">
                <span className="text-sm bg-[#0070F3] bg-opacity-20 text-[#0070F3] px-3 py-1 rounded-full">
                  {session.questions[session.currentQuestion].category}
                </span>
              </div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl text-[#E0E0E0] flex-1">
                  {session.questions[session.currentQuestion].text}
                </h3>
                <button
                  onClick={() => {
                    if (isSpeaking) {
                      stopSpeaking();
                    } else {
                      speakQuestion(session.questions[session.currentQuestion].text);
                    }
                  }}
                  className="ml-4 p-2 rounded-lg bg-[#1E1E1E] border border-[#2A2A2A] hover:border-[#0070F3] transition-colors"
                  title={isSpeaking ? 'Stop speaking' : 'Repeat question'}
                >
                  {isSpeaking ? (
                    <VolumeX className="w-5 h-5 text-[#888888]" />
                  ) : (
                    <Volume2 className="w-5 h-5 text-[#0070F3]" />
                  )}
                </button>
              </div>

              {/* User Response Transcript */}
              {(userResponse || session.questions[session.currentQuestion].userResponse) && (
                <div className="mb-6 bg-[#1E1E1E] rounded-lg p-4 border border-[#2A2A2A]">
                  <div className="flex items-center gap-2 mb-3">
                    <Mic className="w-4 h-4 text-[#0070F3]" />
                    <p className="text-sm font-semibold text-[#E0E0E0]">Your Transcript:</p>
                  </div>
                  <div className="bg-[#252525] rounded-lg p-4 border border-[#2A2A2A]">
                    <p className="text-[#E0E0E0] whitespace-pre-wrap leading-relaxed">
                      {session.questions[session.currentQuestion].userResponse || userResponse}
                    </p>
                  </div>
                </div>
              )}

              {/* AI Feedback Section */}
              {session.questions[session.currentQuestion].answered && (
                <div className="mb-6 space-y-4">
                  {/* AI Feedback */}
                  {session.questions[session.currentQuestion].feedback && (
                    <div className="bg-[#1E1E1E] rounded-lg p-4 border border-[#0070F3] border-opacity-30">
                      <div className="flex items-center gap-2 mb-3">
                        <Target className="w-4 h-4 text-[#0070F3]" />
                        <p className="text-sm font-semibold text-[#0070F3]">AI Recommended Feedback:</p>
                      </div>
                      <p className="text-sm text-[#E0E0E0] whitespace-pre-wrap leading-relaxed">
                        {session.questions[session.currentQuestion].feedback}
                      </p>
                    </div>
                  )}

                  {/* Acceptance Criteria */}
                  {session.questions[session.currentQuestion].acceptanceCriteria && 
                   session.questions[session.currentQuestion].acceptanceCriteria.length > 0 && (
                    <div className="bg-[#1E1E1E] rounded-lg p-4 border border-[#FFC107] border-opacity-30">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-[#FFC107]" />
                          <p className="text-sm font-semibold text-[#FFC107]">Acceptance Criteria:</p>
                        </div>
                        {session.questions[session.currentQuestion].canProceed ? (
                          <span className="text-xs bg-[#28A745] bg-opacity-20 text-[#28A745] px-2 py-1 rounded">
                            Criteria Met ✓
                          </span>
                        ) : (
                          <span className="text-xs bg-[#D9534F] bg-opacity-20 text-[#D9534F] px-2 py-1 rounded">
                            Not Met Yet
                          </span>
                        )}
                      </div>
                      <div className="space-y-2">
                        {session.questions[session.currentQuestion].acceptanceCriteria.map((criterion, idx) => (
                          <div
                            key={idx}
                            className={`flex items-start gap-3 p-3 rounded-lg border ${
                              criterion.met
                                ? 'bg-[#28A745] bg-opacity-10 border-[#28A745] border-opacity-30'
                                : 'bg-[#D9534F] bg-opacity-10 border-[#D9534F] border-opacity-30'
                            }`}
                          >
                            {criterion.met ? (
                              <CheckCircle className="w-5 h-5 text-[#28A745] flex-shrink-0 mt-0.5" />
                            ) : (
                              <XCircle className="w-5 h-5 text-[#D9534F] flex-shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1">
                              <p className={`text-sm font-medium ${
                                criterion.met ? 'text-[#28A745]' : 'text-[#D9534F]'
                              }`}>
                                {criterion.criterion}
                              </p>
                              {criterion.reason && (
                                <p className="text-xs text-[#888888] mt-1">{criterion.reason}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      {!session.questions[session.currentQuestion].canProceed && (
                        <div className="mt-4 bg-[#FFC107] bg-opacity-20 border border-[#FFC107] border-opacity-30 rounded-lg p-3">
                          <p className="text-xs text-[#FFC107] flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            <strong>You must meet the acceptance criteria before proceeding.</strong> Record a new response or improve your answer.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Score and Metrics */}
                  {session.questions[session.currentQuestion].score !== undefined && (
                    <div className="bg-[#1E1E1E] rounded-lg p-4 border border-[#2A2A2A]">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-semibold text-[#E0E0E0]">Performance Score:</p>
                        <span className="text-2xl font-bold text-[#0070F3]">
                          {session.questions[session.currentQuestion].score}%
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {session.questions[session.currentQuestion].clarity !== undefined && (
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-[#888888]">Clarity</span>
                              <span className="text-xs text-[#E0E0E0]">{session.questions[session.currentQuestion].clarity}%</span>
                            </div>
                            <div className="w-full bg-[#171717] rounded-full h-2">
                              <div 
                                className="bg-[#0070F3] h-2 rounded-full" 
                                style={{ width: `${session.questions[session.currentQuestion].clarity}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                        {session.questions[session.currentQuestion].depth !== undefined && (
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-[#888888]">Depth</span>
                              <span className="text-xs text-[#E0E0E0]">{session.questions[session.currentQuestion].depth}%</span>
                            </div>
                            <div className="w-full bg-[#171717] rounded-full h-2">
                              <div 
                                className="bg-[#FFC107] h-2 rounded-full" 
                                style={{ width: `${session.questions[session.currentQuestion].depth}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Microphone Permission Prompt */}
              {showMicPrompt && (
                <div className="mb-6 bg-[#FFC107] bg-opacity-20 border-2 border-[#FFC107] rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <Mic className="w-8 h-8 text-[#FFC107]" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-[#E0E0E0] mb-2">Microphone Permission Required</h4>
                      <p className="text-sm text-[#B0B0B0] mb-4">
                        To record your interview answers, we need access to your microphone. 
                        Click "Allow Microphone" to grant permission.
                      </p>
                      <div className="flex gap-3">
                        <button
                          onClick={handleGrantPermission}
                          className="bg-[#0070F3] text-white px-6 py-2 rounded-lg hover:bg-[#0060D9] transition-colors flex items-center gap-2"
                        >
                          <Mic className="w-4 h-4" />
                          Allow Microphone
                        </button>
                        <button
                          onClick={() => setShowMicPrompt(false)}
                          className="bg-[#1E1E1E] text-[#E0E0E0] px-6 py-2 rounded-lg border border-[#2A2A2A] hover:border-[#2A2A2A] transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                      <p className="text-xs text-[#888888] mt-3">
                        💡 Your browser will show a permission prompt. Click "Allow" to enable voice recording.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Microphone Permission Denied Warning */}
              {micPermission === 'denied' && !showMicPrompt && (
                <div className="mb-6 bg-[#D9534F] bg-opacity-20 border-2 border-[#D9534F] rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-[#D9534F] flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-[#E0E0E0] mb-1">Microphone Access Denied</p>
                      <p className="text-xs text-[#B0B0B0] mb-3">
                        Microphone permission was denied. To use voice recording, please:
                      </p>
                      <ol className="text-xs text-[#B0B0B0] space-y-1 ml-4 list-decimal">
                        <li>Click the lock icon in your browser's address bar</li>
                        <li>Find "Microphone" in the permissions list</li>
                        <li>Change it to "Allow"</li>
                        <li>Refresh this page</li>
                      </ol>
                      <button
                        onClick={() => {
                          setMicPermission(null);
                          checkMicPermission();
                        }}
                        className="mt-3 text-xs text-[#0070F3] hover:text-[#0060D9] hover:underline"
                      >
                        Check Permission Again
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Recording Controls */}
              <div className="flex items-center justify-center gap-6 mb-8">
                <button
                  onClick={toggleRecording}
                  disabled={isSpeaking || isAnalyzing || micPermission === 'denied'}
                  className={`w-20 h-20 rounded-full flex items-center justify-center transition-colors ${
                    isRecording
                      ? 'bg-[#D9534F] hover:bg-[#C9302C] animate-pulse'
                      : 'bg-[#0070F3] hover:bg-[#0060D9]'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title={
                    micPermission === 'denied' 
                      ? 'Microphone permission denied. Please enable in browser settings.'
                      : isRecording 
                      ? 'Stop recording' 
                      : 'Start recording'
                  }
                >
                  {isRecording ? (
                    <MicOff className="w-8 h-8 text-white" />
                  ) : (
                    <Mic className="w-8 h-8 text-white" />
                  )}
                </button>
              </div>

              <p className="text-center text-[#888888] mb-6">
                {isAnalyzing ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing your response...
                  </span>
                ) : isRecording ? (
                  'Recording your answer... (Click mic to stop)'
                ) : isSpeaking ? (
                  'AI is asking the question...'
                ) : micPermission === 'denied' ? (
                  'Microphone access denied. Please enable in browser settings.'
                ) : (
                  'Click microphone to start recording your answer'
                )}
              </p>

              {/* Tips */}
              <div className="bg-[#1E1E1E] rounded-lg p-4 border border-[#FFC107] border-opacity-30">
                <p className="text-sm text-[#FFC107] mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Tips for this question:
                </p>
                <ul className="text-sm text-[#B0B0B0] space-y-1 ml-6">
                  <li>• Use the STAR format (Situation, Task, Action, Result)</li>
                  <li>• Be specific with technical details</li>
                  <li>• Explain your reasoning and trade-offs</li>
                  <li>• Keep your answer under 3 minutes</li>
                </ul>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center gap-3">
              {/* Action buttons */}
              <div className="flex gap-3">
                {session.questions[session.currentQuestion].answered && !session.questions[session.currentQuestion].canProceed && (
                  <button
                    onClick={() => {
                      // Allow re-recording
                      const updatedQuestions = [...session.questions];
                      updatedQuestions[session.currentQuestion] = {
                        ...updatedQuestions[session.currentQuestion],
                        answered: false,
                        userResponse: undefined,
                      };
                      setSession({
                        ...session,
                        questions: updatedQuestions,
                      });
                      setUserResponse('');
                    }}
                    className="btn btn-secondary btn-lg"
                  >
                    <Mic className="w-4 h-4" />
                    Record New Response
                  </button>
                )}
              </div>
              
              <div className="flex gap-3">
                {session.questions[session.currentQuestion].answered && 
                 !session.questions[session.currentQuestion].canProceed && (
                  <div className="flex items-center gap-2 text-sm text-[#FFC107] mr-4">
                    <AlertCircle className="w-4 h-4" />
                    <span>Criteria not met</span>
                  </div>
                )}
                <button
                  onClick={nextQuestion}
                  disabled={
                    isAnalyzing || 
                    (userResponse.trim().length === 0 && !session.questions[session.currentQuestion].answered) ||
                    (session.questions[session.currentQuestion].answered && 
                     session.questions[session.currentQuestion].canProceed === false)
                  }
                  className="btn btn-primary btn-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : !session.questions[session.currentQuestion].answered ? (
                    <>
                      <Target className="w-4 h-4" />
                      Analyze Response
                    </>
                  ) : session.questions[session.currentQuestion].canProceed ? (
                    session.currentQuestion < session.questions.length - 1 ? (
                      'Next Question'
                    ) : (
                      'Finish Session'
                    )
                  ) : (
                    'Criteria Not Met'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
