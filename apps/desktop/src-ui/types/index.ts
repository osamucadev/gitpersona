export interface GitHubInfo {
  connected: boolean;
  username?: string;
  tokenRef?: string;
}

export interface Profile {
  id: string;
  label: string;
  gitName: string;
  gitEmail: string;
  github: GitHubInfo;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  autostart: boolean;
  alwaysAskBrowser: boolean;
  rememberedBrowser?: string;
  activeProfileId?: string;
}

export interface DeviceFlowStart {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  expiresIn: number;
  interval: number;
}

export interface BrowserEntry {
  name: string;
  executable?: string;
  icon?: string;
}

export interface GitHubUser {
  login: string;
  name?: string;
  avatarUrl: string;
  htmlUrl: string;
}

export interface GitIdentityResult {
  userName?: string;
  userEmail?: string;
  credentialHelper?: string;
}

export interface Diagnostics {
  gitVersion?: string;
  globalUserName?: string;
  globalUserEmail?: string;
  credentialHelper?: string;
  activeProfileId?: string;
  platform: string;
  appVersion: string;
}
