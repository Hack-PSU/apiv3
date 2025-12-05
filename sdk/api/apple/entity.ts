// Apple Auth API Types

export interface AppleAuthRefreshRequest {
	code: string;
}

export interface AppleAuthRevokeRequest {
	refresh_token: string;
}

export type AppleAuthRefreshResponse = string;
export type AppleAuthRevokeResponse = boolean;
