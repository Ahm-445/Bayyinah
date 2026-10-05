import { request } from '../transport.js'

/** Registry entry: { sourceId, title, domain, url, authorityLevel, usageBasis, active } */
export function getSource(sourceId) {
  return request('GET', `/sources/${encodeURIComponent(sourceId)}`)
}
