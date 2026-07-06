import { createFileRoute } from "@tanstack/react-router";
import { useParams, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Mic, Pause, Save, ChevronRight, ChevronLeft, Upload, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { saveWorkflowResponse, updateWorkflowStep } from "@/lib/dd-workflow-api";

export const Route = createFileRoute("/dd-engine/wizard/$oppId")({ component: () => <DDEngineWizard /> });

const WORKFLOW_STEPS = [
  {
    step: 1,
    name: "Screening",
    description: "Initial business verification and basic metrics",
    questions: [
      "What does the business sell and who pays for it?",
      "How much revenue did the business generate in the last month, last quarter, and last year?",
      "What percentage of revenue is cash, card, EFT, or other?",
      "What costs are absolutely necessary to keep the business open?",
      "How much money does the founder personally take from the business each month?",
      "What loans or debts does the business or founder currently have?",
      "What would R100k, R250k, or R500k actually be used for?"
    ],
    documents: ["Bank statements (6-12 months)", "Card processor statements", "Debt schedule", "Supplier invoices"]
  },
  {
    step: 2,
    name: "Founder Assessment",
    description: "Evaluate founder against 4 core traits",
    questions: [
      "Can the founder tell the truth even when the facts make them look bad? (Truthfulness)",
      "Does the founder understand customers, pricing, and how money is made? (Commercial Instinct)",
      "Will the founder accept guardrails, reporting, and challenge? (Coachability)",
      "Does the founder want to build an asset, or only extract short-term cash? (Owner Mentality)"
    ],
    documents: ["ID and background", "Business history", "References"]
  },
  {
    step: 3,
    name: "Diagnostic Framework",
    description: "Deep analysis of business health",
    questions: [
      "What is the revenue quality rating? (A: Durable, B: Promising, C: Fragile, D: Unproven)",
      "What is the profit quality rating? (Clean, Hidden, Inflated, or False profit)",
      "What is the cash discipline and control risk rating?",
      "What is the complete debt and liabilities map?",
      "What is the tax/VAT readiness and compliance exposure?",
      "What is the founder dependency and business replaceability rating?",
      "What is the operational maturity and systems gap assessment?",
      "Will R100k-R500k meaningfully change trajectory?"
    ],
    documents: ["Financial records", "Customer list", "Payroll/staff list", "Tax registration and SARS correspondence"]
  },
  {
    step: 4,
    name: "Due Diligence",
    description: "Comprehensive verification and risk assessment",
    questions: [
      "Who owns and controls the business? (Legal existence)",
      "Is the founder who they say they are? (Founder identity verification)",
      "Can cash flow be reconstructed from banking records?",
      "Is revenue real and repeatable? (Revenue verification)",
      "What does the business truly cost to run? (Cost verification)",
      "What is true business profit after normalizing owner pay?",
      "What claims exist on future cash flow? (Debt verification)",
      "Is there quantifiable compliance exposure? (Tax/VAT assessment)",
      "Are labour obligations understood and current?",
      "How durable is customer demand?",
      "Can the business keep operating smoothly with suppliers?",
      "What assets exist and who owns them?",
      "Can the business keep trading from its base? (Premises lease/rent)",
      "Are there hidden liabilities or disputes?"
    ],
    documents: ["Registration documents", "6-12 months bank statements", "All business accounts", "Revenue invoices/receipts", "Staff list and pay records", "Tenant agreement/lease", "Tax records", "Insurance documents"]
  },
  {
    step: 5,
    name: "Decision & Recommendation",
    description: "Investment decision and next steps",
    questions: [
      "What is the verified revenue estimate?",
      "What is the normalised profit estimate?",
      "What is the debt and liabilities schedule?",
      "What is the founder integrity assessment?",
      "What is the mess classification (Green/Amber/Red/Black/Strategic)?",
      "What guardrails are required?",
      "What is the valuation range?",
      "What is the proposed structure (equity/debt/hybrid)?",
      "Should we proceed, observe, request more evidence, or decline?"
    ],
    documents: ["Valuation analysis", "Deal structure proposal", "Investment recommendation memo"]
  }
];

function DDEngineWizard() {
  const { oppId } = useParams({ from: "/dd-engine/wizard/$oppId" });
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const qc = useQueryClient();

  const stepData = WORKFLOW_STEPS[currentStep - 1];

  // Auto-save responses
  const autoSaveMutation = useMutation({
    mutationFn: async (data: any) => {
      await saveWorkflowResponse(
        oppId,
        data.step,
        data.stepName,
        data.responses,
        data.transcripts,
        data.status || "in_progress"
      );
      await updateWorkflowStep(oppId, data.step, data.status || "in_progress");
      return data;
    },
    onSuccess: () => {
      // Silently save without toast spam
    },
    onError: (error) => {
      console.error("Auto-save failed:", error);
    },
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      if (Object.keys(responses).length > 0) {
        autoSaveMutation.mutate({ oppId, step: currentStep, responses });
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [responses]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        // TODO: Send to speech-to-text API and update responses
        toast.success("Audio recorded");
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      toast.error("Microphone access denied");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handlePause = async () => {
    try {
      await autoSaveMutation.mutateAsync({
        oppId,
        step: currentStep,
        stepName: stepData.name,
        responses,
        status: "paused",
      });
      setIsPaused(true);
      toast.info("Progress saved. You can resume later.");
    } catch (err) {
      toast.error("Failed to save. Please try again.");
    }
  };

  const handleExit = async () => {
    await handlePause();
    navigate({ to: "/dd-engine" });
  };

  const handleResume = () => {
    setIsPaused(false);
  };

  const handleComplete = async () => {
    try {
      await autoSaveMutation.mutateAsync({
        oppId,
        step: currentStep,
        stepName: stepData.name,
        responses,
        status: "completed",
      });
      toast.success("Workflow completed!");
      navigate({ to: "/dd-engine" });
    } catch (err) {
      toast.error("Failed to complete workflow. Please try again.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-serif mb-2">Due Diligence Engine</h1>
        <p className="text-muted-foreground">Step {currentStep} of {WORKFLOW_STEPS.length}: {stepData.name}</p>
        <div className="flex gap-2 mt-4">
          {WORKFLOW_STEPS.map((s) => (
            <div
              key={s.step}
              className={`h-2 flex-1 rounded ${
                s.step < currentStep ? "bg-green-500" : s.step === currentStep ? "bg-blue-500" : "bg-gray-300"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Current Step */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>{stepData.description}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {stepData.questions.map((q, idx) => (
            <div key={idx} className="border rounded-lg p-4">
              <label className="text-sm font-medium block mb-2">{q}</label>
              <textarea
                value={responses[`q${idx + 1}`] || ""}
                onChange={(e) => setResponses({ ...responses, [`q${idx + 1}`]: e.target.value })}
                className="w-full px-3 py-2 border rounded-md text-sm"
                rows={3}
                placeholder="Type or use voice transcription..."
              />
              <div className="flex gap-2 mt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={isRecording ? "bg-red-100" : ""}
                >
                  <Mic className="h-4 w-4 mr-1" />
                  {isRecording ? "Stop" : "Record"}
                </Button>
              </div>
            </div>
          ))}

          {/* Document Upload Section */}
          <div className="border-t pt-6">
            <h3 className="font-medium mb-4">Required Documents for this Step</h3>
            <div className="space-y-2">
              {stepData.documents.map((doc, idx) => (
                <div key={idx} className="flex items-center gap-2 p-3 border rounded">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{doc}</span>
                  <Button size="sm" variant="ghost" className="ml-auto">Add</Button>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex gap-4 justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
          disabled={currentStep === 1}
        >
          <ChevronLeft className="h-4 w-4 mr-2" /> Previous
        </Button>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExit} className="text-destructive">
            <X className="h-4 w-4 mr-2" /> Exit
          </Button>
          {currentStep === WORKFLOW_STEPS.length ? (
            <Button onClick={handleComplete}>
              Complete & Submit <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={() => setCurrentStep(Math.min(WORKFLOW_STEPS.length, currentStep + 1))}>
              Next <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>

      {/* Status */}
      {isPaused && (
        <div className="mt-4 p-4 bg-yellow-100 rounded-lg flex items-center justify-between">
          <span className="text-sm font-medium">Workflow paused at Step {currentStep}: {stepData.name}</span>
          <Button size="sm" onClick={handleResume}>Resume</Button>
        </div>
      )}
    </div>
  );
}
