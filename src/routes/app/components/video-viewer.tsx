import { useEffect, useState } from "react";
import { getBlob } from "@/lib/idb-fs";

type Props = { path: string };

export default function VideoViewer({ path }: Props) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string;
    getBlob(path).then((blob) => {
      if (blob) {
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      }
    });
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path]);

  if (!url) return null;

  return (
    <div className="flex h-full items-center justify-center p-4">
      <video
        src={url}
        controls
        className="max-h-full max-w-full rounded"
        data-cy="video-viewer"
      />
    </div>
  );
}
