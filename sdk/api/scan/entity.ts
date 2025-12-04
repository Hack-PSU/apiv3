import { EventEntity } from "../event/entity";
import { OrganizerEntity } from "../organizer/entity";

export interface ScanEntity {
	eventId: string;
	userId: string;
	organizerId: string;
	hackathonId?: string;
	timestamp?: number;
}

export interface EventWithScans extends EventEntity {
	scans: ScanEntity[];
}

export interface OrganizerWithScans extends OrganizerEntity {
	scans: ScanEntity[];
}
