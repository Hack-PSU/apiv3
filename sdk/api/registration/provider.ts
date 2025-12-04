import { apiFetch } from "../apiClient";
import { RegistrationEntity } from "./entity";

export async function getAllRegistrations(
	all?: boolean
): Promise<RegistrationEntity[]> {
	const queryParam = all ? "?all=true" : "";
	return apiFetch<RegistrationEntity[]>(`/registrations${queryParam}`, {
		method: "GET",
	});
}
