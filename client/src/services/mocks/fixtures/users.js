// Mock-only demo accounts (all passwords: demo1234). Real accounts live in
// MongoDB on the backend: questioners register, dāʿīs and admins are seeded.
export const USERS = [
  { id: 'usr_q_1', username: 'sara', password: 'demo1234', displayName: 'sara', role: 'questioner' },
  { id: 'usr_q_2', username: 'john', password: 'demo1234', displayName: 'john', role: 'questioner' },
  { id: 'usr_daee_1', username: 'khalid', password: 'demo1234', displayName: 'Ustadh Khalid', role: 'daee' },
  { id: 'usr_daee_2', username: 'maryam', password: 'demo1234', displayName: 'Ustadha Maryam', role: 'daee' },
  { id: 'usr_admin', username: 'admin', password: 'demo1234', displayName: 'Admin', role: 'admin' },
]
