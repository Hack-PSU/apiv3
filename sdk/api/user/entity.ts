export interface UserEntity {
	id: string;
	firstName: string;
	lastName: string;
	gender: string;
	shirtSize: string;
	dietaryRestriction?: string;
	allergies?: string;
	university: string;
	email: string;
	major: string;
	phone: string;
	country: string;
	race?: string;
	resume?: string;
}

export interface UserProfileResponse extends UserEntity {
	registration: any | null;
}

export interface UserRegisterRequest {
	age: number;
	shareAddressSponsors?: boolean;
	travelReimbursement?: boolean;
	shareAddressMlh?: boolean;
	educationalInstitutionType: string;
	academicYear: string;
	codingExperience?: string;
	expectations?: string;
	driving?: boolean;
	firstHackathon?: boolean;
	mlhCoc: boolean;
	mlhDcp: boolean;
	project?: string;
	referral?: string;
	shareEmailMlh?: boolean;
	time: number;
	veteran: string;
	excitement?: string;
	zip_code?: string;
	travel_cost?: string;
	travel_method?: string;
	travel_additional?: string;
}

export interface UserCheckInRequest {
	hackathonId: string;
}
