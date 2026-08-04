import { useRef, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, UploadCloud, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import {
  listWorkspaceDocuments, deleteWorkspaceDocument, uploadDocBoxFile,
  readTextSnippet, getDocBoxSignedUrl,
} from "@/lib/workspace-documents";
import { fileWorkspaceDocument } from "@/lib/docbox.functions";
import { SHARED_DRIVE_FOLDER_URL } from "@/lib/drive-folder";

/** DocBox — drop documents here during a meeting. Each file is stored, then AI decides
 * which playbook step (Round 1-5 for Due Diligence) it belongs to, so a Round 4 document
 * dropped while Round 1 is open still files itself correctly and feeds the analysis. */
export function DocBox({
  interviewId, playbookId, companyId, companyName, steps,
}: {
  interviewId: string;
  playbookId: string | null;
  companyId: string | null;
  companyName: string;
  steps: { key: number; title: string }[];
}) {
  const qc = useQueryClient();
  const fileDoc = useServerFn(fileWorkspaceDocument);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);

  const docs = useQuery({ queryKey: ["docbox", interviewId], queryFn: () => listWorkspaceDocuments(interviewId) });

  const removeDoc = useMutation({
    mutationFn: (id: string) => deleteWorkspaceDocument(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["docbox", interviewId] }),
    onError: (e: any) => toast.error(e.message ?? "Failed to remove document"),
  });

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    for (const file of Array.from(files)) {
      try {
        const storagePath = await uploadDocBoxFile(interviewId, file);
        const snippet = await readTextSnippet(file);
        const res: any = await fileDoc({
          data: {
            interviewId,
            playbookId,
            companyId,
            companyName,
            fileName: file.name,
            mimeType: file.type || "application/octet-stream",
            sizeBytes: file.size,
            storagePath,
            textSnippet: snippet,
            steps,
          },
        });
        const stepTitle = res?.document?.step_title ?? "the playbook";
        toast.success(`${file.name} filed under ${stepTitle}${res?.driveSynced ? " · synced to Drive" : ""}`);
      } catch (e: any) {
        toast.error(`${file.name}: ${e.message ?? "upload failed"}`);
      }
    }
    setBusy(false);
    qc.invalidateQueries({ queryKey: ["docbox", interviewId] });
  }

  async function openDoc(d: any) {
    if (d.drive_web_link) { window.open(d.drive_web_link, "_blank", "noreferrer"); return; }
    if (!d.storage_path) return;
    try {
      window.open(await getDocBoxSignedUrl(d.storage_path), "_blank", "noreferrer");
    } catch (e: any) {
      toast.error(e.message ?? "Couldn't open document");
    }
  }

  const grouped = steps.map((s) => ({
    ...s,
    items: (docs.data ?? []).filter((d) => d.step_key === s.key),
  }));
  const unfiled = (docs.data ?? []).filter((d) => !steps.some((s) => s.key === d.step_key));

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">DocBox</div>
          <a
            href={SHARED_DRIVE_FOLDER_URL}
            target="_blank"
            rel="noreferrer"
            className="text-[10px] inline-flex items-center gap-1 text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" /> Drive
          </a>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); void handleFiles(e.dataTransfer.files); }}
          onClick={() => inputRef.current?.click()}
          className={`rounded-md border border-dashed px-3 py-4 text-center cursor-pointer transition-colors ${
            dragOver ? "border-forest bg-forest/5" : "border-border hover:bg-muted/50"
          }`}
        >
          <UploadCloud className="h-5 w-5 mx-auto text-muted-foreground" />
          <div className="text-xs mt-1">{busy ? "Filing documents…" : "Drop documents here or click to upload"}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            AI files each document under the right step and syncs it to this company's Drive folder.
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => { void handleFiles(e.target.files); e.currentTarget.value = ""; }}
          />
        </div>

        <div className="mt-3">
          {docs.isLoading && <div className="text-xs text-muted-foreground italic">Loading documents…</div>}
          {!docs.isLoading && (
            <div className="overflow-x-auto -mx-1 px-1">
              <div className="flex gap-3 min-w-full">
                {[...grouped, ...(unfiled.length ? [{ key: -1, title: "Unfiled", items: unfiled }] : [])].map((g) => (
                  <div key={g.key} className="flex-1 min-w-[150px] border-l border-border/60 pl-2 first:border-l-0 first:pl-0">
                    <div className="text-[10px] uppercase tracking-[0.15em] text-forest font-semibold mb-1 leading-tight">
                      {g.title} <span className="normal-case tracking-normal text-muted-foreground">({g.items.length})</span>
                    </div>
                    {g.items.length === 0 ? (
                      <div className="text-[10px] text-muted-foreground italic">Outstanding</div>
                    ) : (
                      <ul className="space-y-1">
                        {g.items.map((d: any) => (
                          <li key={d.id} className="flex items-start gap-1 text-xs">
                            <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                            <button onClick={() => void openDoc(d)} className="truncate text-left hover:underline text-primary flex-1">
                              {d.file_name}
                            </button>
                            {d.drive_file_id && <Badge variant="outline" className="text-[9px]">Drive</Badge>}
                            <Button
                              size="icon" variant="ghost"
                              className="h-5 w-5 text-destructive hover:text-destructive shrink-0"
                              title="Remove"
                              onClick={() => removeDoc.mutate(d.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
