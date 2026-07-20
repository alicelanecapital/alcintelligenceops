import { useState, useRef, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { SECTOR_MODULES, VERIFICATION_TRIANGLE } from '@/lib/dd-framework-data';
import { fetchFrameworkRoundDetail, fetchRoundOwnDocuments, fetchAllFrameworkRounds } from '@/lib/dd-framework-admin';
import { detectSector, generateAnalysisReport, MIN_SECTOR_CONFIDENCE } from '@/lib/dd-sector-detection';
import { useServerFn } from '@tanstack/react-start';
import { getOrCreateUploadChannel, syncUploadChannelDocuments, getSignedDocumentUrl } from '@/lib/dd-upload-channel.functions';
import { generateStakeholderBrief } from '@/lib/stakeholder-brief.functions';
import { generateDiscProfile } from '@/lib/dd-personality.functions';
import { generateOpportunityOverview } from '@/lib/dd-overview.functions';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { extractTranscriptText } from '@/lib/extract-transcript-text';
import { generateAnomalyQuestions } from '@/lib/dd-anomaly-questions.functions';
import { listExtraQuestions, addExtraQuestion, updateExtraQuestion, deleteExtraQuestion, type ExtraQuestion } from '@/lib/dd-interview-extra-questions';
import { listCustomQuestions, addCustomQuestion, updateCustomQuestion, deleteCustomQuestion, type CustomQuestion } from '@/lib/dd-interview-custom-questions';

const SPEAKER_COLOR_CLASSES = [
  'text-blue-700',
  'text-emerald-700',
  'text-purple-700',
  'text-orange-700',
  'text-pink-700',
  'text-cyan-700',
];

/** Colour-codes each speaker in a transcript consistently, so "Founder:" lines read in a
 * different colour from "Interviewer:" lines etc. Assumes a "Speaker name: ..." line format
 * (what /api/transcribe and manual transcripts both tend to produce); lines without that
 * pattern render as plain continuation text. */
function renderSpeakerColoredTranscript(text: string) {
  const speakerColors = new Map<string, string>();
  const colorFor = (speaker: string) => {
    if (!speakerColors.has(speaker)) {
      speakerColors.set(speaker, SPEAKER_COLOR_CLASSES[speakerColors.size % SPEAKER_COLOR_CLASSES.length]);
    }
    return speakerColors.get(speaker)!;
  };

  return text.split('\n').map((line, i) => {
    if (!line.trim()) return <div key={i} className="h-2" />;
    const match = line.match(/^([A-Za-z][A-Za-z0-9 .'-]{0,40}):\s*(.*)$/);
    if (match) {
      const [, speaker, rest] = match;
      return (
        <p key={i} className="text-sm whitespace-pre-wrap">
          <span className={`font-semibold ${colorFor(speaker.trim())}`}>{speaker.trim()}:</span>{' '}
          <span className="text-gray-700">{rest}</span>
        </p>
      );
    }
    return <p key={i} className="text-sm text-gray-700 whitespace-pre-wrap">{line}</p>;
  });
}

export function DDInterviewEnhanced({ opportunityId, round, onStakeholderBriefChange, onSectorChange }: {
  opportunityId: string;
  round: number;
  /** Surfaces the stakeholder brief/detected-sector up to the parent route, which now renders
   * them (alongside DISC/AI overview) in the fixed "About the Business" / "About {founder}"
   * panel above the round content, instead of inline here. */
  onStakeholderBriefChange?: (brief: any) => void;
  onSectorChange?: (sector: string | null, confidence: number) => void;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [sector, setSector] = useState<string | null>(null);
  const [sectorConfidence, setSectorConfidence] = useState(0);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [interviewRowId, setInterviewRowId] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const [uploadChannel, setUploadChannel] = useState<{ dedicated_email: string } | null>(null);
  const [receivedDocs, setReceivedDocs] = useState<any[]>([]);
  const [syncingDocs, setSyncingDocs] = useState(false);
  const [stakeholderBrief, setStakeholderBrief] = useState<any>(null);
  const [uploadingTranscript, setUploadingTranscript] = useState(false);
  const [extraQuestions, setExtraQuestions] = useState<ExtraQuestion[]>([]);
  const [generatingAnomalyQuestions, setGeneratingAnomalyQuestions] = useState(false);
  const [newExtraQuestion, setNewExtraQuestion] = useState('');
  const [editingExtraQuestionId, setEditingExtraQuestionId] = useState<string | null>(null);
  const [editingExtraQuestionText, setEditingExtraQuestionText] = useState('');
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([]);
  const [newCustomQuestion, setNewCustomQuestion] = useState('');
  const [editingCustomQuestionId, setEditingCustomQuestionId] = useState<string | null>(null);
  const [editingCustomQuestionText, setEditingCustomQuestionText] = useState('');
  const [gateAction, setGateAction] = useState<'hold' | 'terminate' | null>(null);
  const [gateComment, setGateComment] = useState('');
  const [submittingGateAction, setSubmittingGateAction] = useState(false);
  const [activeStep, setActiveStep] = useState<'documents' | 'questions' | 'software' | 'verification' | 'ai_analysis'>('documents');
  const [humanAssessment, setHumanAssessment] = useState('');
  const [savingAssessment, setSavingAssessment] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptFileInputRef = useRef<HTMLInputElement | null>(null);
  const autoSyncedRef = useRef(false);
  const getOrCreateChannelFn = useServerFn(getOrCreateUploadChannel);
  const syncDocsFn = useServerFn(syncUploadChannelDocuments);
  const getSignedUrlFn = useServerFn(getSignedDocumentUrl);
  const generateBriefFn = useServerFn(generateStakeholderBrief);
  const generateDiscFn = useServerFn(generateDiscProfile);
  const generateOverviewFn = useServerFn(generateOpportunityOverview);
  const generateAnomalyQuestionsFn = useServerFn(generateAnomalyQuestions);

  // Regenerates DISC profile, AI overview, and stakeholder brief every time this round loads
  // (not just once when first created) -- no manual "Generate" button, and any new information
  // populated since the last visit (new contacts, new documents, a later round's transcript)
  // surfaces automatically on refresh instead of needing a round action to trigger it.
  const refreshAllOnLoad = (id: string) => {
    generateDiscFn({ data: { opportunityId } })
      .then(() => qc.invalidateQueries({ queryKey: ['opportunity-company-details', opportunityId] }))
      .catch(() => { /* not enough data yet, ignore */ });
    generateOverviewFn({ data: { opportunityId } })
      .then(() => qc.invalidateQueries({ queryKey: ['opportunity-company-details', opportunityId] }))
      .catch(() => { /* not enough data yet, ignore */ });
    generateBriefFn({ data: { opportunityId, interviewId: id, round } })
      .then((brief) => setStakeholderBrief(brief))
      .catch(() => { /* not enough contact data yet, ignore */ });
  };

  // Surface these two up to the parent's fixed overview panel whenever they change (including
  // on initial load from the existing dd_interviews row). Sector is stored as a single-letter
  // code (A-E) -- surface the human-readable module name, not the raw code.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { onStakeholderBriefChange?.(stakeholderBrief); }, [stakeholderBrief]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const name = sector ? SECTOR_MODULES[sector as keyof typeof SECTOR_MODULES]?.name ?? sector : null;
    onSectorChange?.(name, sectorConfidence);
  }, [sector, sectorConfidence]);

  // Questions and required documents are admin-editable (see /admin/dd-framework)
  // and live in dd_framework_rounds/questions/documents rather than the old
  // hardcoded dd-framework-data.ts arrays.
  const framework = useQuery({ queryKey: ['dd-framework-round', round], queryFn: () => fetchFrameworkRoundDetail(round) });
  const roundData = framework.data?.round;
  // Round count isn't fixed at 5 -- DD Framework Admin can add/remove rounds -- so the "last
  // round" for Round Gates/advancing is whatever the highest configured round actually is.
  const allRounds = useQuery({ queryKey: ['dd-framework-rounds'], queryFn: fetchAllFrameworkRounds });
  const maxRound = Math.max(1, ...(allRounds.data ?? []).map((r) => r.round));
  const questions = (framework.data?.questions ?? []).map((q) => ({
    number: q.sort_order,
    question: q.question_text,
    why: q.why_text ?? '',
    internalSteps: q.internal_steps ?? [],
    redFlags: q.red_flags ?? [],
  }));
  // Round 1 has no earlier round to have already requested documents ahead of time, so its
  // "Documents Required" step (moved near the end of round 1's own stepper, right before
  // Internal Verification) merges in round 2's required documents too -- everything the
  // interviewee needs to have in before continuing. Every later round shows only its own.
  const isFirstRound = round === 1;
  const requiredDocuments = useQuery({
    queryKey: ['dd-framework-required-documents', round],
    queryFn: async () => {
      if (isFirstRound) {
        const [own, next] = await Promise.all([fetchRoundOwnDocuments(1), fetchRoundOwnDocuments(2)]);
        return [...own, ...next];
      }
      return fetchRoundOwnDocuments(round);
    },
  });
  const isDocumentReceived = (docName: string) => {
    const needle = docName.toLowerCase();
    return receivedDocs.some((d: any) => {
      const fileBase = (d.file_name ?? '').toLowerCase().replace(/\.[a-z0-9]+$/, '');
      return fileBase.includes(needle) || needle.includes(fileBase);
    });
  };
  // Every round needs its own dd_interviews row before responses/documents/analysis
  // can be saved against it (dd_round_responses.interview_id is a foreign key into
  // dd_interviews, not opportunities). Get-or-create it on mount for this opportunity+round.
  useEffect(() => {
    let cancelled = false;
    setInterviewRowId(null);
    setTranscript('');
    setAiAnalysis(null);
    setStakeholderBrief(null);
    setHumanAssessment('');
    // Round 1's stepper leads with Interview Questions (Documents Required moves to near the
    // end there); every later round leads with Document Analysis.
    setActiveStep(round === 1 ? 'questions' : 'documents');

    (async () => {
      // stakeholder_brief is new and not yet in the generated Supabase types -- cast until
      // types.ts is regenerated post-migration. human_assessment is fetched separately below
      // (not in this primary select) so that an unmigrated database doesn't break loading this
      // round entirely -- Supabase rejects the whole query if any selected column is unknown.
      const { data: existing, error: findError } = await (supabase.from('dd_interviews') as any)
        .select('id, status, transcript, ai_analysis, detected_sector, sector_confidence, stakeholder_brief')
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
          (async () => {
            try {
              const { data, error } = await (supabase.from('dd_interviews') as any)
                .select('human_assessment')
                .eq('id', existing.id)
                .maybeSingle();
              if (!error && !cancelled && data?.human_assessment) setHumanAssessment(data.human_assessment);
            } catch { /* column not migrated yet, ignore */ }
          })();
          if (existing.detected_sector) {
            setSector(existing.detected_sector);
            setSectorConfidence(existing.sector_confidence ? Math.round(existing.sector_confidence) : 0);
          }
          // Show the cached brief immediately (no flicker), then refresh everything in the
          // background so any new information shows up without a manual click or round action.
          if (existing.stakeholder_brief) setStakeholderBrief(existing.stakeholder_brief);
          refreshAllOnLoad(existing.id);
        }
        return;
      }

      // Insert-then-select races when this effect fires twice in quick succession (e.g. React
      // StrictMode's double-invoke in dev, or a fast re-render) -- both calls pass the "not
      // found" check above before either insert lands. Rather than fail the second caller on
      // the unique (opportunity_id, round) constraint, fall back to fetching the row the other
      // call just created.
      const { data: created, error: createError } = await supabase
        .from('dd_interviews')
        .insert({ opportunity_id: opportunityId, round, status: 'in_progress', started_at: new Date().toISOString() })
        .select('id')
        .single();
      if (createError) {
        if (createError.code === '23505') {
          const { data: raceWinner, error: refetchError } = await (supabase.from('dd_interviews') as any)
            .select('id, transcript, ai_analysis, detected_sector, sector_confidence, stakeholder_brief')
            .eq('opportunity_id', opportunityId)
            .eq('round', round)
            .maybeSingle();
          if (!refetchError && raceWinner && !cancelled) {
            setInterviewRowId(raceWinner.id);
            if (raceWinner.transcript) setTranscript(raceWinner.transcript);
            if (raceWinner.ai_analysis) setAiAnalysis(raceWinner.ai_analysis);
            if (raceWinner.stakeholder_brief) setStakeholderBrief(raceWinner.stakeholder_brief);
            if (raceWinner.detected_sector) {
              setSector(raceWinner.detected_sector);
              setSectorConfidence(raceWinner.sector_confidence ? Math.round(raceWinner.sector_confidence) : 0);
            }
            refreshAllOnLoad(raceWinner.id);
            return;
          }
        }
        toast.error('Failed to start this round: ' + createError.message);
        return;
      }
      if (!cancelled) {
        setInterviewRowId(created.id);
        refreshAllOnLoad(created.id);
      }
    })();

    return () => { cancelled = true; };
  }, [opportunityId, round]);

  // Silently regenerates the DISC profile, AI overview, and stakeholder brief in the
  // background whenever new round data comes in (a transcript is captured, analysis runs,
  // or the round is completed), then invalidates the opportunity query so OpportunityOverviewBar
  // picks up the fresh data. Deliberately fire-and-forget with no loading UI -- there's no
  // manual "Generate" control for any of these.
  const refreshOpportunityIntelligence = () => {
    (async () => {
      try { await generateDiscFn({ data: { opportunityId } }); } catch { /* not enough data yet, ignore */ }
      try { await generateOverviewFn({ data: { opportunityId } }); } catch { /* not enough data yet, ignore */ }
      if (interviewRowId) {
        try {
          const brief = await generateBriefFn({ data: { opportunityId, interviewId: interviewRowId, round } });
          setStakeholderBrief(brief);
        } catch { /* not enough contact data yet, ignore */ }
      }
      qc.invalidateQueries({ queryKey: ['opportunity-company-details', opportunityId] });
    })();
  };

  // Runs sector detection with the founder's stated sector / company industry as a hint
  // so we don't misclassify (e.g. an aesthetics/dentistry practice as "Software"). Only
  // writes back when we're above the minimum confidence threshold; syncs the result to the
  // opportunities row too so the pipeline list and detail page stay in sync with the round.
  const runSectorDetectionAndSync = async (transcriptText: string) => {
    let hint: string | null = null;
    try {
      const { data: opp } = await (supabase.from('opportunities') as any)
        .select('founder:founders(sector), company:companies(industry), industry')
        .eq('id', opportunityId).maybeSingle();
      hint = opp?.company?.industry ?? opp?.founder?.sector ?? opp?.industry ?? null;
    } catch { /* ignore */ }
    const detection = await detectSector({ data: { responses: [transcriptText], hint } });
    if (detection.sector && detection.confidence >= MIN_SECTOR_CONFIDENCE) {
      setSector(detection.sector);
      setSectorConfidence(detection.confidence);
      if (interviewRowId) {
        await supabase.from('dd_interviews').update({
          detected_sector: detection.sector,
          sector_confidence: detection.confidence,
        }).eq('id', interviewRowId);
      }
      await (supabase.from('opportunities') as any).update({
        dd_detected_sector: detection.sector,
        dd_sector_confidence: detection.confidence,
      }).eq('id', opportunityId);
    }
  };

  // Persist the single whole-round transcript against every question in this round, so the
  // existing per-question response records stay populated without needing a manual "save" step.
  const persistTranscriptAgainstAllQuestions = async (text: string) => {
    if (!interviewRowId || !questions.length) return;
    const rows = questions.map((q) => ({
      interview_id: interviewRowId,
      question_number: q.number,
      question_text: q.question,
      founder_response: text,
      response_type: 'transcribed',
      response_source: 'transcript',
    }));
    await supabase.from('dd_round_responses').upsert(rows, { onConflict: 'interview_id,question_number' });
  };

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

  // Transcribe the single whole-round recording via the existing /api/transcribe endpoint
  // (Lovable AI Gateway, server-side key).
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
      if (interviewRowId) {
        await supabase.from('dd_interviews').update({ transcript: text, transcript_source: 'whisper' }).eq('id', interviewRowId);
      }
      await persistTranscriptAgainstAllQuestions(text);

      if (round === 1 && text) {
        await runSectorDetectionAndSync(text);
      }
      refreshOpportunityIntelligence();
    } catch (error) {
      console.error('Transcription failed:', error);
      toast.error('Transcription failed.');
    }
  };

  // Upload a transcript file directly, for rounds where recording wasn't started live.
  // Accepts .txt/.md, .pdf, and .doc/.docx -- text is extracted client-side.
  const handleTranscriptFile = async (file: File) => {
    setUploadingTranscript(true);
    try {
      const text = await extractTranscriptText(file);
      if (!text) {
        toast.error("Couldn't find any text in that file.");
        return;
      }
      setTranscript(text);
      if (interviewRowId) {
        await supabase.from('dd_interviews').update({ transcript: text, transcript_source: 'manual' }).eq('id', interviewRowId);
      }
      await persistTranscriptAgainstAllQuestions(text);
      toast.success('Transcript uploaded');

      if (round === 1 && text) {
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
      refreshOpportunityIntelligence();
    } catch (error: any) {
      toast.error('Failed to read transcript file: ' + (error?.message ?? 'unknown error'));
    } finally {
      setUploadingTranscript(false);
    }
  };

  // Generate AI analysis: assimilates the single whole-round transcript against every
  // question in this round to produce meaningful deductions (red flags, follow-ups, etc).
  const generateAnalysis = async () => {
    if (!interviewRowId) {
      toast.error('This round is still loading — try again in a moment.');
      return;
    }
    if (!transcript) {
      toast.error('Record or upload this round\'s transcript first.');
      return;
    }
    setAnalyzing(true);
    try {
      const analysis = await generateAnalysisReport({
        data: {
          interviewId: interviewRowId,
          transcript,
          sector: sector || 'Unknown',
          round,
          scriptedQuestions: questions.map((q) => q.question),
        }
      });
      setAiAnalysis(analysis);
      await supabase.from('dd_interviews').update({ ai_analysis: analysis as any }).eq('id', interviewRowId);
      refreshOpportunityIntelligence();
    } catch (error: any) {
      console.error('Analysis generation failed:', error);
      toast.error('Analysis generation failed: ' + (error?.message ?? 'unknown error'));
    } finally {
      setAnalyzing(false);
    }
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
      refreshOpportunityIntelligence();
      qc.invalidateQueries({ queryKey: ['dd-interview-statuses', opportunityId] });

      if (round < maxRound) {
        // Documents required for the next round are only sent out now, at the point of
        // advancing -- not shown as a standing checklist in the app. Real sending isn't wired
        // up yet (no confirmed source for the founder's email address); this simulates it so
        // the trigger point and content are in place ahead of that.
        try {
          const nextRoundDocs = await fetchRoundOwnDocuments(round + 1);
          const docNames = nextRoundDocs.map((d) => d.name).join(', ');
          console.log(`[Simulated email] Documents required ahead of Round ${round + 1}: ${docNames || '(none specified)'}`);
          toast.success(docNames ? `Round ${round} complete — email queued requesting: ${docNames}` : `Round ${round} complete`);
        } catch {
          toast.success(`Round ${round} complete`);
        }
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

  // Any AI-suggested or manually added questions raised from reviewing this round's documents,
  // evaluated before the session (separate from the admin-managed framework questions).
  useEffect(() => {
    if (!interviewRowId) return;
    let cancelled = false;
    (async () => {
      try {
        const rows = await listExtraQuestions(interviewRowId);
        if (!cancelled) setExtraQuestions(rows);
      } catch (error: any) {
        console.error('Failed to load document-review questions:', error);
      }
    })();
    return () => { cancelled = true; };
  }, [interviewRowId]);

  // Custom questions the interviewer added for this specific opportunity+round -- separate
  // from the shared DD Framework template, which every opportunity uses.
  useEffect(() => {
    if (!interviewRowId) return;
    let cancelled = false;
    (async () => {
      try {
        const rows = await listCustomQuestions(interviewRowId);
        if (!cancelled) setCustomQuestions(rows);
      } catch (error: any) {
        console.error('Failed to load custom questions:', error);
      }
    })();
    return () => { cancelled = true; };
  }, [interviewRowId]);

  const handleAddCustomQuestion = async () => {
    if (!interviewRowId || !newCustomQuestion.trim()) return;
    try {
      const created = await addCustomQuestion(interviewRowId, newCustomQuestion.trim());
      setCustomQuestions((prev) => [...prev, created]);
      setNewCustomQuestion('');
    } catch (error: any) {
      toast.error('Failed to add question: ' + (error?.message ?? 'unknown error'));
    }
  };

  const handleSaveCustomQuestionEdit = async (id: string) => {
    if (!editingCustomQuestionText.trim()) return;
    try {
      await updateCustomQuestion(id, editingCustomQuestionText.trim());
      setCustomQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, question_text: editingCustomQuestionText.trim() } : q)));
      setEditingCustomQuestionId(null);
    } catch (error: any) {
      toast.error('Failed to save question: ' + (error?.message ?? 'unknown error'));
    }
  };

  const handleDeleteCustomQuestion = async (id: string) => {
    try {
      await deleteCustomQuestion(id);
      setCustomQuestions((prev) => prev.filter((q) => q.id !== id));
    } catch (error: any) {
      toast.error('Failed to delete question: ' + (error?.message ?? 'unknown error'));
    }
  };

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
        if (result.imported > 0) runAnomalyDetection();
      }
    } catch (error: any) {
      toast.error('Failed to check for new documents: ' + (error?.message ?? 'unknown error'));
    } finally {
      setSyncingDocs(false);
    }
  };

  // Automatically check for documents sent since the last meeting as soon as the round is
  // ready, rather than waiting for a manual click -- documents need to be in before the
  // meeting starts, so this should happen without the interviewer remembering to ask.
  useEffect(() => {
    if (!interviewRowId || !uploadChannel || autoSyncedRef.current) return;
    autoSyncedRef.current = true;
    handleSyncDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interviewRowId, uploadChannel]);

  // Reviews received documents (names, categories, sizes, any extracted text) against what
  // was expected for this round and raises follow-up questions for genuine gaps/anomalies --
  // fire-and-forget, evaluated before the session so the interviewer can review beforehand.
  const runAnomalyDetection = async () => {
    if (!interviewRowId) return;
    setGeneratingAnomalyQuestions(true);
    try {
      const inserted = await generateAnomalyQuestionsFn({ data: { opportunityId, interviewId: interviewRowId, round } });
      if (inserted.length) setExtraQuestions((prev) => [...prev, ...inserted]);
    } catch (error: any) {
      console.error('Anomaly question generation failed:', error);
    } finally {
      setGeneratingAnomalyQuestions(false);
    }
  };

  const handleAddExtraQuestion = async () => {
    if (!interviewRowId || !newExtraQuestion.trim()) return;
    try {
      const created = await addExtraQuestion(interviewRowId, newExtraQuestion.trim());
      setExtraQuestions((prev) => [...prev, created]);
      setNewExtraQuestion('');
    } catch (error: any) {
      toast.error('Failed to add question: ' + (error?.message ?? 'unknown error'));
    }
  };

  const handleSaveExtraQuestionEdit = async (id: string) => {
    if (!editingExtraQuestionText.trim()) return;
    try {
      await updateExtraQuestion(id, editingExtraQuestionText.trim());
      setExtraQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, question_text: editingExtraQuestionText.trim() } : q)));
      setEditingExtraQuestionId(null);
    } catch (error: any) {
      toast.error('Failed to save question: ' + (error?.message ?? 'unknown error'));
    }
  };

  const handleDeleteExtraQuestion = async (id: string) => {
    try {
      await deleteExtraQuestion(id);
      setExtraQuestions((prev) => prev.filter((q) => q.id !== id));
    } catch (error: any) {
      toast.error('Failed to delete question: ' + (error?.message ?? 'unknown error'));
    }
  };

  // Human evaluator's own written assessment, captured during Internal Verification and
  // shown alongside the AI's findings in AI Analysis' "Comparison to Human Assessment".
  const saveHumanAssessment = async () => {
    if (!interviewRowId) return;
    setSavingAssessment(true);
    try {
      await supabase.from('dd_interviews').update({ human_assessment: humanAssessment } as any).eq('id', interviewRowId);
      toast.success('Assessment saved');
    } catch (error: any) {
      toast.error('Failed to save assessment: ' + (error?.message ?? 'unknown error'));
    } finally {
      setSavingAssessment(false);
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

  // "Do not proceed" (hold) or "Terminate deal" -- both require a comment and, unlike
  // Continue/Advance, don't move to the next round.
  const handleGateAction = async () => {
    if (!interviewRowId || !gateAction || !gateComment.trim()) return;
    setSubmittingGateAction(true);
    try {
      if (gateAction === 'hold') {
        await supabase.from('dd_interviews').update({
          status: 'on_hold',
          hold_notes: gateComment.trim(),
          hold_at: new Date().toISOString(),
        } as any).eq('id', interviewRowId);
        toast.success('Round marked as not proceeding');
      } else {
        await supabase.from('dd_interviews').update({
          status: 'terminated',
          terminated_notes: gateComment.trim(),
          terminated_at: new Date().toISOString(),
        } as any).eq('id', interviewRowId);
        await supabase.from('opportunities').update({ current_stage: 'Declined' }).eq('id', opportunityId);
        toast.success('Deal marked as terminated');
      }
      setGateAction(null);
      setGateComment('');
      navigate({ to: '/dd-engine' });
    } catch (error: any) {
      toast.error('Failed to save: ' + (error?.message ?? 'unknown error'));
    } finally {
      setSubmittingGateAction(false);
    }
  };

  // Sector-specific module
  const sectorModule = sector ? SECTOR_MODULES[sector as keyof typeof SECTOR_MODULES] : null;

  const documentsStep = { key: 'documents' as const, label: isFirstRound ? 'Documents Required' : 'Document Analysis' };
  const questionsStep = { key: 'questions' as const, label: 'Interview Questions' };
  const softwareStep = { key: 'software' as const, label: 'Sector Questions' };
  const verificationStep = { key: 'verification' as const, label: 'Internal Verification' };
  const aiAnalysisStep = { key: 'ai_analysis' as const, label: 'AI Analysis' };
  // Round 1's Documents Required merges in round 2's requirements (see requiredDocuments
  // above), so it reads more naturally as a final checklist just before moving on, rather
  // than as the first thing reviewed. Every round ends with AI Analysis, one step after
  // Internal Verification, so the AI's findings can be compared against what the human
  // evaluator entered there.
  const SUB_STEPS: { key: typeof activeStep; label: string }[] = isFirstRound
    ? [questionsStep, softwareStep, documentsStep, verificationStep, aiAnalysisStep]
    : [documentsStep, questionsStep, softwareStep, verificationStep, aiAnalysisStep];
  const isLastStep = SUB_STEPS[SUB_STEPS.length - 1].key === activeStep;

  if (framework.isLoading || !roundData) {
    return <div className="max-w-4xl mx-auto p-6 text-center text-gray-500">Loading round…</div>;
  }

  if (!questions.length) {
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

      {/* Within-round vertical stepper: Document Analysis / Interview Questions /
          Sector Questions / Internal Verification / AI Analysis. */}
      <div className="grid grid-cols-[210px_1fr] gap-6 items-start mb-8">
        <div className="space-y-1.5">
          {SUB_STEPS.map((step, idx) => {
            const active = step.key === activeStep;
            return (
              <button
                key={step.key}
                onClick={() => setActiveStep(step.key)}
                className={`w-full text-left flex items-center gap-2.5 px-3 py-3 rounded-lg text-sm transition-all border-l-4 ${active ? 'bg-primary/10 border-l-primary shadow-sm text-primary font-semibold' : 'border-l-transparent text-gray-600 hover:bg-gray-100'}`}
              >
                <span className={`flex items-center justify-center h-6 w-6 rounded-full text-[11px] font-bold shrink-0 ${active ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {idx + 1}
                </span>
                {step.label}
              </button>
            );
          })}
        </div>

        <div className="min-w-0 space-y-6">
          {activeStep === 'documents' && (
            <>
              {/* Documents Received -- must be reviewed before the meeting/recording starts.
                  Auto-refreshes on load with anything sent since the last meeting (or
                  everything, for round 1, since there's no earlier meeting). */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-blue-900">📄 {isFirstRound ? 'Documents Required' : 'Documents Received'}</p>
                  {uploadChannel && (
                    <button
                      type="button"
                      onClick={handleSyncDocuments}
                      disabled={syncingDocs}
                      className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {syncingDocs ? 'Checking…' : 'Check for New Documents'}
                    </button>
                  )}
                </div>
                {uploadChannel ? (
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    <span className="text-xs text-blue-700">Sent To:</span>
                    <code className="text-xs bg-white px-2 py-1 rounded border border-blue-200">{uploadChannel.dedicated_email}</code>
                    <button
                      type="button"
                      onClick={() => { navigator.clipboard.writeText(uploadChannel.dedicated_email); toast.success('Copied'); }}
                      className="text-xs text-blue-700 underline"
                    >
                      Copy
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-blue-700 mb-3">Loading upload address…</p>
                )}

                {requiredDocuments.data && requiredDocuments.data.length > 0 ? (
                  <div className="space-y-1 mb-3">
                    {requiredDocuments.data.map((doc) => {
                      const received = isDocumentReceived(doc.name);
                      return (
                        <div key={doc.id} className="flex items-start justify-between gap-2 bg-white px-2 py-1.5 rounded border border-blue-200">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                            {doc.purpose && <p className="text-xs text-gray-600">{doc.purpose}</p>}
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${received ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                            {received ? 'Received' : 'Missing'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-blue-700 mb-3">No specific documents configured for this round in the DD Framework.</p>
                )}

                {receivedDocs.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-blue-900">All Files Received:</p>
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

              {/* AI-generated (and manually added) questions raised from reviewing the documents
                  above -- evaluated before the session starts, fully CRUD-able since these are
                  per-interview, not part of the admin-managed framework question set. */}
              <div className="p-4 bg-amber-50 border border-amber-200 rounded">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-amber-900">🧩 Document Review Questions</p>
                  <button
                    type="button"
                    onClick={runAnomalyDetection}
                    disabled={!interviewRowId || generatingAnomalyQuestions}
                    className="px-3 py-1.5 bg-amber-600 text-white text-xs rounded hover:bg-amber-700 disabled:opacity-50"
                  >
                    {generatingAnomalyQuestions ? 'Reviewing…' : '🔍 Re-Check Documents'}
                  </button>
                </div>
                <p className="text-xs text-amber-700 mb-3">Anomalies or gaps found in the documents above, to raise and evaluate before the meeting.</p>
                <div className="space-y-2 mb-3">
                  {extraQuestions.map((q) => (
                    <div key={q.id} className="bg-white rounded border border-amber-200 p-2">
                      {editingExtraQuestionId === q.id ? (
                        <div className="flex items-start gap-2">
                          <textarea
                            className="flex-1 text-sm border border-amber-300 rounded px-2 py-1"
                            value={editingExtraQuestionText}
                            onChange={(e) => setEditingExtraQuestionText(e.target.value)}
                            rows={2}
                          />
                          <div className="flex flex-col gap-1">
                            <button onClick={() => handleSaveExtraQuestionEdit(q.id)} className="text-xs text-teal-700 font-medium">Save</button>
                            <button onClick={() => setEditingExtraQuestionId(null)} className="text-xs text-gray-500">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm text-gray-900">{q.question_text}</p>
                            {q.rationale && <p className="text-xs text-amber-700 mt-1">{q.rationale}</p>}
                            {q.source === 'ai_document_review' && <span className="text-[10px] text-amber-500">AI-suggested</span>}
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => { setEditingExtraQuestionId(q.id); setEditingExtraQuestionText(q.question_text); }}
                              className="text-xs text-gray-500 hover:text-gray-700"
                            >
                              Edit
                            </button>
                            <button onClick={() => handleDeleteExtraQuestion(q.id)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {!extraQuestions.length && (
                    <p className="text-xs text-gray-500">No document-review questions yet.</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newExtraQuestion}
                    onChange={(e) => setNewExtraQuestion(e.target.value)}
                    placeholder="Add a question to raise this round…"
                    className="flex-1 text-sm border border-amber-300 rounded px-2 py-1.5"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddExtraQuestion(); }}
                  />
                  <button
                    onClick={handleAddExtraQuestion}
                    disabled={!newExtraQuestion.trim()}
                    className="px-3 py-1.5 bg-white border border-amber-300 text-amber-800 text-xs rounded hover:bg-amber-100 disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              </div>
            </>
          )}

          {activeStep === 'questions' && (
            <>
              {/* One recording for the whole round -- we don't record and stop per question.
                  Analyze Recording lives here too, right next to Start/End Recording, and only
                  activates once a recording has actually stopped and produced a transcript. */}
              <div className="p-4 bg-gray-100 rounded-lg">
                <p className="text-sm font-semibold text-gray-900 mb-3">🎙️ Round Recording ({questions.length} Questions)</p>
                <div className="flex items-center gap-4">
                  {isRecording ? (
                    <>
                      <button
                        onClick={stopRecording}
                        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        ⏹ End Recording
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
                    </>
                  )}
                  <button
                    onClick={generateAnalysis}
                    disabled={!interviewRowId || !transcript || analyzing || isRecording}
                    className="ml-auto px-6 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {analyzing ? 'Analysing…' : 'Analyze Recording'}
                  </button>
                </div>
              </div>

              {/* All questions for this round, collapsed by default -- reference material to
                  guide the single recording above, not separate per-question recordings. */}
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-3">📋 Questions to Cover This Round</p>
                <Accordion type="multiple" className="rounded-lg border border-emerald-300 bg-gray-50 px-3">
                  {questions.map((q, idx) => (
                    <AccordionItem key={idx} value={String(idx)}>
                      <AccordionTrigger className="text-sm">
                        <span className="text-left">Q{idx + 1}. {q.question}</span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 text-sm">
                          {q.why && (
                            <div className="p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
                              <p className="text-xs font-semibold text-blue-900 mb-1">💡 Why This Matters:</p>
                              <p className="text-xs text-blue-800">{q.why}</p>
                            </div>
                          )}
                          {q.redFlags.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-gray-700 mb-1">Red Flags to Watch For:</p>
                              <ul className="text-xs text-gray-600 space-y-0.5">
                                {q.redFlags.map((f: any, i: number) => <li key={i}>• [{f.severity}] {f.text}</li>)}
                              </ul>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>

              {/* Custom questions the interviewer added for this specific opportunity+round --
                  full CRUD, kept separate from the shared DD Framework template so editing one
                  interview's questions never affects any other opportunity. */}
              <div className="p-4 bg-emerald-50/40 border border-emerald-300 rounded">
                <p className="text-sm font-semibold text-gray-900 mb-3">✏️ Custom Questions for This Interview</p>
                <div className="space-y-2 mb-3">
                  {customQuestions.map((q) => (
                    <div key={q.id} className="bg-white rounded border border-emerald-300 p-2">
                      {editingCustomQuestionId === q.id ? (
                        <div className="flex items-start gap-2">
                          <textarea
                            className="flex-1 text-sm border border-emerald-300 rounded px-2 py-1"
                            value={editingCustomQuestionText}
                            onChange={(e) => setEditingCustomQuestionText(e.target.value)}
                            rows={2}
                          />
                          <div className="flex flex-col gap-1">
                            <button onClick={() => handleSaveCustomQuestionEdit(q.id)} className="text-xs text-teal-700 font-medium">Save</button>
                            <button onClick={() => setEditingCustomQuestionId(null)} className="text-xs text-gray-500">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm text-gray-900">{q.question_text}</p>
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => { setEditingCustomQuestionId(q.id); setEditingCustomQuestionText(q.question_text); }}
                              className="text-xs text-gray-500 hover:text-gray-700"
                            >
                              Edit
                            </button>
                            <button onClick={() => handleDeleteCustomQuestion(q.id)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {!customQuestions.length && (
                    <p className="text-xs text-gray-500">No custom questions added for this interview yet.</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newCustomQuestion}
                    onChange={(e) => setNewCustomQuestion(e.target.value)}
                    placeholder="Add a question specific to this interview…"
                    className="flex-1 text-sm border border-emerald-300 rounded px-2 py-1.5"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddCustomQuestion(); }}
                  />
                  <button
                    onClick={handleAddCustomQuestion}
                    disabled={!newCustomQuestion.trim()}
                    className="px-3 py-1.5 bg-white border border-emerald-300 text-gray-800 text-xs rounded hover:bg-gray-100 disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* AI-generated follow-up questions the interviewer didn't ask -- regenerated
                  every time Analyze Recording runs, so it reflects this round's actual
                  transcript rather than a fixed list. Flags answers that seemed incomplete or
                  contradicted something else said, not just generic gaps. */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm font-semibold text-blue-900 mb-3">🎯 AI Questions</p>
                {aiAnalysis?.followUpQuestions && aiAnalysis.followUpQuestions.length > 0 ? (
                  aiAnalysis.followUpQuestions.map((q: string, idx: number) => (
                    <p key={idx} className="text-sm text-blue-800 mb-2">• {q}</p>
                  ))
                ) : (
                  <p className="text-sm text-blue-700">
                    {transcript ? 'No suggested follow-up questions for this round.' : "Fills in once this round's recording has been analysed."}
                  </p>
                )}
              </div>

              {/* Transcript and upload -- comes after the questions since it's the follow-up
                  step once the round recording is done. */}
              <div className="p-4 bg-gray-100 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-900">📝 Transcript</p>
                  <button
                    onClick={() => transcriptFileInputRef.current?.click()}
                    disabled={uploadingTranscript}
                    className="px-3 py-2 bg-white border border-emerald-300 text-gray-700 text-sm rounded hover:bg-gray-50 disabled:opacity-50"
                  >
                    {uploadingTranscript ? 'Reading…' : '📄 Upload Transcript'}
                  </button>
                  <input
                    ref={transcriptFileInputRef}
                    type="file"
                    accept=".txt,.md,.pdf,.doc,.docx,text/plain,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleTranscriptFile(f); e.target.value = ''; }}
                  />
                </div>
                <p className="text-[11px] text-gray-500 mb-2">Didn't record live? Upload a transcript file (.txt, .pdf, .doc, .docx) instead.</p>
                {transcript && (
                  <div className="p-3 bg-white rounded border border-emerald-300 max-h-64 overflow-y-auto space-y-1">
                    <p className="text-xs font-semibold text-gray-600 mb-2">Transcript (Auto-Updating):</p>
                    {renderSpeakerColoredTranscript(transcript)}
                  </div>
                )}
              </div>
            </>
          )}

          {activeStep === 'software' && (
            sectorModule ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded">
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
            ) : (
              <p className="text-sm text-gray-500">No sector detected yet — this fills in automatically once a round has been recorded and analysed.</p>
            )
          )}

          {activeStep === 'verification' && (
            <>
              <div className="p-6 bg-gray-50 rounded-lg border border-emerald-300">
                <p className="text-sm font-semibold text-gray-900 mb-4">✅ Internal Verification Checklist</p>
                <div className="space-y-2">
                  {questions.slice(0, 4).map((q, idx) => (
                    <label key={idx} className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4" />
                      <span className="text-sm text-gray-700">{q.internalSteps[0]}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Human evaluator's own written assessment -- compared against the AI's findings
                  in the AI Analysis step that follows. */}
              <div className="p-4 bg-gray-50 rounded-lg border border-emerald-300">
                <p className="text-sm font-semibold text-gray-900 mb-3">🧑‍⚖️ Human Evaluator Assessment</p>
                <textarea
                  className="w-full text-sm border border-emerald-300 rounded px-3 py-2"
                  rows={4}
                  placeholder="Write your own assessment of this round…"
                  value={humanAssessment}
                  onChange={(e) => setHumanAssessment(e.target.value)}
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={saveHumanAssessment}
                    disabled={!interviewRowId || savingAssessment}
                    className="px-4 py-1.5 bg-gray-700 text-white text-sm rounded hover:bg-gray-800 disabled:opacity-50"
                  >
                    {savingAssessment ? 'Saving…' : 'Save Assessment'}
                  </button>
                </div>
              </div>

              <div className="p-4 bg-orange-50 border border-orange-200 rounded">
                <p className="text-sm font-semibold text-orange-900 mb-3">🔍 Verification Triangle</p>
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
                  ✅ Every Claim Requires Validation From All 3 Sources
                </p>
              </div>
            </>
          )}

          {activeStep === 'ai_analysis' && (
            aiAnalysis ? (
              <>
                <div className="p-6 bg-gray-50 rounded-lg border border-emerald-300">
                  <h3 className="text-lg font-bold mb-4">📊 AI Assessment</h3>
                  {aiAnalysis.redFlags && aiAnalysis.redFlags.length > 0 ? (
                    <div className="p-4 bg-red-50 border border-red-200 rounded">
                      <p className="text-sm font-semibold text-red-900 mb-3">🚩 Red Flags</p>
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
                  ) : (
                    <p className="text-sm text-gray-500">No red flags raised for this round.</p>
                  )}
                </div>

                {aiAnalysis.voiceAnalysis && (
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded">
                    <p className="text-sm font-semibold text-orange-900 mb-3">🎙️ Voice Assessment</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-orange-700">Confidence: <span className="font-bold">{aiAnalysis.voiceAnalysis.confidenceLevel}%</span></p>
                        <p className="text-orange-700">Pace: <span className="font-bold">{aiAnalysis.voiceAnalysis.speakingPace}</span></p>
                      </div>
                      <div>
                        <p className="text-orange-700">Hesitation: <span className="font-bold">{aiAnalysis.voiceAnalysis.hesitationMarkers}</span> Markers</p>
                        <p className="text-orange-700">Assessment: <span className="font-bold">{aiAnalysis.voiceAnalysis.assessment}</span></p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sets the AI's own findings next to what the human evaluator wrote in
                    Internal Verification, so the two can be weighed against each other. */}
                <div className="p-4 bg-indigo-50 border border-indigo-200 rounded">
                  <p className="text-sm font-semibold text-indigo-900 mb-3">⚖️ Comparison to Human Assessment</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="bg-white rounded border border-indigo-200 p-3">
                      <p className="text-xs font-semibold text-indigo-900 mb-1">AI Assessment</p>
                      <p className="text-xs text-gray-700">
                        {aiAnalysis.redFlags?.length
                          ? `${aiAnalysis.redFlags.length} red flag${aiAnalysis.redFlags.length === 1 ? '' : 's'} raised: ${aiAnalysis.redFlags.map((f: any) => f.severity).join(', ')}.`
                          : 'No red flags raised.'}
                      </p>
                    </div>
                    <div className="bg-white rounded border border-indigo-200 p-3">
                      <p className="text-xs font-semibold text-indigo-900 mb-1">Human Assessment</p>
                      <p className="text-xs text-gray-700">{humanAssessment || 'Not yet entered — add one in Internal Verification.'}</p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500">No AI analysis yet — analyze this round's recording from the Interview Questions step first.</p>
            )
          )}
        </div>
      </div>

      {/* Round Gates -- only surfaced on the final sub-step, since advancing (or holding/
          terminating) is a whole-round decision made once everything else has been reviewed. */}
      {isLastStep && (
      <div className="p-6 bg-teal-50 border border-teal-200 rounded-lg">
        <h3 className="text-lg font-bold mb-3">✅ Round Gates</h3>
        {aiAnalysis?.redFlags?.some((f: any) => f.severity === 'WALK_AWAY') ? (
          <div className="p-4 bg-red-100 border border-red-300 rounded">
            <p className="text-red-900 font-semibold">⛔ Cannot Proceed to Next Round</p>
            <p className="text-red-800 text-sm mt-2">Walk Away flags must be resolved before continuing due diligence.</p>
          </div>
        ) : (
          <div className="p-4 bg-green-100 border border-green-300 rounded">
            <p className="text-green-900 font-semibold">✅ Clear to Proceed to Next Round</p>
            <button
              onClick={handleAdvance}
              disabled={!interviewRowId || advancing}
              className="mt-3 px-6 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {advancing ? 'Saving…' : round < maxRound ? `Continue to Round ${round + 1}` : 'Complete Due Diligence'}
            </button>
          </div>
        )}

        {/* Alternatives to advancing: hold this deal here, or terminate it outright.
            Both require a comment explaining the decision. */}
        {gateAction ? (
          <div className={`mt-4 p-4 rounded border ${gateAction === 'terminate' ? 'bg-red-50 border-red-300' : 'bg-gray-50 border-emerald-300'}`}>
            <p className="text-sm font-semibold text-gray-900 mb-2">
              {gateAction === 'terminate' ? 'Terminate This Deal' : 'Do Not Proceed to the Next Round'}
            </p>
            <textarea
              className="w-full text-sm border border-emerald-300 rounded px-2 py-1.5"
              rows={3}
              placeholder="Add a comment explaining this decision…"
              value={gateComment}
              onChange={(e) => setGateComment(e.target.value)}
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => { setGateAction(null); setGateComment(''); }}
                className="px-4 py-1.5 text-sm text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleGateAction}
                disabled={!gateComment.trim() || submittingGateAction}
                className={`px-4 py-1.5 text-sm text-white rounded disabled:opacity-50 ${gateAction === 'terminate' ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-800'}`}
              >
                {submittingGateAction ? 'Saving…' : gateAction === 'terminate' ? 'Confirm Termination' : 'Confirm Hold'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-4 mt-4">
            <button
              onClick={() => setGateAction('hold')}
              disabled={!interviewRowId}
              className="text-sm text-gray-600 hover:text-gray-900 underline disabled:opacity-50"
            >
              Do Not Proceed to Next Round
            </button>
            <button
              onClick={() => setGateAction('terminate')}
              disabled={!interviewRowId}
              className="text-sm text-red-600 hover:text-red-800 underline disabled:opacity-50"
            >
              Terminate Deal
            </button>
          </div>
        )}
      </div>
      )}
    </div>
  );
}

export default DDInterviewEnhanced;
