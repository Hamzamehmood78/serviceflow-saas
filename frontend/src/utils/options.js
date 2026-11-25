export const categories = [
  { value: 'clinic', label: 'Clinic' },
  { value: 'dental', label: 'Dental clinic' },
  { value: 'salon', label: 'Salon' },
  { value: 'barbershop', label: 'Barbershop' },
  { value: 'spa', label: 'Spa' },
  { value: 'workshop', label: 'Auto workshop' },
  { value: 'studio', label: 'Photography studio' },
  { value: 'tutor', label: 'Tutor' },
  { value: 'training', label: 'Training centre' },
  { value: 'consultant', label: 'Consultant' },
  { value: 'other', label: 'Other' },
];

export const timezones = [
  { value: 'Asia/Karachi', label: 'Pakistan (Asia/Karachi)' },
  { value: 'Asia/Dubai', label: 'UAE (Asia/Dubai)' },
  { value: 'Asia/Riyadh', label: 'Saudi Arabia (Asia/Riyadh)' },
  { value: 'Asia/Kolkata', label: 'India (Asia/Kolkata)' },
  { value: 'Asia/Dhaka', label: 'Bangladesh (Asia/Dhaka)' },
  { value: 'Europe/London', label: 'United Kingdom (Europe/London)' },
  { value: 'America/New_York', label: 'US Eastern (America/New_York)' },
  { value: 'UTC', label: 'UTC' },
];

export const currencies = ['PKR', 'USD', 'GBP', 'EUR', 'AED', 'SAR'].map((c) => ({
  value: c,
  label: c,
}));