import { describe, expect, it } from 'vitest';

import { clamp, formatSpeed, normalizeOpacity, normalizeSpeed, normalizeStep } from '../../src/utils/number';

describe('number utils', () => {
  it('clamp clamps within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(99, 0, 10)).toBe(10);
  });

  it('normalizeSpeed rounds and clamps', () => {
    expect(normalizeSpeed(1.234)).toBe(1.23);
    expect(normalizeSpeed('1.239')).toBe(1.24);
    expect(normalizeSpeed(0)).toBe(0.1);
    expect(normalizeSpeed(20)).toBe(16);
    expect(normalizeSpeed(Number.NaN, 2.5)).toBe(2.5);
  });

  it('formatSpeed drops trailing zeros', () => {
    expect(formatSpeed(1)).toBe('1');
    expect(formatSpeed(1.3)).toBe('1.3');
    expect(formatSpeed(2.5)).toBe('2.5');
    expect(formatSpeed(2.333)).toBe('2.33');
  });

  it('normalizeStep clamps to allowed range', () => {
    expect(normalizeStep(0)).toBe(0.05);
    expect(normalizeStep(10)).toBe(5);
    expect(normalizeStep('0.055')).toBe(0.06);
    expect(normalizeStep('nope', 0.1)).toBe(0.1);
  });

  it('normalizeOpacity clamps to allowed range', () => {
    expect(normalizeOpacity(0)).toBe(0.1);
    expect(normalizeOpacity(2)).toBe(1);
    expect(normalizeOpacity('0.55')).toBe(0.55);
    expect(normalizeOpacity('nope', 0.5)).toBe(0.5);
  });
});

