"use client";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { IconPhoto, IconX } from "@tabler/icons-react";
import Image from "next/image";
import { useRef } from "react";

interface ImageUploadSectionProps {
  image: string | null;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: () => void;
}

export function ImageUploadSection({
  image,
  onImageUpload,
  onRemoveImage,
}: ImageUploadSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2">
      <Label>Bild</Label>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onImageUpload}
        className="hidden"
      />
      {image ? (
        <div className="relative w-32 h-32">
          <Image
            src={image}
            alt="Preview"
            fill
            className="object-cover rounded"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-1 right-1"
            onClick={onRemoveImage}
          >
            <IconX className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
        >
          <IconPhoto className="mr-2 h-4 w-4" />
          Bild hochladen
        </Button>
      )}
    </div>
  );
}
