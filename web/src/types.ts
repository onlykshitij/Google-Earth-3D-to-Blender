/** Shapes exchanged with the hub. Mirrors google_map_export_bridge/{hub,jobs}.py. */

export type Bbox = {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
};

/** Keep in step with the PHASE_* constants in jobs.py. */
export type Phase =
  | "idle"
  | "queued"
  | "downloading"
  | "converting"
  | "importing"
  | "done"
  | "error"
  | "cancelled";

export const TERMINAL_PHASES: Phase[] = ["done", "error", "cancelled"];

export type ModelReport = {
  vertices: number;
  latitude: number;
  longitude: number;
  sizeX: number;
  sizeY: number;
  minZ: number;
  maxZ: number;
  tiltRemovedDeg: number;
  groundCells: number;
  groundInliers: number;
  groundRms: number;
  /** Whether the export looks like real 3D or Google's flat 2D fallback. */
  coverage: "3d" | "sparse" | "flat" | "unknown";
  coverageNote: string;
  density: number;
  relief: number;
  achievedLevel: number | null;
  /** Tiles the exporter could not decode. */
  texturesFailed: number;
  /** Materials that reached the scene without a usable image. */
  texturesMissing: number;
  /** Tiles Google served blank: real geometry, no imagery. */
  texturesBlank: number;
};

export type Job = {
  id: string;
  phase: Phase;
  message: string;
  progress: number;
  startedAt: number;
  finishedAt: number | null;
  elapsed: number;
  bbox: Bbox | null;
  level: number;
  error: string | null;
  log: string[];
  importSummary: string | null;
  outputDir: string | null;
  model?: ModelReport;
};

export type ExportOptions = {
  level: number;
  levelGround: boolean;
  groundCellSize: number;
  scale: number;
  joinObjects: boolean;
  shadeSmooth: boolean;
  lockReference: boolean;
  adjustClipping: boolean;
  replacePrevious: boolean;
  collectionName: string;
  trimSubGround: boolean;
  trimDepth: number;
  /** Folder on the Blender machine to download into and import from. */
  exportDir: string;
};

/** What a Blender session reports about itself. */
export type InstanceInfo = {
  blenderVersion?: string;
  blendFile?: string;
  blendPath?: string;
  unsaved?: boolean;
  sceneName?: string;
  pid?: number;
  nodeFound?: boolean;
  onlineAccess?: boolean;
  hosting?: boolean;
  defaults?: Partial<ExportOptions>;
};

export type InstanceState = {
  busy?: boolean;
  job?: Job | null;
};

export type Instance = {
  id: string;
  info: InstanceInfo;
  state: InstanceState;
  online: boolean;
  secondsSinceSeen: number;
  connectedFor: number;
};

/** One folder listing, produced by the agent on the Blender machine. */
export type Listing = {
  path: string;
  parent: string | null;
  entries: { name: string; path: string }[];
  roots: { name: string; path: string }[];
  sep: string;
  writable?: boolean;
  error?: string;
};

export type Session = {
  service: string;
  protocol: number;
  version: string;
  token: string;
  uptime: number;
  instances: Instance[];
};

/** A readable name for a Blender session, for the picker. */
export function instanceLabel(instance: Instance): string {
  const info = instance.info ?? {};
  const file = info.blendFile || "Untitled";
  return info.unsaved ? `${file}*` : file;
}

export function instanceDetail(instance: Instance): string {
  const info = instance.info ?? {};
  const bits = [info.sceneName, info.blenderVersion].filter(Boolean);
  if (info.pid) bits.push(`pid ${info.pid}`);
  return bits.join(" · ");
}
