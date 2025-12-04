export enum ReservationType {
	PARTICIPANT = "participant",
	ADMIN = "admin",
}

export interface ReservationEntity {
	id: string;
	locationId: number;
	teamId: string | null;
	startTime: number;
	endTime: number;
	hackathonId: string;
	reservationType: ReservationType;
}

export interface ReservationCreateEntity {
	locationId: number;
	teamId?: string;
	startTime: number;
	endTime: number;
	hackathonId: string;
}
