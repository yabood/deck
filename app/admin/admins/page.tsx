import { auth, allowedDomain } from "@/auth";
import { envAdmins, listAdmins } from "@/lib/admins";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AddAdminForm, RemoveAdminButton } from "@/components/admin/admin-controls";

export default async function AdminsPage() {
  const [session, dbAdmins] = await Promise.all([auth(), listAdmins()]);
  const me = session?.user?.email?.toLowerCase();
  const fromEnv = envAdmins();

  const rows = [
    ...fromEnv.map((email) => ({ email, source: "ADMIN_EMAILS", addedBy: null as string | null, removable: false })),
    ...dbAdmins
      .filter((a) => !fromEnv.includes(a.email))
      .map((a) => ({ email: a.email, source: "Added here", addedBy: a.added_by, removable: a.email !== me })),
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Admins</h1>
        <p className="text-sm text-muted-foreground">
          Anyone with an @{allowedDomain} Google account can open the deck. Only admins can sign into this panel.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add an admin</CardTitle>
        </CardHeader>
        <CardContent>
          <AddAdminForm domain={allowedDomain} />
        </CardContent>
      </Card>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Added by</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.email}>
                <TableCell className="font-medium">
                  {row.email}
                  {row.email === me && <span className="text-muted-foreground"> (you)</span>}
                </TableCell>
                <TableCell className="text-muted-foreground">{row.source}</TableCell>
                <TableCell className="text-muted-foreground">{row.addedBy ?? "—"}</TableCell>
                <TableCell className="text-right">{row.removable && <RemoveAdminButton email={row.email} />}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
