import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	getAllUsers,
	getUser,
	getMyInfo,
	createUser,
	updateUser,
	replaceUser,
	deleteUser,
	getUserResume,
	getAllResumes,
	registerUser,
	checkInUser,
	getUserExtraCreditClasses,
	assignExtraCreditClass,
	unassignExtraCreditClass,
	exportUsersData,
} from "./provider";
import {
	UserEntity,
	UserProfileResponse,
	UserRegisterRequest,
	UserCheckInRequest,
} from "./entity";

export const userQueryKeys = {
	all: (active?: boolean) =>
		active !== undefined ? ["users", active] : (["users"] as const),
	detail: (id: string) => ["user", id] as const,
	myInfo: ["user", "me"] as const,
	resume: (id: string) => ["user", id, "resume"] as const,
	allResumes: ["users", "resumes"] as const,
	extraCreditClasses: (id: string) =>
		["user", id, "extra-credit", "classes"] as const,
	exportData: ["users", "export"] as const,
};

export function useAllUsers(active?: boolean) {
	return useQuery<UserEntity[]>({
		queryKey: userQueryKeys.all(active),
		queryFn: () => getAllUsers(active),
	});
}

export function useUser(id: string) {
	return useQuery<UserEntity>({
		queryKey: userQueryKeys.detail(id),
		queryFn: () => getUser(id),
		enabled: Boolean(id),
	});
}

export function useMyInfo() {
	return useQuery<UserProfileResponse>({
		queryKey: userQueryKeys.myInfo,
		queryFn: getMyInfo,
	});
}

export function useCreateUser() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			data,
			resume,
		}: {
			data: Omit<UserEntity, "id" | "resume">;
			resume?: File;
		}) => createUser(data, resume),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: userQueryKeys.all() });
		},
	});
}

export function useUpdateUser() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			id,
			data,
			resume,
		}: {
			id: string;
			data: Partial<Omit<UserEntity, "id" | "resume">>;
			resume?: File;
		}) => updateUser(id, data, resume),
		onSuccess: (updated) => {
			queryClient.invalidateQueries({ queryKey: userQueryKeys.all() });
			queryClient.invalidateQueries({
				queryKey: userQueryKeys.detail(updated.id),
			});
		},
	});
}

export function useReplaceUser() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			id,
			data,
			resume,
		}: {
			id: string;
			data: Omit<UserEntity, "id" | "resume">;
			resume?: File;
		}) => replaceUser(id, data, resume),
		onSuccess: (updated) => {
			queryClient.invalidateQueries({ queryKey: userQueryKeys.all() });
			queryClient.invalidateQueries({
				queryKey: userQueryKeys.detail(updated.id),
			});
		},
	});
}

export function useDeleteUser() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => deleteUser(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: userQueryKeys.all() });
		},
	});
}

export function useUserResume(id: string) {
	return useQuery<Blob>({
		queryKey: userQueryKeys.resume(id),
		queryFn: () => getUserResume(id),
		enabled: Boolean(id),
	});
}

export function useAllResumes() {
	return useQuery<Blob>({
		queryKey: userQueryKeys.allResumes,
		queryFn: getAllResumes,
		enabled: false, // Don't fetch on page load
	});
}

export function useRegisterUser() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: UserRegisterRequest }) =>
			registerUser(id, data),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: userQueryKeys.detail(variables.id),
			});
			queryClient.invalidateQueries({
				queryKey: userQueryKeys.myInfo,
			});
		},
	});
}

export function useCheckInUser() {
	return useMutation({
		mutationFn: ({
			userId,
			eventId,
			data,
		}: {
			userId: string;
			eventId: string;
			data: UserCheckInRequest;
		}) => checkInUser(userId, eventId, data),
	});
}

export function useUserExtraCreditClasses(userId: string) {
	return useQuery<any[]>({
		queryKey: userQueryKeys.extraCreditClasses(userId),
		queryFn: () => getUserExtraCreditClasses(userId),
		enabled: Boolean(userId),
	});
}

export function useAssignExtraCreditClass() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ userId, classId }: { userId: string; classId: number }) =>
			assignExtraCreditClass(userId, classId),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: userQueryKeys.extraCreditClasses(variables.userId),
			});
		},
	});
}

export function useUnassignExtraCreditClass() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ userId, classId }: { userId: string; classId: number }) =>
			unassignExtraCreditClass(userId, classId),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: userQueryKeys.extraCreditClasses(variables.userId),
			});
		},
	});
}

export function useExportUsersData() {
	return useQuery<any[]>({
		queryKey: userQueryKeys.exportData,
		queryFn: exportUsersData,
		enabled: false, // Don't fetch on page load
	});
}
