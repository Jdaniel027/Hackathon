import { useState } from "react";
import MapView from "../features/map/components/MapView";
import CreateReportModal from "../features/reports/components/CreateReportModal";
import type { Coordinates } from "../features/reports/types/citizenReport";

export default function App() {
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isLocationPickerMode, setIsLocationPickerMode] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Coordinates | null>(null);

  // Borrador del reporte: se preserva al entrar y salir del selector de ubicación
  const [reportDraft, setReportDraft] = useState<{
    photo: File | null;
    photoPreviewUrl: string | null;
    description: string;
  }>({
    photo: null,
    photoPreviewUrl: null,
    description: "",
  });

  const handleOpenReportModal = () => {
    setIsReportModalOpen(true);
  };

  const handleCloseReportModal = () => {
    setIsReportModalOpen(false);
  };

  const handleRequestSelectLocation = () => {
    // Cierra momentáneamente el modal para dejar ver el mapa en modo selección
    setIsReportModalOpen(false);
    setIsLocationPickerMode(true);
  };

  const handleConfirmLocation = (coords: Coordinates) => {
    setSelectedLocation(coords);
    setIsLocationPickerMode(false);
    // Vuelve al formulario conservando foto y descripción
    setIsReportModalOpen(true);
  };

  const handleCancelLocationPicker = () => {
    setIsLocationPickerMode(false);
    setIsReportModalOpen(true);
  };

  const handleSuccessReset = () => {
    setSelectedLocation(null);
    setReportDraft({
      photo: null,
      photoPreviewUrl: null,
      description: "",
    });
  };

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-slate-900 select-none">
      <MapView
        isLocationPickerMode={isLocationPickerMode}
        onConfirmLocation={handleConfirmLocation}
        onCancelLocationPicker={handleCancelLocationPicker}
        onOpenReportModal={handleOpenReportModal}
        onMenuClick={() => {
          console.log("Menú principal pulsado");
        }}
      />

      <CreateReportModal
        isOpen={isReportModalOpen}
        onClose={handleCloseReportModal}
        onRequestSelectLocation={handleRequestSelectLocation}
        location={selectedLocation}
        draft={reportDraft}
        onDraftChange={setReportDraft}
        onSuccessReset={handleSuccessReset}
      />
    </main>
  );
}
