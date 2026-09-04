export const REVIEW_IMAGE_MAX_LONG_SIDE = 1600;
export const REVIEW_IMAGE_QUALITY = 0.82;
export const REVIEW_UPLOAD_CONCURRENCY = 2;
export const REVIEW_UPLOAD_ATTEMPTS = 2;
export const REVIEW_UPLOAD_TIMEOUT_MS = 45_000;

export type ReviewUploadPhase = 'uploading' | 'saving';

export interface ReviewUploadProgress {
  phase: ReviewUploadPhase;
  completedFiles: number;
  totalFiles: number;
  uploadedBytes: number;
  totalBytes: number;
  percent: number;
}

export interface ReviewImageMetadata {
  originalBytes: number;
  optimizedBytes: number;
  optimizationApplied: boolean;
  originalWidth: number | null;
  originalHeight: number | null;
  width: number | null;
  height: number | null;
  contentType: string;
  storagePath: string;
}

export interface ReviewImageUploadResult {
  url: string;
  metadata: ReviewImageMetadata;
}

export interface ReviewImageMetrics {
  originalBytes: number;
  optimizedBytes: number;
  optimizationDurationMs: number;
  uploadDurationMs: number;
}

interface DecodedImage {
  width: number;
  height: number;
  draw: (context: CanvasRenderingContext2D, width: number, height: number) => void;
  close: () => void;
}

export interface ReviewImageOptimizerOptions {
  decode?: (file: File) => Promise<DecodedImage>;
  encode?: (decoded: DecodedImage, width: number, height: number) => Promise<Blob>;
  maxLongSide?: number;
}

export interface UploadReviewImagesOptions {
  files: File[];
  poiId: string;
  userId: string;
  submissionId: string;
  onProgress?: (progress: ReviewUploadProgress) => void;
  upload: (input: {
    file: File;
    storagePath: string;
    signal: AbortSignal;
    onProgress: (bytesTransferred: number) => void;
  }) => Promise<string>;
  optimizer?: ReviewImageOptimizerOptions;
  concurrency?: number;
  attempts?: number;
  timeoutMs?: number;
  shouldRetry?: (error: unknown) => boolean;
}

export class ReviewUploadTimeoutError extends Error {
  constructor() {
    super('Review image upload timed out.');
    this.name = 'ReviewUploadTimeoutError';
  }
}

function now() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function safeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'image';
}

function storageIdentitySegment(value: string) {
  const containsUnsafeCharacter = Array.from(value).some((character) => (
    character === '/' || character === '\\' || character.charCodeAt(0) < 32
  ));
  if (!value || containsUnsafeCharacter) {
    throw new Error('Invalid review storage identity.');
  }
  return value;
}

export function createReviewSubmissionId() {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export function reviewImageStoragePath({
  poiId,
  userId,
  submissionId,
  index,
}: {
  poiId: string;
  userId: string;
  submissionId: string;
  index: number;
}) {
  return `reviews/${storageIdentitySegment(poiId)}/${storageIdentitySegment(userId)}/${safeSegment(submissionId)}-${index}`;
}

export function fitWithinLongSide(width: number, height: number, maxLongSide = REVIEW_IMAGE_MAX_LONG_SIDE) {
  const longest = Math.max(width, height);
  if (longest <= maxLongSide) return { width, height };
  const ratio = maxLongSide / longest;
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

export function dedupeReviewFiles(files: File[]) {
  const seen = new Set<string>();
  return files.filter((file) => {
    const key = `${file.name}:${file.size}:${file.type}:${file.lastModified}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
) {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  let firstError: unknown;
  const workerCount = Math.min(Math.max(1, concurrency), items.length);
  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (nextIndex < items.length && !firstError) {
      const index = nextIndex;
      nextIndex += 1;
      try {
        results[index] = await worker(items[index], index);
      } catch (error) {
        firstError ??= error;
      }
    }
  }));
  if (firstError) throw firstError;
  return results;
}

export async function withBoundedRetry<T>(
  operation: (attempt: number, signal: AbortSignal) => Promise<T>,
  options: { attempts?: number; timeoutMs?: number; shouldRetry?: (error: unknown) => boolean } = {},
) {
  const attempts = Math.max(1, options.attempts ?? REVIEW_UPLOAD_ATTEMPTS);
  const timeoutMs = options.timeoutMs ?? REVIEW_UPLOAD_TIMEOUT_MS;
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new ReviewUploadTimeoutError());
        }, timeoutMs);
      });
      return await Promise.race([operation(attempt, controller.signal), timeout]);
    } catch (error) {
      lastError = error;
      if (attempt >= attempts || (options.shouldRetry && !options.shouldRetry(error))) throw error;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
  throw lastError;
}

async function decodeInBrowser(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    return {
      width: bitmap.width,
      height: bitmap.height,
      draw: (context, width, height) => context.drawImage(bitmap, 0, 0, width, height),
      close: () => bitmap.close(),
    };
  }
  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Không thể đọc ảnh đã chọn.'));
      image.src = objectUrl;
    });
    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      draw: (context, width, height) => context.drawImage(image, 0, 0, width, height),
      close: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

async function encodeInBrowser(decoded: DecodedImage, width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Trình duyệt không thể tối ưu ảnh này.');
  decoded.draw(context, width, height);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Không thể nén ảnh đã chọn.'))),
      'image/webp',
      REVIEW_IMAGE_QUALITY,
    );
  });
}

export async function optimizeReviewImage(file: File, options: ReviewImageOptimizerOptions = {}) {
  const decode = options.decode ?? decodeInBrowser;
  const encode = options.encode ?? encodeInBrowser;
  const decoded = await decode(file);
  try {
    const target = fitWithinLongSide(decoded.width, decoded.height, options.maxLongSide);
    const blob = await encode(decoded, target.width, target.height);
    const useOptimized = blob.size <= file.size * 1.1 || target.width !== decoded.width || target.height !== decoded.height;
    const body = useOptimized ? blob : file;
    const extensionlessName = file.name.replace(/\.[^.]+$/, '') || 'review-image';
    const optimizedFile = body === file
      ? file
      : new File([body], `${safeSegment(extensionlessName)}.webp`, { type: blob.type || 'image/webp' });
    return {
      file: optimizedFile,
      originalBytes: file.size,
      optimizedBytes: optimizedFile.size,
      optimizationApplied: optimizedFile !== file,
      originalWidth: decoded.width,
      originalHeight: decoded.height,
      width: target.width,
      height: target.height,
    };
  } finally {
    decoded.close();
  }
}

export async function uploadOptimizedReviewImages(options: UploadReviewImagesOptions) {
  const optimizationStartedAt = now();
  options.onProgress?.({
    phase: 'uploading',
    completedFiles: 0,
    totalFiles: options.files.length,
    uploadedBytes: 0,
    totalBytes: options.files.reduce((sum, file) => sum + file.size, 0),
    percent: 0,
  });
  const prepared = await mapWithConcurrency(
    options.files,
    options.concurrency ?? REVIEW_UPLOAD_CONCURRENCY,
    (file) => optimizeReviewImage(file, options.optimizer),
  );
  const optimizationDurationMs = now() - optimizationStartedAt;
  const totalBytes = prepared.reduce((sum, item) => sum + item.optimizedBytes, 0);
  const transferred = new Array(prepared.length).fill(0) as number[];
  let completedFiles = 0;
  const emitProgress = () => {
    const uploadedBytes = transferred.reduce((sum, value) => sum + value, 0);
    options.onProgress?.({
      phase: 'uploading',
      completedFiles,
      totalFiles: prepared.length,
      uploadedBytes,
      totalBytes,
      percent: totalBytes ? Math.min(100, Math.round((uploadedBytes / totalBytes) * 100)) : 100,
    });
  };
  emitProgress();
  const uploadStartedAt = now();
  const uploads = await mapWithConcurrency(
    prepared,
    options.concurrency ?? REVIEW_UPLOAD_CONCURRENCY,
    async (item, index): Promise<ReviewImageUploadResult> => {
      const storagePath = reviewImageStoragePath({
        poiId: options.poiId,
        userId: options.userId,
        submissionId: options.submissionId,
        index,
      });
      const url = await withBoundedRetry(
        (_attempt, signal) => options.upload({
          file: item.file,
          storagePath,
          signal,
          onProgress: (bytes) => {
            transferred[index] = Math.min(bytes, item.optimizedBytes);
            emitProgress();
          },
        }),
        {
          attempts: options.attempts,
          timeoutMs: options.timeoutMs,
          shouldRetry: options.shouldRetry,
        },
      );
      transferred[index] = item.optimizedBytes;
      completedFiles += 1;
      emitProgress();
      return {
        url,
        metadata: {
          originalBytes: item.originalBytes,
          optimizedBytes: item.optimizedBytes,
          optimizationApplied: item.optimizationApplied,
          originalWidth: item.originalWidth,
          originalHeight: item.originalHeight,
          width: item.width,
          height: item.height,
          contentType: item.file.type,
          storagePath,
        },
      };
    },
  );
  return {
    uploads,
    metrics: {
      originalBytes: prepared.reduce((sum, item) => sum + item.originalBytes, 0),
      optimizedBytes: totalBytes,
      optimizationDurationMs,
      uploadDurationMs: now() - uploadStartedAt,
    } satisfies ReviewImageMetrics,
  };
}
