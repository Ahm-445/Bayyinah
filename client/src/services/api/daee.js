import { mapDashboard } from '../mappers/dashboard.js'
import { request } from '../transport.js'

export async function getDashboard() {
  return mapDashboard(await request('GET', '/daee/dashboard'))
}
