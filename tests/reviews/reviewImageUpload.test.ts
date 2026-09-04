import assert from 'node:assert/strict';
import test from 'node:test';
import {
  dedupeReviewFiles,
  fitWithinLongSide,
  mapWithConcurrency,
  optimizeReviewImage,
  reviewImageStoragePath,
  uploadOptimizedReviewImages,
  withBoundedRetry,
} from '../../src/services/reviewImageUpload.ts';

function fakeFile(size: number, name = 'phone.jpg') {
  return new File([new Uint8Array(size)], name, { type: 'image/jpeg' });
}

function fakeOptimizer(optimizedBytes: number, width = 4032, height = 3024) {
  return {
    decode: async () => ({ width, height, draw: () => undefined, close: () => undefined }),
    encode: async () => new Blob([new Uint8Array(optimizedBytes)], { type: 'image/webp' }),
  };
}

test('keeps small dimensions and strips metadata through re-encoding', async () => {
  const result = await optimizeReviewImage(fakeFile(240_000, 'small.jpg'), fakeOptimizer(150_000, 1200, 800));
  assert.deepEqual([result.width, result.height], [1200, 800]);
  assert.equal(result.file.type, 'image/webp');
  assert.equal(result.optimizedBytes, 150_000);
  assert.equal(result.optimizationApplied, true);
});

test('materially reduces a phone-size image and preserves its aspect ratio', async () => {
  const result = await optimizeReviewImage(fakeFile(6_000_000), fakeOptimizer(720_000));
  assert.deepEqual(fitWithinLongSide(4032, 3024), { width: 1600, height: 1200 });
  assert.deepEqual([result.width, result.height], [1600, 1200]);
  assert.equal(result.originalBytes, 6_000_000);
  assert.equal(result.optimizedBytes, 720_000);
  assert.ok(result.optimizedBytes / result.originalBytes < 0.2);
});

test('limits parallel image work to the configured bound', async () => {
  let active = 0;
  let maximum = 0;
  await mapWithConcurrency([1, 2, 3, 4, 5, 6], 2, async (value) => {
    active += 1;
    maximum = Math.max(maximum, active);
    await new Promise((resolve) => setTimeout(resolve, 5));
    active -= 1;
    return value;
  });
  assert.equal(maximum, 2);
});

test('deduplicates the same selected image before Storage upload', () => {
  const duplicate = fakeFile(500_000, 'same.jpg');
  assert.equal(dedupeReviewFiles([duplicate, duplicate]).length, 1);
});

test('keeps the no-image path immediate and upload-free', async () => {
  let uploadCalls = 0;
  const result = await uploadOptimizedReviewImages({
    files: [],
    poiId: 'poi-1',
    userId: 'user-1',
    submissionId: 'no-image',
    upload: async () => {
      uploadCalls += 1;
      return 'unexpected';
    },
  });
  assert.equal(uploadCalls, 0);
  assert.equal(result.uploads.length, 0);
  assert.equal(result.metrics.originalBytes, 0);
  assert.equal(result.metrics.optimizedBytes, 0);
});

test('bounds multiple image uploads rather than starting an unlimited Promise.all', async () => {
  let active = 0;
  let maximum = 0;
  const result = await uploadOptimizedReviewImages({
    files: [1, 2, 3, 4].map((index) => fakeFile(1_000_000, `phone-${index}.jpg`)),
    poiId: 'poi-1',
    userId: 'user-1',
    submissionId: 'multi-image',
    optimizer: fakeOptimizer(200_000),
    concurrency: 2,
    upload: async ({ storagePath, onProgress }) => {
      active += 1;
      maximum = Math.max(maximum, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      onProgress(200_000);
      active -= 1;
      return `https://storage.example/${storagePath}`;
    },
  });
  assert.equal(maximum, 2);
  assert.equal(result.uploads.length, 4);
});

test('retries a transient failure and stops at the bounded attempt count', async () => {
  let attempts = 0;
  const value = await withBoundedRetry(async () => {
    attempts += 1;
    if (attempts === 1) throw new Error('temporary');
    return 'uploaded';
  }, { attempts: 2, timeoutMs: 100 });
  assert.equal(value, 'uploaded');
  assert.equal(attempts, 2);

  attempts = 0;
  await assert.rejects(withBoundedRetry(async () => {
    attempts += 1;
    throw new Error('still down');
  }, { attempts: 2, timeoutMs: 100 }), /still down/);
  assert.equal(attempts, 2);
});

test('times out stalled attempts and retries only within the configured bound', async () => {
  let attempts = 0;
  await assert.rejects(withBoundedRetry((_attempt, signal) => new Promise((_resolve, reject) => {
    attempts += 1;
    signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  }), { attempts: 2, timeoutMs: 10 }), /aborted|timed out/);
  assert.equal(attempts, 2);
});

test('reuses one object path across retries and reports slow upload progress', async () => {
  const paths: string[] = [];
  const phases: string[] = [];
  let attempts = 0;
  const result = await uploadOptimizedReviewImages({
    files: [fakeFile(4_000_000)],
    poiId: 'poi:1',
    userId: 'user:1',
    submissionId: 'submission-1',
    optimizer: fakeOptimizer(600_000),
    attempts: 2,
    timeoutMs: 200,
    onProgress: (progress) => phases.push(`${progress.phase}:${progress.percent}`),
    upload: async ({ storagePath, onProgress }) => {
      attempts += 1;
      paths.push(storagePath);
      onProgress(300_000);
      await new Promise((resolve) => setTimeout(resolve, 10));
      if (attempts === 1) throw new Error('network');
      onProgress(600_000);
      return 'https://storage.example/review.webp';
    },
  });
  assert.equal(attempts, 2);
  assert.equal(new Set(paths).size, 1);
  assert.equal(result.uploads.length, 1);
  assert.equal(result.metrics.originalBytes, 4_000_000);
  assert.equal(result.metrics.optimizedBytes, 600_000);
  assert.ok(phases.includes('uploading:50'));
  assert.ok(phases.includes('uploading:100'));
});

test('keeps private filenames out while preserving validated identity segments', () => {
  const input = { poiId: 'poi:1', userId: 'user:1', submissionId: 'same id', index: 0 };
  assert.equal(reviewImageStoragePath(input), reviewImageStoragePath(input));
  assert.equal(reviewImageStoragePath(input), 'reviews/poi:1/user:1/same_id-0');
  assert.throws(
    () => reviewImageStoragePath({ ...input, userId: 'unsafe/user' }),
    /Invalid review storage identity/,
  );
});
