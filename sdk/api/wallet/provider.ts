import { apiFetch } from "../apiClient";
import { WalletLinkResponse } from "./entity";

export async function createWalletPass(
	userId: string
): Promise<WalletLinkResponse> {
	return apiFetch<WalletLinkResponse>(`/wallet/${userId}/pass`, {
		method: "POST",
	});
}
