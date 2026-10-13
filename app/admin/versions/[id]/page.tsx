import { notFound } from "next/navigation";
import { getVersion } from "@/lib/deck-versions";
import { getVersionMetrics } from "@/lib/metrics";
import { formatBytes, formatSeconds } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { VersionBadge } from "@/components/admin/version-badge";
import { DeleteVersionButton, PublishVersionButton } from "@/components/admin/version-actions";

export default async function VersionDetailPage({ params }: PageProps<"/admin/versions/[id]">) {
  const { id } = await params;
  const version = await getVersion(id);
  if (!version) notFound();

  const metrics = await getVersionMetrics(version.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{version.label}</h1>
            <VersionBadge version={version} />
          </div>
          {version.notes && <p className="text-sm text-muted-foreground">{version.notes}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={`/admin/versions/${version.id}/view`} target="_blank" rel="noopener">
              Preview
            </a>
          </Button>
          {!version.is_live && (
            <>
              <PublishVersionButton versionId={version.id} wasLive={Boolean(version.published_at)} />
              <DeleteVersionButton versionId={version.id} />
            </>
          )}
        </div>
      </div>

      {version.warnings.length > 0 && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex flex-col gap-1 text-sm">
            {version.warnings.map((w) => (
              <p key={w}>{w}</p>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">File</p>
            <p className="truncate">
              {version.filename} · {formatBytes(Number(version.size_bytes))}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Uploaded</p>
            <p>
              {new Date(version.created_at).toLocaleString()} by {version.uploaded_by}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">{version.is_live ? "Live since" : "Last made live"}</p>
            <p>{version.published_at ? new Date(version.published_at).toLocaleString() : "Never"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">SHA-256</p>
            <p className="font-mono text-xs truncate">{version.sha256}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Rep sessions</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{metrics.opens}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Reps</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{metrics.uniqueViewers}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total time</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{formatSeconds(metrics.totalSeconds)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Last opened</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {metrics.lastOpened ? new Date(metrics.lastOpened).toLocaleString() : "—"}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rep sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rep has opened this version yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rep</TableHead>
                  <TableHead>Opened at</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                  <TableHead>Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.sessions.map((s) => (
                  <TableRow key={s.sessionId}>
                    <TableCell>{s.viewerEmail}</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(s.openedAt).toLocaleString()}</TableCell>
                    <TableCell className="text-right">{formatSeconds(s.seconds)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {[s.city, s.region, s.country].filter(Boolean).join(", ") || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Per-slide time</CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.perSlideSeconds.length === 0 ? (
            <p className="text-sm text-muted-foreground">No slide activity yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Slide</TableHead>
                  <TableHead className="text-right">Total time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.perSlideSeconds.map((s) => (
                  <TableRow key={s.slideIndex}>
                    <TableCell>{s.slideIndex + 1}</TableCell>
                    <TableCell className="text-right">{formatSeconds(s.seconds)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
