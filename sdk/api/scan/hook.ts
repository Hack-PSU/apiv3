import { useQuery } from "@tanstack/react-query";
import {
	getAllScans,
	getScan,
	getAllScansByEvent,
	getScansForEvent,
	getAllScansByOrganizer,
	getScansForOrganizer,
} from "./provider";
import {
	ScanEntity,
	EventWithScans,
	OrganizerWithScans,
} from "./entity";

export const scanQueryKeys = {
	all: (hackathonId?: string) =>
		hackathonId !== undefined
			? ["scans", hackathonId]
			: (["scans"] as const),
	detail: (id: string) => ["scans", id] as const,
	eventAnalytics: ["scans", "events"] as const,
	eventDetail: (eventId: string) => ["scans", "events", eventId] as const,
	organizerAnalytics: ["scans", "organizers"] as const,
	organizerDetail: (organizerId: string) =>
		["scans", "organizers", organizerId] as const,
};

export function useAllScans(hackathonId?: string) {
	return useQuery<ScanEntity[]>({
		queryKey: scanQueryKeys.all(hackathonId),
		queryFn: () => getAllScans(hackathonId),
	});
}

export function useScan(id: string) {
	return useQuery<ScanEntity>({
		queryKey: scanQueryKeys.detail(id),
		queryFn: () => getScan(id),
		enabled: Boolean(id),
	});
}

export function useAllScansByEvent() {
	return useQuery<EventWithScans[]>({
		queryKey: scanQueryKeys.eventAnalytics,
		queryFn: getAllScansByEvent,
	});
}

export function useScansForEvent(eventId: string) {
	return useQuery<ScanEntity[]>({
		queryKey: scanQueryKeys.eventDetail(eventId),
		queryFn: () => getScansForEvent(eventId),
		enabled: Boolean(eventId),
	});
}

export function useAllScansByOrganizer() {
	return useQuery<OrganizerWithScans[]>({
		queryKey: scanQueryKeys.organizerAnalytics,
		queryFn: getAllScansByOrganizer,
	});
}

export function useScansForOrganizer(organizerId: string) {
	return useQuery<ScanEntity[]>({
		queryKey: scanQueryKeys.organizerDetail(organizerId),
		queryFn: () => getScansForOrganizer(organizerId),
		enabled: Boolean(organizerId),
	});
}
