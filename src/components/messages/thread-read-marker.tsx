"use client";

import { useEffect } from "react";
import { markThreadRead } from "@/app/actions/messages";

export function ThreadReadMarker({ threadId }: { threadId: string }) {
  useEffect(() => {
    void markThreadRead(threadId);
  }, [threadId]);

  return null;
}
