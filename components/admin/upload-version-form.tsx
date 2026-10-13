"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** "Elastio_Security_Workshop_10-26.html" → "Elastio Security Workshop 10-26" */
function labelFromFilename(name: string): string {
  return name.replace(/\.html?$/i, "").replace(/[_]+/g, " ").trim();
}

async function uploadFile(file: File, storage: "blob" | "local", onProgress: (pct: number) => void): Promise<string> {
  if (storage === "blob") {
    // Straight from the browser to Blob: the file is bigger than a function request body allows.
    const { upload } = await import("@vercel/blob/client");
    const blob = await upload(`deck-versions/${crypto.randomUUID()}.html`, file, {
      access: "private",
      contentType: "text/html",
      handleUploadUrl: "/api/admin/versions/blob-upload",
      onUploadProgress: ({ percentage }) => onProgress(percentage),
    });
    return blob.pathname;
  }

  const res = await fetch("/api/admin/versions/local-upload", {
    method: "POST",
    headers: { "Content-Type": "text/html" },
    body: file,
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error ?? "Upload failed");
  onProgress(100);
  return body.storageKey;
}

export function UploadVersionForm({ storage }: { storage: "blob" | "local" }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [publish, setPublish] = useState(true);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submitting = progress !== null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setError(null);
    setProgress(0);

    try {
      const storageKey = await uploadFile(file, storage, setProgress);
      const res = await fetch("/api/admin/versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storageKey, filename: file.name, label, notes, publish }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Failed to save version");
      router.push(`/admin/versions/${body.version.id}`);
    } catch (err) {
      setError((err as Error).message || "Upload failed");
      setProgress(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Upload a new version</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="deck-file">Deck HTML file</Label>
            <Input
              id="deck-file"
              type="file"
              accept=".html,.htm,text/html"
              disabled={submitting}
              onChange={(e) => {
                const picked = e.target.files?.[0] ?? null;
                setFile(picked);
                if (picked && !label) setLabel(labelFromFilename(picked.name));
              }}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="version-label">Version name</Label>
              <Input
                id="version-label"
                placeholder="e.g. Security Workshop, Oct 26"
                value={label}
                disabled={submitting}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="version-notes">What changed (optional)</Label>
              <Input
                id="version-notes"
                placeholder="e.g. New payback slide"
                value={notes}
                disabled={submitting}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={publish}
              disabled={submitting}
              onChange={(e) => setPublish(e.target.checked)}
            />
            Make it live for reps right away
          </label>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={!file || !label.trim() || submitting}>
              {submitting ? (progress < 100 ? `Uploading… ${Math.round(progress)}%` : "Saving…") : "Upload"}
            </Button>
            {storage === "local" && (
              <span className="text-xs text-muted-foreground">Local dev: stored in .data/</span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
