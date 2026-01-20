import { SetMetadata } from "@nestjs/common"

export interface AuditMetadata {
  action: string
  entity: string
  sensitive?: boolean
}

export const AUDIT_METADATA_KEY = "audit"

export function Auditable(metadata: AuditMetadata) {
  return SetMetadata(AUDIT_METADATA_KEY, metadata)
}
