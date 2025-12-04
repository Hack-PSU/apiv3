import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    acceptOrganizerApplication,
    createOrganizerApplication,
    getAllOrganizerApplications,
    getOrganizerApplication,
    getOrganizerApplicationsByTeam,
    rejectOrganizerApplication,
} from "./provider";
import {
    ApplicationActionDto,
    OrganizerApplicationCreateEntity,
    OrganizerApplicationEntity,
    OrganizerTeam,
} from "./entity";

export const organizerApplicationQueryKeys = {
    all: ["organizer-applications"] as const,
    byTeam: (team: OrganizerTeam) =>
        ["organizer-applications", "team", team] as const,
    detail: (id: number) => ["organizer-applications", id] as const,
};

export function useCreateOrganizerApplication() {
    const client = useQueryClient();
    return useMutation<
        OrganizerApplicationEntity,
        Error,
        { data: OrganizerApplicationCreateEntity; resume: File }
    >({
        mutationFn: ({ data, resume }) => createOrganizerApplication(data, resume),
        onSuccess: () => {
            client.invalidateQueries({ queryKey: organizerApplicationQueryKeys.all });
        },
    });
}

export function useAllOrganizerApplications() {
    return useQuery<OrganizerApplicationEntity[]>({
        queryKey: organizerApplicationQueryKeys.all,
        queryFn: getAllOrganizerApplications,
    });
}

export function useOrganizerApplicationsByTeam(team: OrganizerTeam) {
    return useQuery<{
        firstChoiceApplications: OrganizerApplicationEntity[];
        secondChoiceApplications: OrganizerApplicationEntity[];
    }>({
        queryKey: organizerApplicationQueryKeys.byTeam(team),
        queryFn: () => getOrganizerApplicationsByTeam(team),
        enabled: !!team,
    });
}

export function useOrganizerApplication(id: number) {
    return useQuery<OrganizerApplicationEntity>({
        queryKey: organizerApplicationQueryKeys.detail(id),
        queryFn: () => getOrganizerApplication(id),
        enabled: !!id,
    });
}

export function useAcceptOrganizerApplication() {
    const client = useQueryClient();
    return useMutation<
        OrganizerApplicationEntity,
        Error,
        { id: number; data: ApplicationActionDto }
    >({
        mutationFn: ({ id, data }) => acceptOrganizerApplication(id, data),
        onSuccess: (updated) => {
            client.invalidateQueries({ queryKey: organizerApplicationQueryKeys.all });
            client.invalidateQueries({
                queryKey: organizerApplicationQueryKeys.detail(updated.id),
            });
            // Invalidate team queries as well since status changed
            Object.values(OrganizerTeam).forEach((team) => {
                client.invalidateQueries({
                    queryKey: organizerApplicationQueryKeys.byTeam(team),
                });
            });
        },
    });
}

export function useRejectOrganizerApplication() {
    const client = useQueryClient();
    return useMutation<
        OrganizerApplicationEntity,
        Error,
        { id: number; data: ApplicationActionDto }
    >({
        mutationFn: ({ id, data }) => rejectOrganizerApplication(id, data),
        onSuccess: (updated) => {
            client.invalidateQueries({ queryKey: organizerApplicationQueryKeys.all });
            client.invalidateQueries({
                queryKey: organizerApplicationQueryKeys.detail(updated.id),
            });
            Object.values(OrganizerTeam).forEach((team) => {
                client.invalidateQueries({
                    queryKey: organizerApplicationQueryKeys.byTeam(team),
                });
            });
        },
    });
}
