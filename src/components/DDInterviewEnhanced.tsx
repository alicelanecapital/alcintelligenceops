import { useState, useRef, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { SECTOR_MODULES, VERIFICATION_TRIANGLE } from '@/lib/dd-framework-data';
import { fetchFrameworkRoundDetail } from '@/lib/dd-framework-admin';
import { detectSector, generateAnalysisReport } from '@/lib/dd-sector-detection';
import { useServerFn } from '@tanstack/react-start';
import { getOrCreateUploadChannel, syncUploadChannelDocuments, getSignedDocumentUrl } from '@/lib/dd-upload-channel.functions';

export function DDInterviewEnhanced({ opportunityId, round }: { opportunityId: string; round: number }) {
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [sector, setSector] = useState<string | null>(null);
  const [sectorConfidence, setSectorConfidence] = useState(0);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [verificationTracking, setVerificationTracking] = useState<Record<string, boolean>>({});
  const [interviewRowId, setInterviewRowId] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const [uploadChannel, setUploadChannel] = useState<{ dedicated_email: string } | null>(null);
  const [receivedDocs, setReceivedDocs] = useState<any[]>([]);
  const [syncingDocs, setSyncingDocs] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const getOrCreateChannelFn = useServerFn(getOrCreateUploadChannel);
  const syncDocsFn = useServerFn(syncUploadChannelDocuments);
  const getSignedUrlFn = useServerFn(getSignedDocumentUrl);

  // Questions and required documents are admin-editable (see /admin/dd-framework)
  // and live in dd_framework_rounds/questions/documents rather than the old
  // hardcoded dd-framework-data.ts arrays.
  const framework = useQuery({ queryKey: ['dd-framework-round', round], queryFn: () => fetchFrameworkRoundDetail(round) });
  const roundData = framework.data?.round;
  const questions = (framework.data?.questions ?? []).map((q) => ({
    number: q.sort_order,
    question: q.question_text,
    why: q.why_text ?? '',
    internalSteps: q.internal_steps ?? [],
    redFlags: q.red_flags ?? [],
  }));
  const question = questions[currentQuestion];
  const documents = framework.data?.documents ?? [];

  // Every round needs its own dd_interviews row before responses/documents/analysis
  // can be saved against it (dd_round_responses.interview_id is a foreign key into
  // dd_interviews, not opportunities). Get-or-create it on mount for this opportunity+round.
  useEffect(() => {
    let cancelled = false;
    setInterviewRowId(null);
    setCurrentQuestion(0);
    setTranscript('');
    setAiAnalysis(null);

    (async () => {
      const { data: existing, error: findError } = await supabase
        .from('dd_interviews')
        .select('id, status, transcript, ai_analysis, detected_sector, sector_confidence')
        .eq('opportunity_id', opportunityId)
        .eq('round', round)
        .maybeSingle();
      if (findError) {
        toast.error('Failed to load this round: ' + findError.message);
        return;
      }

      if (existing) {
        if (!cancelled) {
          setInterviewRowId(existing.id);
          if (existing.transcript) setTranscript(existing.transcript);
          if (existing.ai_analysis) setAiAnalysis(existing.ai_analysis);
          if (existing.detected_sector) {
            setSector(existing.detected_sector);
            setSectorConfidence(existing.sector_confidence ? Math.round(existing.sector_confidence) : 0);
          }
        }
        return;
      }

      const { data: created, error: createError } = await supabase
        .from('dd_interviews')
        .insert({ opportunity_id: opportunityId, round, status: 'in_progress', started_at: new Date().toISOString() })
        .select('id')
        .single();
      if (createError) {
        toast.error('Failed to start this round: ' + createError.message);
        return;
      }
      if (!cancelled) setInterviewRowId(created.id);
    })();

    return () => { cancelled = true; };
  }, [opportunityId, round]);

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const audioChunks: Blob[] = [];
      mediaRecorder.addEventListener('dataavailable', (event) => {
        audioChunks.push(event.data);
      });

      mediaRecorder.addEventListener('stop', async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        // Here you would upload to Supabase Storage and transcribe
        await transcribeAudio(audioBlob);
      });

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast.error('Could not access the microphone.');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  // Transcribe audio via the existing /api/transcribe endpoint (Lovable AI Gateway, server-side key)
  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      const text = data.text ?? '';
      setTranscript(text);

      // Auto-detect sector from responses
      if (round === 1 && currentQuestion <= 2 && text) {
        const detection = await detectSector({ data: { responses: [text] } });
        setSector(detection.sector);
        setSectorConfidence(detection.confidence);
        if (interviewRowId && detection.sector) {
          await supabase.from('dd_interviews').update({
            detected_sector: detection.sector,
            sector_confidence: detection.confidence,
          }).eq('id', interviewRowId);
        }
      }
    } catch (error) {
      console.error('Transcription failed:', error);
      toast.error('Transcription failed.');
    }
  };

  // Generate AI analysis
  const generateAnalysis = async () => {
    if (!interviewRowId) {
      toast.error('This round is still loading — try again in a moment.');
      return;
    }
    try {
      const analysis = await generateAnalysisReport({
        data: {
          interviewId: interviewRowId,
          transcript,
          sector: sector || 'Unknown',
          round
        }
      });
      setAiAnalysis(analysis);
      await supabase.from('dd_interviews').update({ ai_analysis: analysis as any }).eq('id', interviewRowId);
    } catch (error: any) {
      console.error('Analysis generation failed:', error);
      toast.error('Analysis generation failed: ' + (error?.message ?? 'unknown error'));
    }
  };

  // Save response
  const saveResponse = async () => {
    if (!interviewRowId) {
      toast.error('This round is still loading — try again in a moment.');
      return;
    }
    const { error } = await supabase.from('dd_round_responses').upsert({
      interview_id: interviewRowId,
      question_number: currentQuestion + 1,
      question_text: question.question,
      founder_response: transcript,
      response_type: 'transcribed',
      response_source: 'transcript'
    }, { onConflict: 'interview_id,question_number' });

    if (error) {
      console.error('Failed to save response:', error);
      toast.error('Failed to save response: ' + error.message);
      return;
    }

    await supabase.from('dd_interviews').update({ transcript }).eq('id', interviewRowId);
    toast.success('Response saved');
  };

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Advance to the next round (or finish, on round 5)
  const handleAdvance = async () => {
    if (!interviewRowId) return;
    setAdvancing(true);
    try {
      await supabase.from('dd_interviews').update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      }).eq('id', interviewRowId);

      if (round < 5) {
        toast.success(`Round ${round} complete`);
        navigate({ to: `/dd-interview/${opportunityId}/${round + 1}` });
      } else {
        toast.success('Due diligence complete for all 5 rounds');
        navigate({ to: '/dd-engine' });
      }
    } catch (error: any) {
      toast.error('Failed to advance: ' + (error?.message ?? 'unknown error'));
    } finally {
      setAdvancing(false);
    }
  };

  // Load (or create) the dedicated email upload channel for this opportunity,
  // and the documents already received through it, once the round is ready.
  useEffect(() => {
    if (!interviewRowId) return;
    let cancelled = false;
    (async () => {
      try {
        const channel = await getOrCreateChannelFn({ data: { opportunityId } });
        if (!cancelled && channel?.dedicated_email) setUploadChannel({ dedicated_email: channel.dedicated_email });
      } catch (error: any) {
        console.error('Failed to load upload channel:', error);
      }
      const { data: docs } = await supabase
        .from('dd_interview_documents')
        .select('*')
        .eq('interview_id', interviewRowId)
        .order('uploaded_at', { ascending: false });
      if (!cancelled) setReceivedDocs(docs ?? []);
    })();
    return () => { cancelled = true; };
  }, [interviewRowId, opportunityId]);

  const handleSyncDocuments = async () => {
    if (!interviewRowId) return;
    setSyncingDocs(true);
    try {
      const result = await syncDocsFn({ data: { opportunityId, interviewId: interviewRowId, round } });
      if (result.reason === 'not_connected') {
        toast.error('Connect a Google account on the Calendar page first to enable email document sync.');
      } else {
        toast.success(`${result.imported} new document${result.imported === 1 ? '' : 's'} imported`);
        const { data: docs } = await supabase
          .from('dd_interview_documents')
          .select('*')
          .eq('interview_id', interviewRowId)
          .order('uploaded_at', { ascending: false });
        setReceivedDocs(docs ?? []);
      }
    } catch (error: any) {
      toast.error('Failed to check for new documents: ' + (error?.message ?? 'unknown error'));
    } finally {
      setSyncingDocs(false);
    }
  };

  const openDocument = async (doc: any) => {
    try {
      const { url } = await getSignedUrlFn({ data: { storagePath: doc.file_url } });
      window.open(url, '_blank');
    } catch (error: any) {
      toast.error('Failed to open document: ' + (error?.message ?? 'unknown error'));
    }
  };

  // Sector-specific module
  const sectorModule = sector ? SECTOR_MODULES[sector as keyof typeof SECTOR_MODULES] : null;

  if (framework.isLoading || !roundData) {
    return <div className="max-w-4xl mx-auto p-6 text-center text-gray-500">Loading round…</div>;
  }

  if (!question) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg">
        <h1 className="text-3xl font-bold mb-2">{roundData.title}</h1>
        <p className="text-gray-600 mb-6">{roundData.subtitle}</p>
        <div className="p-6 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
          No questions are configured for this round yet. Add some from <span className="font-semibold">Admin → DD Framework</span>.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{roundData.title}</h1>
        <p className="text-gray-600">{roundData.subtitle}</p>
        <p className="text-sm text-gray-500 mt-2">{roundData.purpose}</p>
      </div>

      {/* Sector Detection Badge */}
      {sector && (
        <div className="mb-6 p-4 bg-teal-50 border border-teal-200 rounded-lg">
          <p className="text-sm font-semibold text-teal-900">
            🎯 Sector Detected: {sectorModule?.name} ({sectorConfidence}% confidence)
          </p>
          <p className="text-xs text-teal-700 mt-1">
            Sector-specific questions and verification steps will be loaded for this business type.
          </p>
        </div>
      )}

      {/* Current Question */}
      <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-sm font-semibold text-gray-600 mb-2">
          QUESTION {currentQuestion + 1} OF {questions.length}
        </p>
        <h2 className="text-2xl font-bold mb-4">{question.question}</h2>

        {/* Why This Matters */}
        <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
          <p className="text-sm font-semibold text-blue-900 mb-2">💡 Why this matters:</p>
          <p className="text-sm text-blue-800">{question.why}</p>
        </div>

        {/* Recording Section */}
        <div className="mb-6 p-4 bg-gray-100 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            {isRecording ? (
              <>
                <button
                  onClick={stopRecording}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  ⏹ Stop Recording
                </button>
                <span className="text-lg font-mono font-semibold text-red-600">
                  {formatTime(recordingTime)}
                </span>
              </>
            ) : (
              <>
                <button
                  onClick={startRecording}
                  className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700"
                >
                  🎤 Start Recording
                </button>
                <span className="text-sm text-gray-500">Tap to begin</span>
              </>
            )}
          </div>
          {transcript && (
            <div className="mt-4 p-3 bg-white rounded border border-gray-300">
              <p className="text-xs font-semibold text-gray-600 mb-2">Transcript (auto-updating):</p>
              <p className="text-sm text-gray-700">{transcript}</p>
            </div>
          )}
        </div>

        {/* Related Documents */}
        <div className="mb-6">
          <p className="text-sm font-semibold text-gray-900 mb-3">📋 Related documents for this round:</p>
          <div className="grid grid-cols-2 gap-2">
            {documents.map(doc => (
              <div key={doc.id} className="flex items-start gap-2 p-2 bg-gray-50 rounded">
                <input
                  type="checkbox"
                  className="mt-1"
                  onChange={(e) => setVerificationTracking({
                    ...verificationTracking,
                    [doc.name]: e.target.checked
                  })}
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                  <p className="text-xs text-gray-600">{doc.purpose}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Email Upload Channel */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm font-semibold text-blue-900 mb-2">📧 Email documents in:</p>
          {uploadChannel ? (
            <div className="flex items-center gap-2 flex-wrap">
              <code className="text-xs bg-white px-2 py-1 rounded border border-blue-200">{uploadChannel.dedicated_email}</code>
              <button
                type="button"
                onClick={() => { navigator.clipboard.writeText(uploadChannel.dedicated_email); toast.success('Copied'); }}
                className="text-xs text-blue-700 underline"
              >
                Copy
              </button>
              <button
                type="button"
                onClick={handleSyncDocuments}
                disabled={syncingDocs}
                className="ml-auto px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {syncingDocs ? 'Checking…' : 'Check for new documents'}
              </button>
            </div>
          ) : (
            <p className="text-xs text-blue-700">Loading upload address…</p>
          )}
          {receivedDocs.length > 0 && (
            <div className="mt-3 space-y-1">
              {receivedDocs.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => openDocument(doc)}
                  className="w-full text-left text-xs bg-white px-2 py-1.5 rounded border border-blue-200 hover:border-blue-400 flex items-center justify-between"
                >
                  <span>{doc.file_name}</span>
                  <span className="text-blue-600">View</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Verification Triangle */}
        <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded">
          <p className="text-sm font-semibold text-orange-900 mb-3">🔍 Verification Triangle:</p>
          <div className="grid grid-cols-3 gap-4">
            {VERIFICATION_TRIANGLE.sources.map((source, idx) => (
              <div key={idx} className="text-center">
                <div className="text-2xl mb-2">
                  {source.name === 'Founder Word' && '👤'}
                  {source.name === 'Documents' && '📄'}
                  {source.name === 'Independent Observation' && '🔎'}
                </div>
                <p className="text-xs font-semibold text-orange-900">{source.name}</p>
                <p className="text-xs text-orange-700 mt-1">{source.description}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-orange-700 mt-3 text-center">
            ✅ Every claim requires validation from all 3 sources
          </p>
        </div>

        {/* Sector Module Questions */}
        {sectorModule && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded">
            <p className="text-sm font-semibold text-amber-900 mb-3">
              🏭 {sectorModule.name} - Sector-Specific Questions:
            </p>
            <ul className="space-y-2">
              {sectorModule.additionalQuestions.map((q, idx) => (
                <li key={idx} className="text-sm text-amber-800 flex gap-2">
                  <span>•</span>
                  <span>{q}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={saveResponse}
            disabled={!interviewRowId}
            className="px-6 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Response
          </button>
          <button
            onClick={generateAnalysis}
            disabled={!interviewRowId}
            className="px-6 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Analyze
          </button>
          <button
            onClick={() => setCurrentQuestion(Math.min(currentQuestion + 1, questions.length - 1))}
            className="ml-auto px-6 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
          >
            Next Question →
          </button>
        </div>
      </div>

      {/* Internal Verification Checklist */}
      <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-sm font-semibold text-gray-900 mb-4">✅ Internal Verification Checklist:</p>
        <div className="space-y-2">
          {questions.slice(0, 4).map((q, idx) => (
            <label key={idx} className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="w-4 h-4" />
              <span className="text-sm text-gray-700">{q.internalSteps[0]}</span>
            </label>
          ))}
        </div>
      </div>

      {/* AI Analysis Results */}
      {aiAnalysis && (
        <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-lg font-bold mb-4">📊 AI Analysis Results</h3>

          {/* Red Flags */}
          {aiAnalysis.redFlags && aiAnalysis.redFlags.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded">
              <p className="text-sm font-semibold text-red-900 mb-3">🚩 Red Flags:</p>
              {aiAnalysis.redFlags.map((flag: any, idx: number) => (
                <div key={idx} className="mb-2 text-sm">
                  <span className={`font-semibold ${
                    flag.severity === 'WALK_AWAY' ? 'text-red-700' :
                    flag.severity === 'PRICE_IT_IN' ? 'text-orange-700' :
                    'text-yellow-700'
                  }`}>
                    {flag.severity}:
                  </span>
                  <span className="text-red-800 ml-2">{flag.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Follow-up Questions */}
          {aiAnalysis.followUpQuestions && aiAnalysis.followUpQuestions.length > 0 && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm font-semibold text-blue-900 mb-3">🎯 AI-Generated Follow-up Questions:</p>
              {aiAnalysis.followUpQuestions.map((q: string, idx: number) => (
                <p key={idx} className="text-sm text-blue-800 mb-2">• {q}</p>
              ))}
            </div>
          )}

          {/* Voice Analysis */}
          {aiAnalysis.voiceAnalysis && (
            <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded">
              <p className="text-sm font-semibold text-orange-900 mb-3">🎙️ Voice Analysis:</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-orange-700">Confidence: <span className="font-bold">{aiAnalysis.voiceAnalysis.confidenceLevel}%</span></p>
                  <p className="text-orange-700">Pace: <span className="font-bold">{aiAnalysis.voiceAnalysis.speakingPace}</span></p>
                </div>
                <div>
                  <p className="text-orange-700">Hesitation: <span className="font-bold">{aiAnalysis.voiceAnalysis.hesitationMarkers}</span> markers</p>
                  <p className="text-orange-700">Assessment: <span className="font-bold">{aiAnalysis.voiceAnalysis.assessment}</span></p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Round Gates */}
      {currentQuestion === questions.length - 1 && (
        <div className="p-6 bg-teal-50 border border-teal-200 rounded-lg">
          <h3 className="text-lg font-bold mb-3">✅ Round Gates</h3>
          {aiAnalysis?.redFlags?.some((f: any) => f.severity === 'WALK_AWAY') ? (
            <div className="p-4 bg-red-100 border border-red-300 rounded">
              <p className="text-red-900 font-semibold">⛔ Cannot proceed to next round</p>
              <p className="text-red-800 text-sm mt-2">Walk Away flags must be resolved before continuing due diligence.</p>
            </div>
          ) : (
            <div className="p-4 bg-green-100 border border-green-300 rounded">
              <p className="text-green-900 font-semibold">✅ Clear to proceed to next round</p>
              <button
                onClick={handleAdvance}
                disabled={!interviewRowId || advancing}
                className="mt-3 px-6 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {advancing ? 'Saving…' : round < 5 ? `Continue to Round ${round + 1}` : 'Complete Due Diligence'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DDInterviewEnhanced;
