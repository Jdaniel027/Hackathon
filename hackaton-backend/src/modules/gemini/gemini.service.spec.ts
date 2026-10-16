import { beforeEach, describe, expect, it, vi } from 'vitest';

const { generateContent, constructores } = vi.hoisted(() => ({
  generateContent: vi.fn(),
  constructores: [] as unknown[],
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    constructor(opciones: unknown) {
      constructores.push(opciones);
    }

    models = { generateContent };
  },
}));

// Se importa después del mock para que use el cliente simulado.
const { GeminiService, MIME_PERMITIDOS } = await import('./gemini.service.js');

const CLAVE = 'clave-de-prueba';

function conRespuesta(texto: string): void {
  generateContent.mockResolvedValueOnce({ text: texto });
}

describe('GeminiService', () => {
  let servicio: InstanceType<typeof GeminiService>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = CLAVE;
    servicio = new GeminiService();
  });

  it('pide JSON estructurado con la instrucción del clasificador', async () => {
    conRespuesta(JSON.stringify({ clasificacion: 'NORMAL' }));

    await expect(servicio.clasificarFoto(Buffer.from('foto'), 'image/jpeg')).resolves.toBe(
      'NORMAL',
    );

    expect(constructores.at(-1)).toEqual({ apiKey: CLAVE });
    expect(generateContent).toHaveBeenCalledTimes(1);

    const llamada = generateContent.mock.calls[0][0] as {
      model: string;
      config: { systemInstruction: string; responseMimeType: string; responseSchema: { properties: { clasificacion: { enum: string[] } } } };
    };
    expect(llamada.model).toBe('gemini-1.5-flash');
    expect(llamada.config.responseMimeType).toBe('application/json');
    expect(llamada.config.responseSchema.properties.clasificacion.enum).toEqual([
      'INUNDADO',
      'PRECAUCION',
      'NORMAL',
    ]);
    expect(llamada.config.systemInstruction).toContain('INUNDADO');
    expect(llamada.config.systemInstruction).toContain('PRECAUCION');
    expect(llamada.config.systemInstruction).toContain('NORMAL');
  });

  it.each(['INUNDADO', 'PRECAUCION', 'NORMAL'] as const)(
    'devuelve la clasificación válida %s',
    async (clasificacion) => {
      conRespuesta(JSON.stringify({ clasificacion }));
      await expect(
        servicio.clasificarFoto(Buffer.from('foto'), 'image/jpeg'),
      ).resolves.toBe(clasificacion);
    },
  );

  it('envía la imagen en base64 con su tipo MIME', async () => {
    conRespuesta(JSON.stringify({ clasificacion: 'NORMAL' }));

    await servicio.clasificarFoto(Buffer.from('hola'), 'image/png');

    const llamada = generateContent.mock.calls[0][0] as {
      contents: Array<{ parts: Array<{ inlineData: { mimeType: string; data: string } }> }>;
    };
    const parte = llamada.contents[0].parts[0];
    expect(parte.inlineData.mimeType).toBe('image/png');
    expect(parte.inlineData.data).toBe(Buffer.from('hola').toString('base64'));
  });

  it.each(['{}', '', '{"otra":"si"}'])(
    'rechaza con 503 cuando la respuesta "%s" no trae una clasificación válida',
    async (texto) => {
      conRespuesta(texto);
      await expect(
        servicio.clasificarFoto(Buffer.from('foto'), 'image/jpeg'),
      ).rejects.toMatchObject({
        status: 503,
        response: { code: 'GEMINI_NO_DISPONIBLE' },
      });
    },
  );

  it('rechaza con 503 una clasificación fuera del esquema', async () => {
    conRespuesta(JSON.stringify({ clasificacion: 'SECO' }));
    await expect(
      servicio.clasificarFoto(Buffer.from('foto'), 'image/jpeg'),
    ).rejects.toMatchObject({
      status: 503,
      response: { code: 'GEMINI_NO_DISPONIBLE' },
    });
  });

  it('rechaza con 503 cuando el modelo devuelve JSON malformado', async () => {
    conRespuesta('{ no es json');
    await expect(
      servicio.clasificarFoto(Buffer.from('foto'), 'image/jpeg'),
    ).rejects.toMatchObject({
      status: 503,
      response: { code: 'GEMINI_NO_DISPONIBLE' },
    });
  });

  it('rechaza con 503 si el proveedor falla (timeout, red, cuota)', async () => {
    generateContent.mockRejectedValueOnce(new Error('boom'));
    await expect(
      servicio.clasificarFoto(Buffer.from('foto'), 'image/jpeg'),
    ).rejects.toMatchObject({
      status: 503,
      response: { code: 'GEMINI_NO_DISPONIBLE' },
    });
  });

  it('rechaza con 415 un MIME no permitido sin llamar al proveedor', async () => {
    await expect(
      servicio.clasificarFoto(Buffer.from('pdf'), 'application/pdf'),
    ).rejects.toMatchObject({
      status: 415,
      response: { code: 'REPORT_ARCHIVO_INVALIDO' },
    });
    expect(generateContent).not.toHaveBeenCalled();
  });

  it('acepta los MIME declarados en la política del proyecto', () => {
    expect(MIME_PERMITIDOS).toEqual([
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif',
    ]);
  });
});

describe('GeminiService sin clave configurada', () => {
  it('falla al construirse en lugar de degradar en silencio', () => {
    delete process.env.GEMINI_API_KEY;
    expect(() => new GeminiService()).toThrow(/GEMINI_API_KEY/);
  });
});
