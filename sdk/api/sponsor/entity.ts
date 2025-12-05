export interface SponsorEntity {
	id: number;
	name: string;
	level: string;
	link?: string;
	darkLogo?: string;
	lightLogo?: string;
	order: number;
	hackathonId?: string;
}

export type SponsorCreateEntity = Omit<
	SponsorEntity,
	"id" | "darkLogo" | "lightLogo"
>;

export type SponsorPatchEntity = Partial<SponsorCreateEntity>;

export type SponsorPatchBatchEntity = Pick<SponsorEntity, "id"> &
	Partial<
		Omit<
			SponsorEntity,
			"id" | "name" | "lightLogo" | "darkLogo" | "hackathonId"
		>
	>;
