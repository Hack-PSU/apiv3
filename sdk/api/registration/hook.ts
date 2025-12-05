import { useQuery } from "@tanstack/react-query";
import { getAllRegistrations } from "./provider";
import { RegistrationEntity } from "./entity";

export const registrationQueryKeys = {
	all: (all?: boolean) =>
		all !== undefined ? ["registrations", all] : (["registrations"] as const),
};

export function useAllRegistrations(all?: boolean) {
	return useQuery<RegistrationEntity[]>({
		queryKey: registrationQueryKeys.all(all),
		queryFn: () => getAllRegistrations(all),
	});
}
