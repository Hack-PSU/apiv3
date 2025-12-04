import { apiFetch } from "../apiClient";
import {
	SponsorCreateEntity,
	SponsorEntity,
	SponsorPatchBatchEntity,
	SponsorPatchEntity,
} from "./entity";

export async function getAllSponsors(
	hackathonId?: string,
): Promise<SponsorEntity[]> {
	const queryParam = hackathonId ? `?hackathonId=${hackathonId}` : "";
	return apiFetch<SponsorEntity[]>(`/sponsors${queryParam}`, { method: "GET" });
}

export async function getSponsor(id: number): Promise<SponsorEntity> {
	return apiFetch<SponsorEntity>(`/sponsors/${id}`, { method: "GET" });
}

export async function createSponsor(
	data: SponsorCreateEntity,
	files?: { darkLogo?: File; lightLogo?: File },
): Promise<SponsorEntity> {
	const formData = new FormData();
	if (files?.darkLogo) formData.append("darkLogo", files.darkLogo);
	if (files?.lightLogo) formData.append("lightLogo", files.lightLogo);

	Object.entries(data).forEach(([key, value]) => {
		if (value !== undefined && value !== null) {
			formData.append(key, value as string);
		}
	});

	return apiFetch<SponsorEntity>("/sponsors", {
		method: "POST",
		body: formData,
	});
}

export async function updateSponsor(
	id: number,
	data: SponsorPatchEntity,
	files?: { darkLogo?: File; lightLogo?: File },
): Promise<SponsorEntity> {
	const formData = new FormData();
	if (files?.darkLogo) formData.append("darkLogo", files.darkLogo);
	if (files?.lightLogo) formData.append("lightLogo", files.lightLogo);

	Object.entries(data).forEach(([key, value]) => {
		if (value !== undefined && value !== null) {
			formData.append(key, value as string);
		}
	});

	return apiFetch<SponsorEntity>(`/sponsors/${id}`, {
		method: "PATCH",
		body: formData,
	});
}

export async function replaceSponsor(
	id: number,
	data: SponsorCreateEntity,
	files?: { darkLogo?: File; lightLogo?: File },
): Promise<SponsorEntity> {
	const formData = new FormData();
	if (files?.darkLogo) formData.append("darkLogo", files.darkLogo);
	if (files?.lightLogo) formData.append("lightLogo", files.lightLogo);

	Object.entries(data).forEach(([key, value]) => {
		if (value !== undefined && value !== null) {
			formData.append(key, value as string);
		}
	});

	return apiFetch<SponsorEntity>(`/sponsors/${id}`, {
		method: "PUT",
		body: formData,
	});
}

export async function deleteSponsor(id: number): Promise<void> {
	return apiFetch<void>(`/sponsors/${id}`, { method: "DELETE" });
}

export async function batchUpdateSponsors(
	data: SponsorPatchBatchEntity[],
): Promise<SponsorEntity[]> {
	return apiFetch<SponsorEntity[]>("/sponsors/batch/update", {
		method: "PATCH",
		body: JSON.stringify(data),
	});
}
