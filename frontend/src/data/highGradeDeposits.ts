export type GradeBand = {
  name: string;
  manganese: string;
  iron: string;
  use: string;
  color: string;
};

export const GRADE_BANDS: GradeBand[] = [
  { name: 'Chemical / Dioxide', manganese: '> 48%', iron: '< 4%', use: 'EMD, batteries, chemicals', color: '#d97706' },
  { name: 'High Grade', manganese: '> 46%', iron: '—', use: 'Ferro-alloys, export', color: '#94a3b8' },
  { name: 'Medium Grade', manganese: '35–46%', iron: '< 26%', use: 'Blast furnace feed', color: '#64748b' },
  { name: 'Low Grade', manganese: '25–35%', iron: '< 35%', use: 'Limited use', color: '#475569' },
  { name: 'Sub-Grade / Waste', manganese: '10–25%', iron: '—', use: 'Often uneconomic; sub-grade', color: '#334155' },
];

export const HIGH_GRADE_REFERENCE_DEPOSITS = [
  { name: 'Bamebari Mine', region: 'Odisha', latitude: 21.98, longitude: 85.48, manganese: '52.44%', numericGrade: 52.44, notes: 'Chemical / dioxide grade; Tata Steel reference' },
  { name: 'Panchmahal', region: 'Gujarat', latitude: 22.75, longitude: 73.60, manganese: '48.50%', numericGrade: 48.5, notes: 'Champaner belt; Grade I reference' },
  { name: 'Balaghat / Bharveli', region: 'Madhya Pradesh', latitude: 21.81, longitude: 80.19, manganese: '46–48%', numericGrade: 47, notes: 'Ferro-manganese plant feed reference' },
  { name: 'Nagpur belt', region: 'Maharashtra', latitude: 21.15, longitude: 79.09, manganese: '45–48%', numericGrade: 46.5, notes: 'Precambrian meta-sediment reference' },
  { name: 'Gadchiroli', region: 'Maharashtra', latitude: 20.18, longitude: 80.00, manganese: 'High grade', numericGrade: 46, notes: 'Known quality-deposit reference' },
  { name: 'Dharwar / Chitradurga belt', region: 'Karnataka', latitude: 14.23, longitude: 76.40, manganese: '46–48%', numericGrade: 47, notes: 'Lateritoid-type reference' },
] as const;

export function gradeBandFor(value: number): GradeBand {
  if (value > 48) return GRADE_BANDS[0];
  if (value > 46) return GRADE_BANDS[1];
  if (value >= 35) return GRADE_BANDS[2];
  if (value >= 25) return GRADE_BANDS[3];
  return GRADE_BANDS[4];
}
