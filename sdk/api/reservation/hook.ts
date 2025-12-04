import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	getAllReservations,
	createReservation,
	deleteReservation,
} from "./provider";
import { ReservationEntity, ReservationCreateEntity } from "./entity";

export const reservationQueryKeys = {
	all: ["reservations"] as const,
};

export function useReservations() {
	return useQuery<ReservationEntity[]>({
		queryKey: reservationQueryKeys.all,
		queryFn: getAllReservations,
	});
}

export function useCreateReservation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: ReservationCreateEntity) => createReservation(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: reservationQueryKeys.all });
		},
	});
}

export function useCancelReservation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => deleteReservation(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: reservationQueryKeys.all });
		},
	});
}
