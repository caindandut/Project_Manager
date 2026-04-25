export * from './interfaces';
// Note: WorkspaceRole is excluded from enums to avoid conflict with the
// type alias in interfaces. Import WorkspaceRole as a type from './interfaces'.
import type { WorkspaceRole } from './interfaces';
export type { WorkspaceRole };
