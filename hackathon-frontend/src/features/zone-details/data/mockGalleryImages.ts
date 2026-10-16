import type { ImagenGaleria } from "../components/GaleriaImagen";

/**
 * ⚠️ IMÁGENES FICTICIAS SOLO PARA DESARROLLO.
 * Son SVG incrustados (sin conexión a red) que no representan fotografías
 * reales de zonas inundadas ni evidencia verificada. Sirven únicamente para
 * comprobar la visualización de la galería. Deben sustituirse por las
 * fotografías del backend antes de cualquier demo.
 */
export const MOCK_GALLERY_IMAGES: ImagenGaleria[] = [
  {
    id: "sim-1",
    alt: "Imagen simulada 1",
    src: "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='600'%20height='400'%3E%3Crect%20width='600'%20height='400'%20fill='%230ea5e9'/%3E%3Ctext%20x='300'%20y='200'%20fill='white'%20font-family='sans-serif'%20font-size='32'%20text-anchor='middle'%20dominant-baseline='middle'%3EImagen%20simulada%201%3C/text%3E%3C/svg%3E",
  },
  {
    id: "sim-2",
    alt: "Imagen simulada 2",
    src: "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='600'%20height='400'%3E%3Crect%20width='600'%20height='400'%20fill='%23f97316'/%3E%3Ctext%20x='300'%20y='200'%20fill='white'%20font-family='sans-serif'%20font-size='32'%20text-anchor='middle'%20dominant-baseline='middle'%3EImagen%20simulada%202%3C/text%3E%3C/svg%3E",
  },
  {
    id: "sim-3",
    alt: "Imagen simulada 3",
    src: "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='600'%20height='400'%3E%3Crect%20width='600'%20height='400'%20fill='%2364748b'/%3E%3Ctext%20x='300'%20y='200'%20fill='white'%20font-family='sans-serif'%20font-size='32'%20text-anchor='middle'%20dominant-baseline='middle'%3EImagen%20simulada%203%3C/text%3E%3C/svg%3E",
  },
];
