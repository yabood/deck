import { Badge } from "@/components/ui/badge";
import type { DeckVersion } from "@/lib/types";

export function VersionBadge({ version }: { version: Pick<DeckVersion, "is_live" | "published_at"> }) {
  if (version.is_live) return <Badge>Live</Badge>;
  if (version.published_at) return <Badge variant="secondary">Previously live</Badge>;
  return <Badge variant="outline">Draft</Badge>;
}
