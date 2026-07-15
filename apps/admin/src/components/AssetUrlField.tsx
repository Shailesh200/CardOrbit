import { ChangeEvent, useRef, useState } from 'react';
import { Button, Input, toast } from '@cardwise/ui';

import { uploadAssetFile } from '../lib/api';

type Props = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  entityType: 'banks' | 'merchants' | 'credit-cards';
  slugHint?: string;
  placeholder?: string;
};

export function AssetUrlField({
  label = 'Asset URL',
  value,
  onChange,
  entityType,
  slugHint,
  placeholder = 'Paste CDN URL or upload an image',
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function onFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploading(true);
    try {
      const result = await uploadAssetFile(file, entityType, slugHint);
      onChange(result.url);
      toast.success('Image uploaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {label ? <span className="text-xs font-medium text-muted-foreground">{label}</span> : null}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="font-mono text-xs"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
          className="hidden"
          onChange={(event) => void onFileSelected(event)}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? 'Uploading…' : 'Upload'}
        </Button>
      </div>
      {value ? (
        <img
          src={value}
          alt=""
          className="size-12 rounded-md border bg-white object-contain p-1"
          onError={(event) => {
            event.currentTarget.style.display = 'none';
          }}
        />
      ) : null}
    </div>
  );
}
