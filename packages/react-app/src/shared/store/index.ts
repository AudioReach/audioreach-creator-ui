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

export {useUsecaseStore} from './use-usecase-store';

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

// ── Session Store ──────────────────────────────────────────────────────────
export {useSessionStore} from './use-session-store';
export type {AppTab, ProjectGroup} from './use-session-store';

// ── Project Store ──────────────────────────────────────────────────────────
export {createProjectStore} from './project-store';
export type {ProjectStore} from './project-store.types';
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

// ── Tab Stores ─────────────────────────────────────────────────────────────
export {createGraphDesignerStore} from './tab-stores/graph-designer-store';
export type {GraphDesignerStore} from './tab-stores/graph-designer-store';
export {
  GraphDesignerStoreContext,
  useGraphDesignerStore,
  useGraphDesignerStoreShallow,
} from './tab-stores/graph-designer-store-context';
export type {GraphDesignerStoreApi} from './tab-stores/graph-designer-store-context';
