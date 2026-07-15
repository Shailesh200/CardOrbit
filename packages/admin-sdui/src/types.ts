export type JobProgressEvent = {
  jobId: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  progress?: Record<string, unknown> | null;
  result?: Record<string, unknown> | null;
  errorMessage?: string | null;
};

export type SduiActionContext = {
  enqueueJob: (type: string, payload: Record<string, unknown>) => Promise<{ id: string; message?: string }>;
  fetchData: (source: string, params?: Record<string, unknown>) => Promise<unknown>;
  submitAction: (action: string, body: Record<string, unknown>) => Promise<unknown>;
  optionSources: Record<string, Array<{ value: string; label: string }>>;
  activeJobId: string | null;
  setActiveJobId: (id: string | null) => void;
  onJobComplete?: (result: Record<string, unknown> | null) => void;
};

export type SduiCustomBlockProps = {
  block: { type: string; dataSource?: string };
  ctx: SduiActionContext;
};

export type SduiCustomBlocks = Partial<
  Record<'import-queue' | 'asset-manager' | 'offers-table', React.ComponentType<SduiCustomBlockProps>>
>;
