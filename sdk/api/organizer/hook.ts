import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	getAllOrganizers,
	getOrganizer,
	createOrganizer,
	updateOrganizer,
	replaceOrganizer,
	deleteOrganizer,
	resendAllVerificationEmails,
	getOrganizerScans,
	getOrganizerJudgingProjects,
	updateOrganizerProjectScore,
	deleteOrganizerProjectAndReassign,
} from "./provider";
import {
	OrganizerEntity,
	OrganizerProjectScore,
	OrganizerProjectReassign,
} from "./entity";

export const organizerQueryKeys = {
	all: ["organizers"] as const,
	detail: (id: string) => ["organizer", id] as const,
	scans: (id: string) => ["organizer", id, "scans"] as const,
	judgingProjects: (id: string) =>
		["organizer", id, "judging", "projects"] as const,
};

export function useAllOrganizers() {
	return useQuery<OrganizerEntity[]>({
		queryKey: organizerQueryKeys.all,
		queryFn: getAllOrganizers,
	});
}

export function useOrganizer(id: string) {
	return useQuery<OrganizerEntity>({
		queryKey: organizerQueryKeys.detail(id),
		queryFn: () => getOrganizer(id),
		enabled: Boolean(id),
	});
}

export function useCreateOrganizer() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (newData: Omit<OrganizerEntity, "id" | "isActive">) =>
			createOrganizer(newData),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: organizerQueryKeys.all });
		},
	});
}

export function useUpdateOrganizer() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			id,
			data,
		}: {
			id: string;
			data: Partial<Omit<OrganizerEntity, "id" | "isActive">>;
		}) => updateOrganizer(id, data),
		onSuccess: (updated) => {
			queryClient.invalidateQueries({ queryKey: organizerQueryKeys.all });
			queryClient.invalidateQueries({
				queryKey: organizerQueryKeys.detail(updated.id),
			});
		},
	});
}

export function useReplaceOrganizer() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			id,
			data,
		}: {
			id: string;
			data: Omit<OrganizerEntity, "id" | "isActive">;
		}) => replaceOrganizer(id, data),
		onSuccess: (updated) => {
			queryClient.invalidateQueries({ queryKey: organizerQueryKeys.all });
			queryClient.invalidateQueries({
				queryKey: organizerQueryKeys.detail(updated.id),
			});
		},
	});
}

export function useDeleteOrganizer() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => deleteOrganizer(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: organizerQueryKeys.all });
		},
	});
}

export function useResendAllVerificationEmails() {
	return useMutation({
		mutationFn: resendAllVerificationEmails,
	});
}

export function useOrganizerScans(id: string) {
	return useQuery({
		queryKey: organizerQueryKeys.scans(id),
		queryFn: () => getOrganizerScans(id),
		enabled: Boolean(id),
	});
}

export function useOrganizerJudgingProjects(id: string) {
	return useQuery<OrganizerProjectScore[]>({
		queryKey: organizerQueryKeys.judgingProjects(id),
		queryFn: () => getOrganizerJudgingProjects(id),
		enabled: Boolean(id),
	});
}

export function useUpdateOrganizerProjectScore() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			id,
			projectId,
			data,
		}: {
			id: string;
			projectId: number;
			data: {
				creativity?: number;
				technical?: number;
				implementation?: number;
				clarity?: number;
				growth?: number;
				challenge1?: number;
				challenge2?: number;
				challenge3?: number;
				submitted?: boolean;
			};
		}) => updateOrganizerProjectScore(id, projectId, data),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: organizerQueryKeys.judgingProjects(variables.id),
			});
		},
	});
}

export function useDeleteOrganizerProjectAndReassign() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			id,
			projectId,
			data,
		}: {
			id: string;
			projectId: number;
			data: OrganizerProjectReassign;
		}) => deleteOrganizerProjectAndReassign(id, projectId, data),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: organizerQueryKeys.judgingProjects(variables.id),
			});
		},
	});
}
