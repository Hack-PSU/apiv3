import { apiFetch } from "../apiClient";
import { ReservationEntity, ReservationCreateEntity } from "./entity";

export async function getAllReservations(): Promise<ReservationEntity[]> {
	return apiFetch<ReservationEntity[]>("/reservations", {
		method: "GET",
	});
}

export async function createReservation(
	data: ReservationCreateEntity
): Promise<ReservationEntity> {
	return apiFetch<ReservationEntity>("/reservations", {
		method: "POST",
		body: JSON.stringify(data),
	});
}

export async function deleteReservation(id: string): Promise<void> {
	return apiFetch<void>(`/reservations/${id}`, { method: "DELETE" });
}
