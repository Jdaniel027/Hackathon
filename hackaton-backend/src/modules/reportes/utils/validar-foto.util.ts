export const MAX_FOTO_BYTES = 10 * 1024 * 1024;

export function mimeRealFoto(buffer: Buffer): string | null {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  )
    return 'image/jpeg';
  if (
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return 'image/png';
  if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  )
    return 'image/webp';
  if (buffer.toString('ascii', 4, 8) === 'ftyp') {
    const marca = buffer.toString('ascii', 8, 12);
    if (['heic', 'heix', 'hevc'].includes(marca)) return 'image/heic';
    if (['heif', 'mif1', 'msf1'].includes(marca)) return 'image/heif';
  }
  return null;
}
