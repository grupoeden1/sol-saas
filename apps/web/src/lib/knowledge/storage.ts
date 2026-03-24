import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

const KB_UPLOAD_DIR = path.join(os.tmpdir(), 'sol-kb-uploads');

/**
 * Save an uploaded file for knowledge base processing.
 * Returns the full path to the saved file.
 */
export async function saveKbFile(
  buffer: Buffer,
  documentId: string,
  filename: string,
): Promise<string> {
  const dir = path.join(KB_UPLOAD_DIR, documentId);
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, filename);
  await fs.writeFile(filePath, buffer);
  return filePath;
}

/**
 * Clean up temporary files for a KB document.
 */
export async function deleteKbFiles(documentId: string): Promise<void> {
  const dir = path.join(KB_UPLOAD_DIR, documentId);
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}
