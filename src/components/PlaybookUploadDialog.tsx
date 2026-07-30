import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { extractTranscriptText } from "@/lib/extract-transcript-text";
import { parsePlaybookDocument } from "@/lib/playbook-upload.functions";
import { buildPlaybookFromParsed, type ParsedPlaybook } from "@/lib/playbook-upload";
import { Upload, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

/** Uploads a questionnaire/playbook document, has AI parse it into rounds/questions, shows
 * a preview for the user to confirm, then writes it into the given toolkit's rounds.
 * `onCreateToolkit` is only needed by the "New playbook from upload" flow -- when set, the
 * dialog creates the toolkit itself (using the parsed name/description as defaults) before
 * writing the rounds, instead of writing into an existing `toolkitId`. */
export function PlaybookUploadDialog({ open, onClose, toolkitId, onCreateToolkit, onDone }: {
  open: boolean;
  onClose: () => void;
  toolkitId?: string;
  onCreateToolkit?: (name: string, description: string) => Promise<string>;
  onDone: () => void;
}) {
  const parseFn = useServerFn(parsePlaybookDocument);
  const [stage, setStage] = useState<"pick" | "parsing" | "preview" | "saving">("pick");
  const [parsed, setParsed] = useState<ParsedPlaybook | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const reset = () => { setStage("pick"); setParsed(null); setName(""); setDescription(""); };

  async function handleFile(file: File) {
    setStage("parsing");
    try {
      const text = await extractTranscriptText(file);
      const result = await parseFn({ data: { text } });
      setParsed(result as ParsedPlaybook);
      setName(result.playbook_name ?? "");
      setDescription(result.playbook_description ?? "");
      setStage("preview");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to read document");
      setStage("pick");
    }
  }

  async function confirm() {
    if (!parsed) return;
    setStage("saving");
    try {
      const id = onCreateToolkit ? await onCreateToolkit(name.trim(), description.trim()) : toolkitId!;
      await buildPlaybookFromParsed(id, parsed);
      toast.success("Playbook populated from document");
      reset();
      onDone();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save playbook");
      setStage("preview");
    }
  }

  const totalQuestions = parsed?.rounds.reduce((n, r) => n + r.questions.length, 0) ?? 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); reset(); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Upload a template</DialogTitle></DialogHeader>

        {stage === "pick" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Upload a .docx, .pdf, .txt or .md file. AI will read it and propose rounds and questions for review before anything is saved.
            </p>
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg p-8 cursor-pointer hover:bg-muted/40 transition-colors">
              <Upload className="h-6 w-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Click to choose a file</span>
              <input
                type="file"
                accept=".docx,.doc,.pdf,.txt,.md"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.currentTarget.value = ""; }}
              />
            </label>
          </div>
        )}

        {stage === "parsing" && (
          <div className="py-12 flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-sm">Reading document and detecting rounds and questions…</span>
          </div>
        )}

        {stage === "preview" && parsed && (
          <div className="space-y-4">
            {onCreateToolkit && (
              <div className="space-y-2">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Playbook name" />
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              Found {parsed.rounds.length} round{parsed.rounds.length === 1 ? "" : "s"}, {totalQuestions} question{totalQuestions === 1 ? "" : "s"}.
            </div>
            <div className="max-h-72 overflow-y-auto space-y-3 border border-border rounded-md p-3">
              {parsed.rounds.map((r, i) => (
                <div key={i}>
                  <div className="flex items-center gap-2 font-serif text-sm">
                    <FileText className="h-3.5 w-3.5 text-primary shrink-0" /> {r.title || `Round ${i + 1}`}
                  </div>
                  <ul className="mt-1 pl-6 space-y-0.5">
                    {r.questions.map((q, qi) => (
                      <li key={qi} className="text-xs text-muted-foreground truncate">{q.question_text}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {stage === "saving" && (
          <div className="py-12 flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-sm">Saving rounds and questions…</span>
          </div>
        )}

        {stage === "preview" && (
          <DialogFooter>
            <Button variant="outline" onClick={reset}>Start over</Button>
            <Button onClick={confirm} disabled={onCreateToolkit ? !name.trim() : false}>Save to playbook</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
