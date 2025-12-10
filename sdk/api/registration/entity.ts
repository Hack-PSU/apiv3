export interface RegistrationEntity {
	id: number;
	userId: string;
	age: number;
	shareAddressSponsors?: boolean;
	travelReimbursement?: boolean;
	shareAddressMlh?: boolean;
	educationalInstitutionType: string;
	academicYear: string;
	codingExperience: string;
	expectations: string;
	driving?: boolean;
	hackathonId: string;
	firstHackathon?: boolean;
	mlhCoc: boolean;
	mlhDcp: boolean;
	project: string;
	referral: string;
	shareEmailMlh?: boolean;
	time: number;
	veteran: string;
	excitement: string;
	zip_code?: string;
	travel_cost?: string;
	travel_method?: string;
	travel_additional?: string;
}
