/** Service-business categories used for signup + the public directory. */
export const BUSINESS_CATEGORIES = [
  'Salon',
  'Spa',
  'Barber',
  'Nails',
  'Clinic',
  'Dental',
  'Car Wash',
  'Auto Services',
  'Consultant',
  'Designer',
  'Photography',
  'Fitness',
  'Tattoo & Piercing',
  'Cleaning',
  'Tutoring',
  'Pet Grooming',
  'Events',
  'Other',
] as const

export type BusinessCategory = (typeof BUSINESS_CATEGORIES)[number]
