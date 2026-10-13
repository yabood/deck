"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function PublishVersionButton({ versionId, wasLive }: { versionId: string; wasLive: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handlePublish() {
    setPending(true);
    await fetch(`/api/admin/versions/${versionId}/publish`, { method: "POST" });
    router.refresh();
    setPending(false);
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" disabled={pending}>
          {wasLive ? "Roll back to this version" : "Make live"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Make this the live deck?</AlertDialogTitle>
          <AlertDialogDescription>
            Every rep who opens the deck from now on gets this version. Reps with the deck already open keep the old
            one until they reload.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handlePublish}>Make live</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function DeleteVersionButton({ versionId }: { versionId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    setPending(true);
    const res = await fetch(`/api/admin/versions/${versionId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/admin");
    } else {
      router.refresh();
      setPending(false);
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" disabled={pending}>
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this version?</AlertDialogTitle>
          <AlertDialogDescription>
            The file and its rep-session history are removed. This can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
