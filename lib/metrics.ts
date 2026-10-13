import { sql } from "@/lib/db";

export interface SlideDwell {
  slideIndex: number;
  seconds: number;
}

export interface PresentingSession {
  sessionId: string;
  viewerEmail: string;
  openedAt: string;
  seconds: number;
  country: string | null;
  city: string | null;
  region: string | null;
  userAgent: string | null;
}

export interface VersionMetrics {
  opens: number;
  uniqueViewers: number;
  firstOpened: string | null;
  lastOpened: string | null;
  totalSeconds: number;
  perSlideSeconds: SlideDwell[];
  sessions: PresentingSession[];
}

export async function getVersionMetrics(versionId: string): Promise<VersionMetrics> {
  const [summaryRows, slideRows, totalRows, sessionRows] = await Promise.all([
    sql`
      select count(distinct session_id) as opens,
             count(distinct viewer_email) as viewers,
             min(created_at) as first_opened,
             max(created_at) as last_opened
      from deck_view_events
      where version_id = ${versionId} and event_type = 'open'
    `,
    sql`
      select slide_index, sum(seconds) as seconds
      from deck_view_events
      where version_id = ${versionId} and event_type = 'slide_view' and slide_index is not null
      group by slide_index
      order by slide_index
    `,
    sql`
      with session_totals as (
        select session_id, max(seconds) as secs
        from deck_view_events
        where version_id = ${versionId} and event_type in ('heartbeat', 'close')
        group by session_id
      )
      select coalesce(sum(secs), 0) as total_seconds from session_totals
    `,
    sql`
      select o.session_id, o.viewer_email, o.created_at, o.geo_country, o.geo_city, o.geo_region, o.user_agent,
             coalesce(d.secs, 0) as seconds
      from deck_view_events o
      left join (
        select session_id, max(seconds) as secs
        from deck_view_events
        where version_id = ${versionId} and event_type in ('heartbeat', 'close')
        group by session_id
      ) d on d.session_id = o.session_id
      where o.version_id = ${versionId} and o.event_type = 'open'
      order by o.created_at desc
      limit 200
    `,
  ]);

  const summary = summaryRows[0] as {
    opens: string;
    viewers: string;
    first_opened: string | null;
    last_opened: string | null;
  };

  return {
    opens: Number(summary?.opens ?? 0),
    uniqueViewers: Number(summary?.viewers ?? 0),
    firstOpened: summary?.first_opened ?? null,
    lastOpened: summary?.last_opened ?? null,
    totalSeconds: Number((totalRows[0] as { total_seconds: string })?.total_seconds ?? 0),
    perSlideSeconds: (slideRows as unknown as { slide_index: number; seconds: string }[]).map((r) => ({
      slideIndex: r.slide_index,
      seconds: Number(r.seconds),
    })),
    sessions: (
      sessionRows as unknown as {
        session_id: string;
        viewer_email: string;
        created_at: string;
        seconds: string;
        geo_country: string | null;
        geo_city: string | null;
        geo_region: string | null;
        user_agent: string | null;
      }[]
    ).map((r) => ({
      sessionId: r.session_id,
      viewerEmail: r.viewer_email,
      openedAt: r.created_at,
      seconds: Number(r.seconds),
      country: r.geo_country,
      city: r.geo_city,
      region: r.geo_region,
      userAgent: r.user_agent,
    })),
  };
}

export async function getOpensCountForVersions(versionIds: string[]): Promise<Record<string, number>> {
  if (versionIds.length === 0) return {};
  const rows = await sql`
    select version_id, count(distinct session_id) as opens
    from deck_view_events
    where event_type = 'open' and version_id in ${sql(versionIds)}
    group by version_id
  `;
  const result: Record<string, number> = {};
  for (const r of rows as unknown as { version_id: string; opens: string }[]) {
    result[r.version_id] = Number(r.opens);
  }
  return result;
}
