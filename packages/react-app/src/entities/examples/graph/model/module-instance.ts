export interface ModuleInstance {
  instanceId: string
  metadata?: Record<string, unknown>
  moduleDefinitionId: string
  position: {x: number; y: number}
  // Instance-specific overrides or configuration can be added here
}
