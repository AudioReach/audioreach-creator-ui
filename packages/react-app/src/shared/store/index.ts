// ── Legacy exports (kept until final migration) ──────────────────────────────────
export {
  useProjectLayoutStore,
  AppTabEntity,
  ProjectMainTabEntity,
  ProjectTabEntity,
  PanelTabEntity,
  APP_CONFIG as PROJECT_LAYOUT_CONFIG,
} from './use-project-layout-store';

export type {
  ProjectLayoutStore,
  AppGroup,
  AppTab as LegacyAppTab,
  ProjectGroup as LegacyProjectGroup,
  ProjectMainTab,
  ProjectTab,
  PanelTab,
  ApplicationConfig,
} from './project-layout.types';

// ── Global Store ───────────────────────────────────────────────────────────
export {useGlobalStore} from './global-store';
export type {GlobalStore} from './global-store';
export type {
  AppSlice,
  BackendConnectionSlice,
  RecentProjectsSlice,
  Preferences,
  RecentProject,
  RegistrationStatus,
  SliceStatus,
  TabType,
} from './global-store.types';

// ── New Global Store Types ─────────────────────────────────────────────────
export type {
  AppTab,
  ProjectGroup,
  ProjectGroupSlice,
  SessionSlice,
} from './global-store.types';

// ── Project Store ──────────────────────────────────────────────────────────
export {createProjectStore} from './project-store';
export type {
  ProjectStore,
  ExclusiveLockSlice,
  ExclusiveSessionMode,
} from './project-store.types';
export {
  ProjectStoreContext,
  useProjectStore,
  useProjectStoreShallow,
} from './project-store-context';
export type {ProjectStoreApi} from './project-store-context';
export {
  ProjectStoreRegistry,
  projectStoreRegistry,
} from './project-store-registry';

// ── Tab Store Registry ─────────────────────────────────────────────────────
export {TabStoreRegistry, createTabStoreRegistry} from './tab-store-registry';
