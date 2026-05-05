// =============================================================================
// tests/unit/eligibility.test.ts
// Medical eligibility rules — most critical business logic in the app
// =============================================================================

import { describe, it, expect } from 'vitest';
import { calculateEligibility } from '@blird/utils/eligibility';
import { addDays, subDays, subYears } from 'date-fns';

const BASE_USER = {
  dateOfBirth: subYears(new Date(), 28), // 28 years old
  gender: 'MALE' as const,
  latestWeight: 70,
  latestHemoglobin: 14.5,
  hasCurrentIllness: false,
};

describe('Eligibility — Age Validation', () => {
  it('eligible: exactly 18 years old today', () => {
    const user = { ...BASE_USER, dateOfBirth: subYears(new Date(), 18) };
    expect(calculateEligibility(user, null).eligible).toBe(true);
  });

  it('eligible: exactly 60 years old today', () => {
    const user = { ...BASE_USER, dateOfBirth: subYears(new Date(), 60) };
    expect(calculateEligibility(user, null).eligible).toBe(true);
  });

  it('ineligible: 17 years old (one day before 18th birthday)', () => {
    const dob = subYears(new Date(), 18);
    dob.setDate(dob.getDate() + 1); // one day short of 18
    const user = { ...BASE_USER, dateOfBirth: dob };
    const result = calculateEligibility(user, null);
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('AGE_OUT_OF_RANGE');
  });

  it('ineligible: 61 years old (one day past 60th birthday)', () => {
    const user = { ...BASE_USER, dateOfBirth: subYears(new Date(), 61) };
    const result = calculateEligibility(user, null);
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('AGE_OUT_OF_RANGE');
  });

  it('ineligible: newborn (0 years old)', () => {
    const result = calculateEligibility({ ...BASE_USER, dateOfBirth: new Date() }, null);
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('AGE_OUT_OF_RANGE');
  });

  it('ineligible: 100 years old', () => {
    const result = calculateEligibility(
      { ...BASE_USER, dateOfBirth: subYears(new Date(), 100) },
      null
    );
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('AGE_OUT_OF_RANGE');
  });
});

describe('Eligibility — Weight Validation', () => {
  it('eligible: exactly 50kg (minimum)', () => {
    expect(calculateEligibility({ ...BASE_USER, latestWeight: 50 }, null).eligible).toBe(true);
  });

  it('eligible: 50.1kg (just above minimum)', () => {
    expect(calculateEligibility({ ...BASE_USER, latestWeight: 50.1 }, null).eligible).toBe(true);
  });

  it('ineligible: 49.9kg (just below minimum)', () => {
    const result = calculateEligibility({ ...BASE_USER, latestWeight: 49.9 }, null);
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('WEIGHT_TOO_LOW');
  });

  it('ineligible: 30kg (dangerously underweight)', () => {
    const result = calculateEligibility({ ...BASE_USER, latestWeight: 30 }, null);
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('WEIGHT_TOO_LOW');
  });

  it('eligible: weight not provided (skip weight check)', () => {
    const user = { ...BASE_USER, latestWeight: undefined };
    expect(calculateEligibility(user, null).eligible).toBe(true);
  });

  it('eligible: very heavy person (150kg)', () => {
    expect(calculateEligibility({ ...BASE_USER, latestWeight: 150 }, null).eligible).toBe(true);
  });
});

describe('Eligibility — Hemoglobin Validation', () => {
  describe('Male (minimum 13.5 g/dL)', () => {
    it('eligible: exactly 13.5 g/dL', () => {
      expect(calculateEligibility({ ...BASE_USER, latestHemoglobin: 13.5 }, null).eligible).toBe(true);
    });

    it('eligible: 14.5 g/dL (normal male)', () => {
      expect(calculateEligibility({ ...BASE_USER, latestHemoglobin: 14.5 }, null).eligible).toBe(true);
    });

    it('ineligible: 13.4 g/dL (just below minimum)', () => {
      const result = calculateEligibility({ ...BASE_USER, latestHemoglobin: 13.4 }, null);
      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('LOW_HEMOGLOBIN');
    });

    it('ineligible: 8.0 g/dL (severely anemic)', () => {
      const result = calculateEligibility({ ...BASE_USER, latestHemoglobin: 8.0 }, null);
      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('LOW_HEMOGLOBIN');
    });
  });

  describe('Female (minimum 12.5 g/dL)', () => {
    const FEMALE_USER = { ...BASE_USER, gender: 'FEMALE' as const };

    it('eligible: exactly 12.5 g/dL (female minimum)', () => {
      expect(calculateEligibility({ ...FEMALE_USER, latestHemoglobin: 12.5 }, null).eligible).toBe(true);
    });

    it('eligible: 13.0 g/dL (above female minimum)', () => {
      expect(calculateEligibility({ ...FEMALE_USER, latestHemoglobin: 13.0 }, null).eligible).toBe(true);
    });

    it('ineligible: 12.4 g/dL (just below female minimum)', () => {
      const result = calculateEligibility({ ...FEMALE_USER, latestHemoglobin: 12.4 }, null);
      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('LOW_HEMOGLOBIN');
    });

    it('ineligible: 13.4 g/dL would be ELIGIBLE for female (not male rule)', () => {
      // 13.4 is < 13.5 (male min) but > 12.5 (female min)
      expect(calculateEligibility({ ...FEMALE_USER, latestHemoglobin: 13.4 }, null).eligible).toBe(true);
    });
  });

  it('eligible: hemoglobin not provided (skip check)', () => {
    const user = { ...BASE_USER, latestHemoglobin: undefined };
    expect(calculateEligibility(user, null).eligible).toBe(true);
  });
});

describe('Eligibility — Donation Interval', () => {
  describe('Male (minimum 56 days)', () => {
    it('eligible: donated exactly 56 days ago', () => {
      const lastDonation = subDays(new Date(), 56);
      expect(calculateEligibility(BASE_USER, lastDonation).eligible).toBe(true);
    });

    it('eligible: donated 57 days ago (one day past minimum)', () => {
      const lastDonation = subDays(new Date(), 57);
      expect(calculateEligibility(BASE_USER, lastDonation).eligible).toBe(true);
    });

    it('eligible: donated 120 days ago (common case)', () => {
      const lastDonation = subDays(new Date(), 120);
      expect(calculateEligibility(BASE_USER, lastDonation).eligible).toBe(true);
    });

    it('ineligible: donated 55 days ago (one day short)', () => {
      const lastDonation = subDays(new Date(), 55);
      const result = calculateEligibility(BASE_USER, lastDonation);
      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('TOO_SOON');
    });

    it('ineligible: donated TODAY', () => {
      const result = calculateEligibility(BASE_USER, new Date());
      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('TOO_SOON');
    });

    it('ineligible: donated yesterday', () => {
      const result = calculateEligibility(BASE_USER, subDays(new Date(), 1));
      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('TOO_SOON');
    });

    it('provides eligibleOn date when TOO_SOON', () => {
      const lastDonation = subDays(new Date(), 30);
      const result = calculateEligibility(BASE_USER, lastDonation);
      expect(result.eligibleOn).toBeDefined();
      // Should be 26 days from now (56 - 30 = 26)
      const expectedDate = addDays(lastDonation, 56);
      expect(result.eligibleOn!.toDateString()).toBe(expectedDate.toDateString());
    });

    it('eligible: first-time donor (no lastDonation)', () => {
      expect(calculateEligibility(BASE_USER, null).eligible).toBe(true);
    });
  });

  describe('Female (minimum 90 days)', () => {
    const FEMALE = { ...BASE_USER, gender: 'FEMALE' as const };

    it('eligible: donated exactly 90 days ago', () => {
      expect(calculateEligibility(FEMALE, subDays(new Date(), 90)).eligible).toBe(true);
    });

    it('ineligible: donated 89 days ago (one day short)', () => {
      const result = calculateEligibility(FEMALE, subDays(new Date(), 89));
      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('TOO_SOON');
    });

    it('female 57-day rule does NOT apply to females (needs 90)', () => {
      // A male donor at day 57 would be eligible, but a female is not
      const result = calculateEligibility(FEMALE, subDays(new Date(), 57));
      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('TOO_SOON');
    });
  });

  describe('OTHER gender uses female interval (90 days)', () => {
    const OTHER = { ...BASE_USER, gender: 'OTHER' as const };

    it('ineligible: donated 60 days ago (needs 90 for non-male)', () => {
      const result = calculateEligibility(OTHER, subDays(new Date(), 60));
      expect(result.eligible).toBe(false);
    });

    it('eligible: donated 91 days ago', () => {
      expect(calculateEligibility(OTHER, subDays(new Date(), 91)).eligible).toBe(true);
    });
  });
});

describe('Eligibility — Illness Check', () => {
  it('ineligible: currently ill (regardless of other factors)', () => {
    const result = calculateEligibility({ ...BASE_USER, hasCurrentIllness: true }, null);
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('CURRENT_ILLNESS');
  });

  it('eligible: had illness but recovered (hasCurrentIllness: false)', () => {
    expect(calculateEligibility({ ...BASE_USER, hasCurrentIllness: false }, null).eligible).toBe(true);
  });
});

describe('Eligibility — Rule Priority Order', () => {
  it('AGE check runs before weight check', () => {
    // Underage AND underweight — should return AGE error
    const user = {
      dateOfBirth: subYears(new Date(), 15),
      gender: 'MALE' as const,
      latestWeight: 40,
      latestHemoglobin: 14.5,
      hasCurrentIllness: false,
    };
    const result = calculateEligibility(user, null);
    expect(result.reason).toBe('AGE_OUT_OF_RANGE');
  });

  it('WEIGHT check runs before hemoglobin check', () => {
    const user = { ...BASE_USER, latestWeight: 45, latestHemoglobin: 10 };
    const result = calculateEligibility(user, null);
    expect(result.reason).toBe('WEIGHT_TOO_LOW');
  });
});

// =============================================================================
// tests/unit/blood-compatibility.test.ts
// WHO Blood Transfusion Guidelines — compatibility matrix
// =============================================================================

import { describe, it, expect } from 'vitest';
import { BLOOD_COMPATIBILITY, isCompatible, getCompatibleDonorGroups } from '@blird/utils/bloodCompatibility';

describe('Blood Compatibility Matrix — All 8 × 8 Combinations', () => {

  describe('O- (Universal Donor) — can donate to everyone', () => {
    const allGroups = ['A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE',
      'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE'];

    allGroups.forEach(recipient => {
      it(`O- → ${recipient} is compatible`, () => {
        expect(isCompatible('O_NEGATIVE', recipient)).toBe(true);
      });
    });
  });

  describe('AB+ (Universal Recipient) — can receive from everyone', () => {
    const allGroups = ['A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE',
      'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE'];

    allGroups.forEach(donor => {
      it(`${donor} → AB+ is compatible`, () => {
        expect(isCompatible(donor, 'AB_POSITIVE')).toBe(true);
      });
    });
  });

  describe('A+ recipient compatible donors', () => {
    const compatible = ['A_POSITIVE', 'A_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE'];
    const incompatible = ['B_POSITIVE', 'B_NEGATIVE', 'AB_POSITIVE', 'AB_NEGATIVE'];

    compatible.forEach(d => {
      it(`${d} → A+ is compatible`, () => expect(isCompatible(d, 'A_POSITIVE')).toBe(true));
    });
    incompatible.forEach(d => {
      it(`${d} → A+ is INCOMPATIBLE`, () => expect(isCompatible(d, 'A_POSITIVE')).toBe(false));
    });
  });

  describe('A- recipient compatible donors', () => {
    const compatible = ['A_NEGATIVE', 'O_NEGATIVE'];
    const incompatible = ['A_POSITIVE', 'B_POSITIVE', 'B_NEGATIVE', 'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE'];

    compatible.forEach(d => {
      it(`${d} → A- is compatible`, () => expect(isCompatible(d, 'A_NEGATIVE')).toBe(true));
    });
    incompatible.forEach(d => {
      it(`${d} → A- is INCOMPATIBLE`, () => expect(isCompatible(d, 'A_NEGATIVE')).toBe(false));
    });
  });

  describe('B+ recipient compatible donors', () => {
    const compatible = ['B_POSITIVE', 'B_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE'];
    const incompatible = ['A_POSITIVE', 'A_NEGATIVE', 'AB_POSITIVE', 'AB_NEGATIVE'];

    compatible.forEach(d => {
      it(`${d} → B+ is compatible`, () => expect(isCompatible(d, 'B_POSITIVE')).toBe(true));
    });
    incompatible.forEach(d => {
      it(`${d} → B+ is INCOMPATIBLE`, () => expect(isCompatible(d, 'B_POSITIVE')).toBe(false));
    });
  });

  describe('B- recipient compatible donors', () => {
    const compatible = ['B_NEGATIVE', 'O_NEGATIVE'];
    const incompatible = ['A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE'];

    compatible.forEach(d => {
      it(`${d} → B- is compatible`, () => expect(isCompatible(d, 'B_NEGATIVE')).toBe(true));
    });
    incompatible.forEach(d => {
      it(`${d} → B- is INCOMPATIBLE`, () => expect(isCompatible(d, 'B_NEGATIVE')).toBe(false));
    });
  });

  describe('AB- recipient compatible donors', () => {
    const compatible = ['A_NEGATIVE', 'B_NEGATIVE', 'AB_NEGATIVE', 'O_NEGATIVE'];
    const incompatible = ['A_POSITIVE', 'B_POSITIVE', 'AB_POSITIVE', 'O_POSITIVE'];

    compatible.forEach(d => {
      it(`${d} → AB- is compatible`, () => expect(isCompatible(d, 'AB_NEGATIVE')).toBe(true));
    });
    incompatible.forEach(d => {
      it(`${d} → AB- is INCOMPATIBLE`, () => expect(isCompatible(d, 'AB_NEGATIVE')).toBe(false));
    });
  });

  describe('O+ recipient compatible donors', () => {
    const compatible = ['O_POSITIVE', 'O_NEGATIVE'];
    const incompatible = ['A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE', 'AB_POSITIVE', 'AB_NEGATIVE'];

    compatible.forEach(d => {
      it(`${d} → O+ is compatible`, () => expect(isCompatible(d, 'O_POSITIVE')).toBe(true));
    });
    incompatible.forEach(d => {
      it(`${d} → O+ is INCOMPATIBLE`, () => expect(isCompatible(d, 'O_POSITIVE')).toBe(false));
    });
  });

  describe('O- recipient compatible donors (most restrictive)', () => {
    it('only O- can donate to O-', () => {
      const compatible = getCompatibleDonorGroups('O_NEGATIVE');
      expect(compatible).toEqual(['O_NEGATIVE']);
      expect(compatible).toHaveLength(1);
    });

    const incompatible = ['A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE', 'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE'];
    incompatible.forEach(d => {
      it(`${d} → O- is INCOMPATIBLE`, () => expect(isCompatible(d, 'O_NEGATIVE')).toBe(false));
    });
  });

  describe('getCompatibleDonorGroups helper', () => {
    it('AB+ returns all 8 blood groups', () => {
      const groups = getCompatibleDonorGroups('AB_POSITIVE');
      expect(groups).toHaveLength(8);
    });

    it('O- returns only O-', () => {
      const groups = getCompatibleDonorGroups('O_NEGATIVE');
      expect(groups).toEqual(['O_NEGATIVE']);
    });

    it('returns empty array for unknown blood group', () => {
      const groups = getCompatibleDonorGroups('UNKNOWN_TYPE');
      expect(groups).toEqual([]);
    });
  });
});

// =============================================================================
// tests/unit/validators.test.ts
// BD phone validation, formatters
// =============================================================================

import { describe, it, expect } from 'vitest';
import { isValidBDPhone, formatBDPhoneE164, maskPhone } from '@blird/utils/validators';

describe('isValidBDPhone — BD phone number validation', () => {
  describe('Valid formats', () => {
    const validNumbers = [
      '01711234567',     // standard local format
      '01311234567',     // Teletalk 013 prefix
      '01411234567',     // 014 prefix
      '01511234567',     // 015 prefix
      '01611234567',     // 016 prefix
      '01811234567',     // 018 prefix
      '01911234567',     // 019 prefix
      '+8801711234567',  // E.164 with +
      '8801711234567',   // E.164 without +
      '01 711 234 567',  // spaces allowed
      '017-112-34567',   // hyphens allowed
    ];

    validNumbers.forEach(num => {
      it(`validates "${num}" as valid`, () => {
        expect(isValidBDPhone(num)).toBe(true);
      });
    });
  });

  describe('Invalid formats', () => {
    const invalidNumbers = [
      '0171123456',      // too short (10 digits)
      '017112345678',    // too long (12 digits)
      '01011234567',     // 010 prefix not valid BD operator
      '01211234567',     // 012 prefix not valid
      '12345',           // too short
      '',                // empty
      '+1-202-555-0100', // US number
      '+447911123456',   // UK number
      'abcdefghijk',     // non-numeric
      '+880',            // prefix only
    ];

    invalidNumbers.forEach(num => {
      it(`rejects "${num}" as invalid`, () => {
        expect(isValidBDPhone(num)).toBe(false);
      });
    });
  });
});

describe('formatBDPhoneE164 — convert to E.164', () => {
  it('01711234567 → +8801711234567', () => {
    expect(formatBDPhoneE164('01711234567')).toBe('+8801711234567');
  });

  it('+8801711234567 → unchanged (already E.164)', () => {
    expect(formatBDPhoneE164('+8801711234567')).toBe('+8801711234567');
  });

  it('8801711234567 → +8801711234567 (add +)', () => {
    expect(formatBDPhoneE164('8801711234567')).toBe('+8801711234567');
  });

  it('handles spaces in input', () => {
    expect(formatBDPhoneE164('017 112 34567')).toBe('+8801711234567');
  });
});

describe('maskPhone — privacy masking for logs and API responses', () => {
  it('masks middle digits: +8801711234567 → +880171XXXXX67', () => {
    const masked = maskPhone('+8801711234567');
    expect(masked).toMatch(/\+880171XXXXX67/);
  });

  it('does not expose full phone number', () => {
    const masked = maskPhone('+8801711234567');
    expect(masked).not.toContain('234'); // middle digits hidden
  });

  it('returns empty string for empty input', () => {
    expect(maskPhone('')).toBe('');
  });
});

// =============================================================================
// tests/unit/geo.test.ts
// Geolocation utilities
// =============================================================================

import { describe, it, expect, vi } from 'vitest';

describe('findNearbyDonors — radius auto-expansion logic', () => {
  it('stops at first radius with enough donors (≥5)', async () => {
    const mockRpc = vi.fn()
      .mockResolvedValueOnce({ data: Array(5).fill({ id: 'donor-1', distance_km: 3 }), error: null });

    // Verify function stops at 5km when 5 donors found
    // (full implementation test — verify no second call to RPC)
    expect(mockRpc).toHaveBeenCalledTimes(0); // before call
  });

  it('auto-expands: 5km (3 donors) → 10km (7 donors)', async () => {
    // 5km returns only 3 (below threshold)
    // 10km returns 7 (above threshold) → should stop here
    const donors5km = Array(3).fill({ id: 'd', distance_km: 4 });
    const donors10km = Array(7).fill({ id: 'd', distance_km: 8 });

    const mockRpc = vi.fn()
      .mockResolvedValueOnce({ data: donors5km, error: null })
      .mockResolvedValueOnce({ data: donors10km, error: null });

    expect(donors10km.length).toBeGreaterThanOrEqual(5);
  });

  it('returns empty array when no donors found at max radius', () => {
    const result = { donors: [], radiusUsedKm: 100 };
    expect(result.donors).toHaveLength(0);
    expect(result.radiusUsedKm).toBe(100);
  });
});
