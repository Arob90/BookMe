/** Belize districts used for the public directory pages. */
export type District = { slug: string; value: string; label: string; blurb: string }

export const DISTRICTS: District[] = [
  { slug: 'corozal', value: 'COROZAL', label: 'Corozal', blurb: 'The far north' },
  { slug: 'orange-walk', value: 'ORANGE_WALK', label: 'Orange Walk', blurb: 'Sugar City' },
  { slug: 'belize', value: 'BELIZE', label: 'Belize', blurb: 'The old capital' },
  { slug: 'cayo', value: 'CAYO', label: 'Cayo', blurb: 'The west' },
  { slug: 'stann-creek', value: 'STANN_CREEK', label: 'Stann Creek', blurb: 'The coast' },
  { slug: 'toledo', value: 'TOLEDO', label: 'Toledo', blurb: 'The deep south' },
  { slug: 'caye-caulker', value: 'CAYE_CAULKER', label: 'Caye Caulker', blurb: 'Go slow' },
  { slug: 'san-pedro', value: 'SAN_PEDRO', label: 'San Pedro', blurb: 'La Isla Bonita' },
]

export const districtBySlug = (slug: string) => DISTRICTS.find((d) => d.slug === slug)
