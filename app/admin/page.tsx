import Link from "next/link";
import { listVersions } from "@/lib/deck-versions";
import { usesBlobStorage } from "@/lib/deck-storage";
import { getOpensCountForVersions } from "@/lib/metrics";
import { formatBytes } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UploadVersionForm } from "@/components/admin/upload-version-form";
import { VersionBadge } from "@/components/admin/version-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function DeckVersionsPage() {
  const versions = await listVersions();
  const opens = await getOpensCountForVersions(versions.map((v) => v.id));
  const live = versions.find((v) => v.is_live);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Deck versions</h1>
        <p className="text-sm text-muted-foreground">
          Reps always get the live version when they open the deck. Upload a new version to replace it, or make an
          older one live again to roll back.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          {live ? (
            <>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Badge>Live</Badge>
                  <Link href={`/admin/versions/${live.id}`} className="font-medium hover:underline">
                    {live.label}
                  </Link>
                </div>
                <p className="text-sm text-muted-foreground">
                  Live since {live.published_at ? new Date(live.published_at).toLocaleString() : "—"} ·{" "}
                  {opens[live.id] ?? 0} rep {(opens[live.id] ?? 0) === 1 ? "session" : "sessions"}
                </p>
              </div>
              <Button asChild variant="outline" size="sm">
                <a href={`/admin/versions/${live.id}/view`} target="_blank" rel="noopener">
                  Preview
                </a>
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nothing is live yet, so reps opening the deck see a &ldquo;no deck published&rdquo; page. Upload a
              version below.
            </p>
          )}
        </CardContent>
      </Card>

      <UploadVersionForm storage={usesBlobStorage() ? "blob" : "local"} />

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Version</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead>By</TableHead>
              <TableHead className="text-right">Size</TableHead>
              <TableHead className="text-right">Rep sessions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {versions.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                  No versions uploaded yet.
                </TableCell>
              </TableRow>
            )}
            {versions.map((v) => (
              <TableRow key={v.id}>
                <TableCell>
                  <Link href={`/admin/versions/${v.id}`} className="font-medium hover:underline">
                    {v.label}
                  </Link>
                </TableCell>
                <TableCell>
                  <VersionBadge version={v} />
                </TableCell>
                <TableCell className="text-muted-foreground">{new Date(v.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-muted-foreground">{v.uploaded_by}</TableCell>
                <TableCell className="text-right text-muted-foreground">{formatBytes(Number(v.size_bytes))}</TableCell>
                <TableCell className="text-right">{opens[v.id] ?? 0}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
