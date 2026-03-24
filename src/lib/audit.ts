type AuditAction =
  | "auth.login.success"
  | "auth.login.fail"
  | "auth.signup"
  | "auth.refresh"
  | "sample.upload"
  | "sample.delete"
  | "sample.confirm"
  | "qpadm.start"
  | "qpadm.complete"
  | "qpadm.fail"
  | "qpadm.cancel";

export function auditLog(
  action: AuditAction,
  userId: string | null,
  metadata?: Record<string, unknown>,
  ip?: string,
  requestId?: string,
): void {
  const entry = {
    timestamp: new Date().toISOString(),
    action,
    userId,
    ...(ip && { ip }),
    ...(metadata && { metadata }),
    ...(requestId && { requestId }),
  };
  console.log(JSON.stringify(entry));
}
