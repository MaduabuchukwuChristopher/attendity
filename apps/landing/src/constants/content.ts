export const navItems = [
  { label: 'Features', to: '/features' },
  { label: 'Solutions', to: '/solutions' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'About', to: '/about' },
  { label: 'FAQ', to: '/faq' },
] as const;
export const features = [
  {
    title: 'Dynamic QR attendance',
    description: 'Short-lived QR codes keep every lecture check-in trustworthy.',
  },
  {
    title: 'Location assurance',
    description: 'Configurable GPS boundaries confirm students are at the right venue.',
  },
  {
    title: 'Attendance intelligence',
    description: 'Clear trends help academic teams support learners before eligibility is at risk.',
  },
  {
    title: 'Exam clearance',
    description: 'Verified attendance clearance creates confidence at examination time.',
  },
  {
    title: 'Live academic visibility',
    description: 'Educators and administrators see attendance progress as it happens.',
  },
  {
    title: 'Privacy-first security',
    description: 'Tenant-aware controls protect institution data from day one.',
  },
] as const;
