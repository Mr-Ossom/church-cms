"use client";

import { useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/avatar";

export function PhotoUpload({ defaultValue }: { defaultValue?: string | null }) {
  const [url, setUrl] = useState(defaultValue ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    if (file.size > 4 * 1024 * 1024) {
      setError("Photos must be smaller than 4 MB.");
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("member-photos")
        .upload(path, file, { cacheControl: "3600", upsert: false });

      if (uploadError) {
        setError(uploadError.message);
        return;
      }

      const { data } = supabase.storage.from("member-photos").getPublicUrl(path);
      setUrl(data.publicUrl);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Could not upload photo.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <input type="hidden" name="photo_url" value={url} />
      <div className="flex items-center gap-4">
        <Avatar src={url || null} firstName="+" lastName="" size="lg" className="ring-slate-100" />
        <div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50">
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
            {uploading ? "Uploading..." : url ? "Change photo" : "Upload photo"}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={uploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
          </label>
          {url ? (
            <button
              type="button"
              onClick={() => setUrl("")}
              className="ml-2 text-xs font-medium text-slate-500 hover:text-rose-600"
            >
              Remove
            </button>
          ) : null}
          <p className="mt-1 text-xs text-slate-500">JPG or PNG, up to 4 MB.</p>
          {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
