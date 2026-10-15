-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "EstadoZona" AS ENUM ('SIN_DATOS', 'NORMAL', 'PRECAUCION', 'INUNDADO');

-- CreateEnum
CREATE TYPE "MotivoRiesgo" AS ENUM ('ALTURA', 'INUNDACION');

-- CreateEnum
CREATE TYPE "OrigenRiesgo" AS ENUM ('MANUAL', 'CICLON', 'CLIMA');

-- CreateEnum
CREATE TYPE "FuenteClima" AS ENUM ('CONAGUA', 'OPEN_METEO');

-- CreateEnum
CREATE TYPE "TipoReporte" AS ENUM ('CORROBORADO', 'PENDIENTE', 'NO_CORROBORADO');

-- CreateEnum
CREATE TYPE "ClasificacionIA" AS ENUM ('INUNDADO', 'PARCIAL', 'NO_INUNDADO');

-- CreateEnum
CREATE TYPE "FuenteReporte" AS ENUM ('CIUDADANO', 'CICLON');

-- CreateTable
CREATE TABLE "Pais" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,

    CONSTRAINT "Pais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Estado" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "paisId" INTEGER NOT NULL,

    CONSTRAINT "Estado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Municipio" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "idEstadoSmn" INTEGER,
    "idMunSmn" INTEGER,
    "estadoId" INTEGER NOT NULL,

    CONSTRAINT "Municipio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Zona" (
    "id" SERIAL NOT NULL,
    "municipioId" INTEGER NOT NULL,
    "latCentro" DOUBLE PRECISION NOT NULL,
    "lngCentro" DOUBLE PRECISION NOT NULL,
    "ladoM" INTEGER NOT NULL DEFAULT 9000,
    "modelo" VARCHAR(60) NOT NULL DEFAULT 'ecmwf_ifs',
    "latModelo" DOUBLE PRECISION,
    "lngModelo" DOUBLE PRECISION,
    "estado" "EstadoZona" NOT NULL DEFAULT 'SIN_DATOS',
    "mm1h" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mm24h" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Zona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LecturaClima" (
    "id" SERIAL NOT NULL,
    "zonaId" INTEGER NOT NULL,
    "mm1h" DOUBLE PRECISION NOT NULL,
    "mm24h" DOUBLE PRECISION NOT NULL,
    "fuente" "FuenteClima" NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LecturaClima_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZonaRiesgo" (
    "id" SERIAL NOT NULL,
    "municipioId" INTEGER NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "radioM" INTEGER NOT NULL,
    "motivo" "MotivoRiesgo" NOT NULL,
    "origen" "OrigenRiesgo" NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "venceEn" TIMESTAMP(3),

    CONSTRAINT "ZonaRiesgo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reporte" (
    "id" SERIAL NOT NULL,
    "zonaId" INTEGER NOT NULL,
    "fuente" "FuenteReporte" NOT NULL DEFAULT 'CIUDADANO',
    "tipo" "TipoReporte" NOT NULL DEFAULT 'PENDIENTE',
    "clasificacion" "ClasificacionIA",
    "userLat" DOUBLE PRECISION,
    "userLng" DOUBLE PRECISION,
    "fechaFoto" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reporte_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Pais_nombre_key" ON "Pais"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Estado_paisId_nombre_key" ON "Estado"("paisId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Municipio_slug_key" ON "Municipio"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Municipio_estadoId_nombre_key" ON "Municipio"("estadoId", "nombre");

-- CreateIndex
CREATE INDEX "Zona_municipioId_idx" ON "Zona"("municipioId");

-- CreateIndex
CREATE UNIQUE INDEX "Zona_latCentro_lngCentro_modelo_key" ON "Zona"("latCentro", "lngCentro", "modelo");

-- CreateIndex
CREATE INDEX "LecturaClima_zonaId_creadoEn_idx" ON "LecturaClima"("zonaId", "creadoEn");

-- CreateIndex
CREATE INDEX "ZonaRiesgo_municipioId_activa_idx" ON "ZonaRiesgo"("municipioId", "activa");

-- CreateIndex
CREATE INDEX "Reporte_zonaId_creadoEn_idx" ON "Reporte"("zonaId", "creadoEn");

-- AddForeignKey
ALTER TABLE "Estado" ADD CONSTRAINT "Estado_paisId_fkey" FOREIGN KEY ("paisId") REFERENCES "Pais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Municipio" ADD CONSTRAINT "Municipio_estadoId_fkey" FOREIGN KEY ("estadoId") REFERENCES "Estado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Zona" ADD CONSTRAINT "Zona_municipioId_fkey" FOREIGN KEY ("municipioId") REFERENCES "Municipio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LecturaClima" ADD CONSTRAINT "LecturaClima_zonaId_fkey" FOREIGN KEY ("zonaId") REFERENCES "Zona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZonaRiesgo" ADD CONSTRAINT "ZonaRiesgo_municipioId_fkey" FOREIGN KEY ("municipioId") REFERENCES "Municipio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reporte" ADD CONSTRAINT "Reporte_zonaId_fkey" FOREIGN KEY ("zonaId") REFERENCES "Zona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
