import { useMutation } from "@tanstack/react-query";
import { refreshAppleToken, revokeAppleToken } from "./provider";

export const appleQueryKeys = {
	refresh: ["apple", "refresh"] as const,
	revoke: ["apple", "revoke"] as const,
};

export function useRefreshAppleToken() {
	return useMutation({
		mutationFn: (code: string) => refreshAppleToken(code),
	});
}

export function useRevokeAppleToken() {
	return useMutation({
		mutationFn: (refreshToken: string) => revokeAppleToken(refreshToken),
	});
}
