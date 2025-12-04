import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	getAllScores,
	getScore,
	createScore,
	updateScore,
	replaceScore,
	deleteScore,
	getAllProjects,
	getProject,
	createProject,
	updateProject,
	replaceProject,
	deleteProject,
	getProjectBreakdown,
	assignJudging,
	assignAdditionalJudging,
	uploadProjectsCsv,
	getProjectsByTeam,
} from "./provider";
import {
	ScoreEntity,
	ScoreCreateEntity,
	ScoreUpdateEntity,
	ProjectEntity,
	ProjectBreakdownEntity,
	JudgingAssignmentEntity,
} from "./entity";

export const judgingQueryKeys = {
	allScores: ["judging", "scores"] as const,
	scoreDetail: (id: number) => ["judging", "score", id] as const,
	allProjects: ["judging", "projects"] as const,
	projectDetail: (id: number) => ["judging", "project", id] as const,
	projectBreakdown: ["judging", "breakdown"] as const,
};

export function useAllScores() {
	return useQuery<ScoreEntity[]>({
		queryKey: judgingQueryKeys.allScores,
		queryFn: getAllScores,
	});
}

export function useScore(id: number) {
	return useQuery<ScoreEntity>({
		queryKey: judgingQueryKeys.scoreDetail(id),
		queryFn: () => getScore(id),
		enabled: Boolean(id),
	});
}

export function useCreateScore() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: ScoreCreateEntity) => createScore(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: judgingQueryKeys.allScores });
		},
	});
}

export function useUpdateScore() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, data }: { id: number; data: ScoreUpdateEntity }) =>
			updateScore(id, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: judgingQueryKeys.allScores });
		},
	});
}

export function useReplaceScore() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, data }: { id: number; data: ScoreUpdateEntity }) =>
			replaceScore(id, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: judgingQueryKeys.allScores });
		},
	});
}

export function useDeleteScore() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: number) => deleteScore(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: judgingQueryKeys.allScores });
		},
	});
}

export function useAllProjects() {
	return useQuery<ProjectEntity[]>({
		queryKey: judgingQueryKeys.allProjects,
		queryFn: getAllProjects,
	});
}

export function useProject(id: number) {
	return useQuery<ProjectEntity>({
		queryKey: judgingQueryKeys.projectDetail(id),
		queryFn: () => getProject(id),
		enabled: Boolean(id),
	});
}

export function useCreateProject() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: Omit<ProjectEntity, "id">) => createProject(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: judgingQueryKeys.allProjects });
		},
	});
}

export function useUpdateProject() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, data }: { id: number; data: Partial<ProjectEntity> }) =>
			updateProject(id, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: judgingQueryKeys.allProjects });
		},
	});
}

export function useReplaceProject() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			id,
			data,
		}: {
			id: number;
			data: Omit<ProjectEntity, "id">;
		}) => replaceProject(id, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: judgingQueryKeys.allProjects });
		},
	});
}

export function useProjectsByTeam(teamId: string) {
	return useQuery<ProjectEntity[]>({
		queryKey: [...judgingQueryKeys.allProjects, "team", teamId],
		queryFn: () => getProjectsByTeam(teamId),
		enabled: Boolean(teamId),
	});
}

export function useDeleteProject() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: number) => deleteProject(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: judgingQueryKeys.allProjects });
		},
	});
}

export function useProjectBreakdown() {
	return useQuery<ProjectBreakdownEntity[]>({
		queryKey: judgingQueryKeys.projectBreakdown,
		queryFn: getProjectBreakdown,
	});
}

export function useAssignJudging() {
	return useMutation({
		mutationFn: (data: JudgingAssignmentEntity) => assignJudging(data),
	});
}

export function useAssignAdditonalJudging() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (judgeId: string) => assignAdditionalJudging(judgeId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: judgingQueryKeys.allScores });
		},
	});
}

export function useUploadProjectsCsv() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (file: File) => uploadProjectsCsv(file),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: judgingQueryKeys.allProjects });
		},
	});
}
