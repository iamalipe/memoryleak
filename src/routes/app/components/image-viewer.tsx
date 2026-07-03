import { useEffect, useState } from "react";
import { getBlob } from "@/lib/idb-fs";

type Props = { path: string };

export default function ImageViewer({ path }: Props) {
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
    <div className="flex h-full items-center justify-center overflow-auto p-4">
      <img
        src={url}
        alt={path.split("/").pop()}
        className="max-h-full max-w-full rounded object-contain"
        data-cy="image-viewer"
      />
    </div>
  );
}
