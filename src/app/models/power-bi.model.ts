export interface PowerBiReportSummary {
  readonly id: string;
  readonly title: string;
  readonly canRefresh: boolean;
}

export interface PowerBiReportUser {
  readonly id: string;
  readonly displayName: string;
  readonly email: string;
}

export interface PowerBiAdminReport {
  readonly id: string;
  readonly title: string;
  readonly reportId: string;
  readonly groupId: string;
  readonly datasetId: string | null;
  readonly embedUrl: string;
  readonly users: PowerBiReportUser[];
}

export interface PowerBiReportPayload {
  readonly title: string;
  readonly reportId: string;
  readonly groupId: string;
  readonly datasetId: string | null;
  readonly embedUrl: string;
  readonly userIds: string[];
}

export type PowerBiTokenType = 'Aad' | 'Embed';

export interface PowerBiEmbed {
  readonly reportId: string;
  readonly embedUrl: string;
  readonly accessToken: string;
  readonly tokenType: PowerBiTokenType;
  readonly expiresAt: string;
}

export type PowerBiRefreshStatus = 'never' | 'refreshing' | 'success' | 'failed';

export interface PowerBiRefresh {
  readonly status: PowerBiRefreshStatus;
  readonly startedAt: string | null;
  readonly finishedAt: string | null;
  readonly message: string | null;
}
