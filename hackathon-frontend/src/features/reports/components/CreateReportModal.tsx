import { useState } from "react";
import { Check, MapPin, X } from "lucide-react";
import type { Coordinates, CreateReportInput } from "../types/citizenReport";
import { submitCitizenReport } from "../services/reportService";
import PhotoUploader from "./PhotoUploader";
import SafetyNotice from "./SafetyNotice";

interface CreateReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestSelectLocation: () => void;
  location: Coordinates | null;
  locationLabel?: string;
  draft: {
    photo: File | null;
    photoPreviewUrl: string | null;
    description: string;
  };
  onDraftChange: (draft: {
    photo: File | null;
    photoPreviewUrl: string | null;
    description: string;
  }) => void;
  onSuccessReset: () => void;
}

export default function CreateReportModal({
  isOpen,
  onClose,
  onRequestSelectLocation,
  location,
  locationLabel,
  draft,
  onDraftChange,
  onSuccessReset,
}: CreateReportModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePhotoSelected = (file: File, previewUrl: string) => {
    onDraftChange({ ...draft, photo: file, photoPreviewUrl: previewUrl });
  };

  const handlePhotoRemoved = () => {
    if (draft.photoPreviewUrl) {
      URL.revokeObjectURL(draft.photoPreviewUrl);
    }
    onDraftChange({ ...draft, photo: null, photoPreviewUrl: null });
  };

  const handleDescriptionChange = (value: string) => {
    onDraftChange({ ...draft, description: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location) {
      setErrorMessage("Por favor selecciona la ubicación del incidente.");
      return;
    }
    if (!draft.photo) {
      setErrorMessage("Por favor adjunta una fotografía del incidente.");
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const input: CreateReportInput = {
        location,
        locationName: locationLabel,
        photo: draft.photo,
        description: draft.description.trim() || undefined,
      };

      await submitCitizenReport(input);
      setIsSuccess(true);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al enviar el reporte.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVolverAlMapa = () => {
    setIsSuccess(false);
    onSuccessReset();
    onClose();
  };

  const isFormValid = !!location && !!draft.photo;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-[2px] transition-all"
    >
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white p-5 shadow-2xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150">
        {/* Cabecera del modal */}
        <div className="flex items-start justify-between pb-3">
          <div>
            <h2
              id="report-modal-title"
              className="text-base font-bold text-slate-900 leading-tight"
            >
              Reportar inundación
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Comparte información sobre una zona afectada
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            aria-label="Cerrar modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Contenido: Pantalla 2 (Éxito) o Pantalla 1 (Formulario) */}
        {isSuccess ? (
          <div className="flex flex-col items-center py-4 text-center">
            <div className="my-3 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-sm">
              <Check className="h-8 w-8 stroke-[2.5]" aria-hidden="true" />
            </div>

            <h3 className="mt-2 text-base font-bold text-slate-900">
              ¡Reporte recibido!
            </h3>

            <p className="mt-2 text-xs leading-relaxed text-slate-500 px-2">
              Tu reporte se registró correctamente y permanecerá pendiente de
              verificación. Gracias por contribuir a la seguridad de tu comunidad.
            </p>

            <button
              type="button"
              onClick={handleVolverAlMapa}
              className="mt-6 w-full rounded-2xl bg-sky-100 py-3 text-sm font-semibold text-sky-700 transition hover:bg-sky-200 active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500"
            >
              Volver al mapa
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 pt-1">
            {/* Ubicación del incidente */}
            <div>
              <label
                htmlFor="location-selector-btn"
                className="mb-1 block text-xs font-semibold text-slate-700"
              >
                Ubicación del incidente
              </label>
              <button
                id="location-selector-btn"
                type="button"
                onClick={onRequestSelectLocation}
                className="flex min-h-11 w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-left text-xs transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500"
              >
                <MapPin className="h-4 w-4 shrink-0 text-slate-500" />
                <span className="truncate flex-1 font-medium text-slate-700">
                  {location
                    ? locationLabel ||
                      `Ubicación: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                    : "Seleccionar en el mapa"}
                </span>
                {location && (
                  <span className="shrink-0 text-[11px] font-semibold text-sky-600">
                    Cambiar
                  </span>
                )}
              </button>
            </div>

            {/* Fotografía */}
            <div>
              <PhotoUploader
                photo={draft.photo}
                previewUrl={draft.photoPreviewUrl}
                onPhotoSelected={handlePhotoSelected}
                onPhotoRemoved={handlePhotoRemoved}
                disabled={isSubmitting}
              />
            </div>

            {/* Descripción */}
            <div>
              <label
                htmlFor="report-description"
                className="mb-1 block text-xs font-semibold text-slate-700"
              >
                Descripción
              </label>
              <textarea
                id="report-description"
                rows={2}
                value={draft.description}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                placeholder="Describe brevemente la situación..."
                disabled={isSubmitting}
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs text-slate-800 placeholder-slate-400 transition focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:opacity-50"
              />
            </div>

            {/* Banner de seguridad */}
            <SafetyNotice />

            {/* Mensaje de error general si aplica */}
            {errorMessage && (
              <p role="alert" className="text-xs text-red-600 font-medium">
                {errorMessage}
              </p>
            )}

            {/* Botón Enviar */}
            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-100 hover:bg-sky-200 text-sky-700 disabled:bg-slate-100 disabled:text-slate-400 py-3 text-sm font-semibold transition active:scale-[0.99] disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500"
            >
              {isSubmitting ? (
                <>
                  <span
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
                  />
                  <span>Enviando reporte…</span>
                </>
              ) : (
                "Enviar reporte"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
