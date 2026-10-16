import { useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { Camera, Image as ImageIcon, X } from "lucide-react";

interface PhotoUploaderProps {
  photo: File | null;
  previewUrl: string | null;
  onPhotoSelected: (file: File, previewUrl: string) => void;
  onPhotoRemoved: () => void;
  disabled?: boolean;
}

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png"];

export default function PhotoUploader({
  photo,
  previewUrl,
  onPhotoSelected,
  onPhotoRemoved,
  disabled = false,
}: PhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = (file: File) => {
    setError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Solo se admiten formatos JPG o PNG.");
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      setError("La fotografía excede el límite máximo de 10 MB.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    onPhotoSelected(file, objectUrl);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // Limpiar input para permitir reseleccionar el mismo archivo
    e.target.value = "";
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setError(null);
    onPhotoRemoved();
  };

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled}
      />

      {previewUrl ? (
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 shadow-inner">
          <img
            src={previewUrl}
            alt="Fotografía del incidente"
            className="h-44 w-full object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 text-white">
            <div className="flex items-center gap-1.5 truncate text-xs">
              <ImageIcon className="h-4 w-4 shrink-0 text-sky-400" />
              <span className="truncate">{photo?.name || "Fotografía"}</span>
            </div>
            <button
              type="button"
              onClick={handleRemove}
              disabled={disabled}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur transition hover:bg-white/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
              aria-label="Quitar fotografía"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          onClick={() => !disabled && inputRef.current?.click()}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && !disabled) {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          aria-label="Agregar fotografía JPG o PNG, máximo 10 MB"
          className={[
            "group flex h-36 w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 transition-all select-none",
            isDragging
              ? "border-sky-500 bg-sky-50/80 scale-[1.01]"
              : "border-sky-400/80 hover:border-sky-500 bg-sky-50/20 hover:bg-sky-50/40",
            disabled ? "opacity-50 cursor-not-allowed" : "",
          ].join(" ")}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 text-sky-600 transition group-hover:scale-105">
            <Camera className="h-6 w-6" />
          </div>
          <span className="mt-2.5 text-sm font-semibold text-slate-800">
            Agregar fotografía
          </span>
          <span className="mt-0.5 text-[11px] text-slate-400">
            JPG o PNG · Máximo 10 MB
          </span>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-1.5 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
