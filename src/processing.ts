import { getDocumentProxy, extractText } from 'unpdf'

import { PhotonImage } from '@cf-wasm/photon'

/**
 * Strips EXIF metadata from an image using Photon (Wasm).
 * Photon naturally discards metadata when re-encoding.
 */
export async function stripExif(imageBuffer: ArrayBuffer): Promise<Uint8Array> {
  const inputBytes = new Uint8Array(imageBuffer);
  
  // Create a PhotonImage instance
  const image = PhotonImage.new_from_byteslice(inputBytes);
  
  // Re-encoding to JPEG/PNG (based on what's supported) effectively strips EXIF.
  // We return the bytes as a JPEG for consistency in scrubbing, 
  // or we could detect input type. For a "Scrub" specific API, 
  // ensuring a clean JPEG output is often preferred.
  const strippedBytes = image.get_bytes(); // Default encoding (usually preserves format or strips metadata)
  
  // Clean up WASM memory
  image.free();
  
  return strippedBytes;
}

/**
 * Extracts text from a PDF and returns it as a JSON structure.
 */
export async function extractPdfText(pdfBuffer: ArrayBuffer) {
  const pdf = await getDocumentProxy(new Uint8Array(pdfBuffer))
  const { text } = await extractText(pdf, { mergePages: true })
  
  return {
    pages: pdf.numPages,
    content: text,
    metadata: {
      info: await pdf.getMetadata().then(m => m.info).catch(() => ({})),
    }
  }
}
