export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const normalizeSpeed = (value: unknown, fallback: number | null = null) => {
  const numericValue = typeof value === 'number' ? value : parseFloat(String(value));
  if (!Number.isFinite(numericValue)) return fallback;
  return +clamp(numericValue, 0.1, 16).toFixed(2);
};

export const normalizeStep = (value: unknown, fallback: number | null = null) => {
  const numericValue = typeof value === 'number' ? value : parseFloat(String(value));
  if (!Number.isFinite(numericValue)) return fallback;
  return +clamp(numericValue, 0.05, 5).toFixed(2);
};

export const normalizeOpacity = (value: unknown, fallback: number | null = null) => {
  const numericValue = typeof value === 'number' ? value : parseFloat(String(value));
  if (!Number.isFinite(numericValue)) return fallback;
  return +clamp(numericValue, 0.1, 1).toFixed(2);
};

export const formatSpeed = (value: unknown) => {
  const numericValue = typeof value === 'number' ? value : parseFloat(String(value));
  if (!Number.isFinite(numericValue)) return '';
  return String(parseFloat(numericValue.toFixed(2)));
};

