import { apiFetch } from "../apiClient";
import {
    ApplicationActionDto,
    OrganizerApplicationCreateEntity,
    OrganizerApplicationEntity,
    OrganizerTeam,
} from "./entity";

export async function createOrganizerApplication(
    data: OrganizerApplicationCreateEntity,
    resume: File,
): Promise<OrganizerApplicationEntity> {
    const formData = new FormData();
    formData.append("resume", resume);
    Object.entries(data).forEach(([key, value]) => {
        formData.append(key, value as string);
    });

    return await apiFetch<OrganizerApplicationEntity>("organizer-applications", {
        method: "POST",
        body: formData,
    });
}

export async function getAllOrganizerApplications(): Promise<
    OrganizerApplicationEntity[]
> {
    return await apiFetch<OrganizerApplicationEntity[]>("organizer-applications");
}

export async function getOrganizerApplicationsByTeam(team: OrganizerTeam): Promise<{
    firstChoiceApplications: OrganizerApplicationEntity[];
    secondChoiceApplications: OrganizerApplicationEntity[];
}> {
    return await apiFetch<{
        firstChoiceApplications: OrganizerApplicationEntity[];
        secondChoiceApplications: OrganizerApplicationEntity[];
    }>(`organizer-applications/by-team/${team}`);
}

export async function getOrganizerApplication(
    id: number,
): Promise<OrganizerApplicationEntity> {
    return await apiFetch<OrganizerApplicationEntity>(
        `organizer-applications/${id}`,
    );
}

export async function acceptOrganizerApplication(
    id: number,
    data: ApplicationActionDto,
): Promise<OrganizerApplicationEntity> {
    return await apiFetch<OrganizerApplicationEntity>(
        `organizer-applications/${id}/accept`,
        {
            method: "PATCH",
            body: JSON.stringify(data),
        },
    );
}

export async function rejectOrganizerApplication(
    id: number,
    data: ApplicationActionDto,
): Promise<OrganizerApplicationEntity> {
    return await apiFetch<OrganizerApplicationEntity>(
        `organizer-applications/${id}/reject`,
        {
            method: "PATCH",
            body: JSON.stringify(data),
        },
    );
}
