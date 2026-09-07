// 10% des utilisateurs voient les nouveautés en premier (canary release)
const CANARY_PERCENTAGE = 10;
const CANARY_BUCKET_KEY = 'omnierp-canary-bucket';

function getCanaryBucket(): number {
  const stored = localStorage.getItem(CANARY_BUCKET_KEY);
  if (stored) return Number(stored);

  const bucket = Math.floor(Math.random() * 100);
  localStorage.setItem(CANARY_BUCKET_KEY, String(bucket));
  return bucket;
}

export function isInCanaryGroup(): boolean {
  return getCanaryBucket() < CANARY_PERCENTAGE;
}