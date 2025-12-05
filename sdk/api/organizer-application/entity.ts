export enum YearStanding {
    FRESHMAN = "Freshman",
    SOPHOMORE = "Sophomore",
    JUNIOR = "Junior",
    SENIOR = "Senior",
    OTHER = "Other",
}

export enum OrganizerTeam {
    COMMUNICATIONS = "Communications",
    DESIGN = "Design",
    EDUCATION = "Education",
    ENTERTAINMENT = "Entertainment",
    FINANCE = "Finance",
    LOGISTICS = "Logistics",
    MARKETING = "Marketing",
    SPONSORSHIP = "Sponsorship",
    TECHNOLOGY = "Technology",
}

export enum ApplicationStatus {
    PENDING = "pending",
    ACCEPTED = "accepted",
    REJECTED = "rejected",
}

export interface OrganizerApplicationEntity {
    id: number;
    name: string;
    email: string;
    yearStanding: YearStanding;
    major: string;
    firstChoiceTeam: OrganizerTeam;
    secondChoiceTeam: OrganizerTeam;
    resumeUrl: string;
    whyHackpsu: string;
    newIdea: string;
    whatExcitesYou: string;
    firstChoiceStatus?: ApplicationStatus;
    secondChoiceStatus?: ApplicationStatus;
    assignedTeam?: OrganizerTeam;
    createdAt?: string;
    updatedAt?: string;
}

// DTOs

export type OrganizerApplicationCreateEntity = Omit<
    OrganizerApplicationEntity,
    | "id"
    | "resumeUrl"
    | "firstChoiceStatus"
    | "secondChoiceStatus"
    | "assignedTeam"
    | "createdAt"
    | "updatedAt"
>;

export interface ApplicationActionDto {
    team: OrganizerTeam;
}
