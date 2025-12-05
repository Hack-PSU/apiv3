import { apiFetch } from "../apiClient";
import {
	AppleAuthRefreshResponse,
	AppleAuthRevokeResponse,
} from "./entity";

export async function refreshAppleToken(
	code: string
): Promise<AppleAuthRefreshResponse> {
	return apiFetch<AppleAuthRefreshResponse>(
		`/apple/auth/refresh?code=${encodeURIComponent(code)}`,
		{
			method: "POST",
		}
	);
}

export async function revokeAppleToken(
	refreshToken: string
): Promise<AppleAuthRevokeResponse> {
	return apiFetch<AppleAuthRevokeResponse>(
		`/apple/auth/revoke?refresh_token=${encodeURIComponent(refreshToken)}`,
		{
			method: "POST",
		}
	);
}
