import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	batchUpdateSponsors,
	createSponsor,
	deleteSponsor,
	getAllSponsors,
	getSponsor,
	replaceSponsor,
	updateSponsor,
} from "./provider";
import {
	SponsorCreateEntity,
	SponsorEntity,
	SponsorPatchBatchEntity,
	SponsorPatchEntity,
} from "./entity";

export const sponsorQueryKeys = {
	all: ["sponsors"] as const,
	detail: (id: number) => ["sponsor", id] as const,
};

export function useAllSponsors(hackathonId?: string) {
	return useQuery<SponsorEntity[]>({
		queryKey: sponsorQueryKeys.all,
		queryFn: () => getAllSponsors(hackathonId),
	});
}

export function useSponsor(id: number) {
	return useQuery<SponsorEntity>({
		queryKey: sponsorQueryKeys.detail(id),
		queryFn: () => getSponsor(id),
		enabled: Boolean(id),
	});
}

export function useCreateSponsor() {
	const queryClient = useQueryClient();
	return useMutation<
		SponsorEntity,
		Error,
		{ data: SponsorCreateEntity; files?: { darkLogo?: File; lightLogo?: File } }
	>({
		mutationFn: ({ data, files }) => createSponsor(data, files),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: sponsorQueryKeys.all });
		},
	});
}

export function useUpdateSponsor() {
	const queryClient = useQueryClient();
	return useMutation<
		SponsorEntity,
		Error,
		{
			id: number;
			data: SponsorPatchEntity;
			files?: { darkLogo?: File; lightLogo?: File };
		}
	>({
		mutationFn: ({ id, data, files }) => updateSponsor(id, data, files),
		onSuccess: (updated) => {
			queryClient.invalidateQueries({ queryKey: sponsorQueryKeys.all });
			queryClient.invalidateQueries({
				queryKey: sponsorQueryKeys.detail(updated.id),
			});
		},
	});
}

export function useReplaceSponsor() {
	const queryClient = useQueryClient();
	return useMutation<
		SponsorEntity,
		Error,
		{
			id: number;
			data: SponsorCreateEntity;
			files?: { darkLogo?: File; lightLogo?: File };
		}
	>({
		mutationFn: ({ id, data, files }) => replaceSponsor(id, data, files),
		onSuccess: (updated) => {
			queryClient.invalidateQueries({ queryKey: sponsorQueryKeys.all });
			queryClient.invalidateQueries({
				queryKey: sponsorQueryKeys.detail(updated.id),
			});
		},
	});
}

export function useDeleteSponsor() {
	const queryClient = useQueryClient();
	return useMutation<void, Error, number>({
		mutationFn: (id: number) => deleteSponsor(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: sponsorQueryKeys.all });
		},
	});
}

export function useBatchUpdateSponsors() {
	const queryClient = useQueryClient();
	return useMutation<SponsorEntity[], Error, SponsorPatchBatchEntity[]>({
		mutationFn: (data: SponsorPatchBatchEntity[]) => batchUpdateSponsors(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: sponsorQueryKeys.all });
		},
	});
}
