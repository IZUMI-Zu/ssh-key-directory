import type { PublicKeyRecord } from '../directory.ts'

export function KeyIcon({ keyRecord }: { keyRecord: PublicKeyRecord }) {
  if (keyRecord.certificateAuthority) {
    return <span className="i-ph-certificate-duotone text-lg color-active" aria-hidden="true" />
  }
  if (keyRecord.securityKey) {
    return <span className="i-ph-fingerprint-simple-duotone text-lg color-active" aria-hidden="true" />
  }
  if (keyRecord.postQuantum) {
    return <span className="i-ph-cpu-duotone text-lg color-active" aria-hidden="true" />
  }
  return <span className="i-ph-key-duotone text-lg color-secondary" aria-hidden="true" />
}

