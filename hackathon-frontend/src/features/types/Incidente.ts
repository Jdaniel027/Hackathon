export interface Incidente {
    id: number;
    nombre: string;
    referencia: string;
    nivel: "Alto" | "Medio" | "Bajo";
    color: string;
}