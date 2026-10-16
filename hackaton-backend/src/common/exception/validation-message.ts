export interface ValidationMessageParts {
  code: string;
  message: string;
}

// Message factory: los DTOs envuelven { code, message } en JSON para que el
// AppValidationPipe pueda extraer el código además del texto en español.
export function validationMessage(code: string, message: string): string {
  return JSON.stringify({ code, message } satisfies ValidationMessageParts);
}

export function parseValidationMessage(
  raw: unknown,
): ValidationMessageParts | null {
  if (typeof raw !== 'string') {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<ValidationMessageParts>;
    if (typeof parsed.code === 'string' && typeof parsed.message === 'string') {
      return { code: parsed.code, message: parsed.message };
    }
    return null;
  } catch {
    return null;
  }
}
