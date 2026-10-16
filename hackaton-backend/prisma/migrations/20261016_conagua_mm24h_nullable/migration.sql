-- Conagua ofrece pronóstico horario, no acumulado observado de 24 horas.
ALTER TABLE "LecturaClima" ALTER COLUMN "mm24h" DROP NOT NULL;
