export enum Role {
	NONE,
	VOLUNTEER,
	TEAM,
	EXEC,
	TECH,
	FINANCE,
}

export interface OrganizerEntity {
	id: string;
	email: string;
	firstName: string;
	lastName: string;
	privilege: Role;
	team?: string;
	judgingLocation?: string;
	award?: string;
	isActive: boolean;
}

export interface OrganizerProjectScore {
	id: number;
	name: string;
	hackathonId: string;
	categories: string;
	teamId: string;
	githubLink?: string;
	devpostLink?: string;
	score: {
		creativity: number;
		technical: number;
		implementation: number;
		clarity: number;
		growth: number;
		challenge1: number;
		challenge2: number;
		challenge3: number;
		hackathonId: string;
		judgeId: string;
		projectId: number;
		submitted: boolean;
	};
}

export interface OrganizerProjectReassign {
	excludeProjects?: number[];
}
