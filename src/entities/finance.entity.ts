import { ApiProperty, PickType } from "@nestjs/swagger";
import {
  IsEnum,
  IsNumber,
  IsString,
  IsOptional,
  IsUrl,
  IsNotEmpty,
  Length,
  IsPostalCode,
} from "class-validator";
import { Entity } from "entities/base.entity";
import { ID, Column, Table } from "common/objection";

export enum Status {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  SUBMITTED_TO_ASA = "SUBMITTED_TO_ASA",
  DEPOSIT = "DEPOSIT",

  REJECTED_INVALID_RECEIPT = "REJECTED_INVALID_RECEIPT",
  REJECTED_WRONG_ADDRESS = "REJECTED_WRONG_ADDRESS",
  REJECTED_WRONG_DESCRIPTION = "REJECTED_WRONG_DESCRIPTION",
  REJECTED_INCORRECT_AMOUNT = "REJECTED_INCORRECT_AMOUNT",
  REJECTED_DUPLICATE_SUBMISSION = "REJECTED_DUPLICATE_SUBMISSION",
  REJECTED_MISSING_INFORMATION = "REJECTED_MISSING_INFORMATION",
  REJECTED_INELIGIBLE_EXPENSE = "REJECTED_INELIGIBLE_EXPENSE",
  REJECTED_EXPIRED_SUBMISSION = "REJECTED_EXPIRED_SUBMISSION",
  REJECTED_OTHER = "REJECTED_OTHER",
}

export enum SubmitterType {
  USER = "USER",
  ORGANIZER = "ORGANIZER",
}

export enum Category {
  TelephoneRental = "Telephone Rental",
  Postage = "Postage",
  OfficeSupplies = "Office Supplies",
  Copies = "Copies",
  EquipmentRental = "Equipment Rental",
  EquipmentPurchase = "Equipment Purchase",
  EquipmentMaintenance = "Equipment Maintenance",
  ProfessionalServices = "Professional Services",
  InsurancePremiums = "Insurance Premiums",
  Advertising = "Advertising",
  DuesMembership = "Dues/Membership",
  AwardsGifts = "Awards/Gifts",
  Photography = "Photography",
  ClothingUniform = "Clothing/Uniform",
  RegistrationTournamentFee = "Registration/Tournament Fee",
  Instructor = "Instructor",
  RefereesJudges = "Referees/Judges",
  Fine = "Fine",
  WebHosting = "Web Hosting",
  BooksSubscription = "Books/Subscription",
  Printing = "Printing",
  Fundraising = "Fundraising",
  Donation = "Donation",
  CdAndDvd = "CD and DVD",
  Rush = "Rush",
  Social = "Social",
  FacilityRentalSocial = "Facility Rental - Social",
  Food = "Food",
  MaterialsSupplies = "Materials & Supplies",
  Meeting = "Meeting",
  EquipmentMaintenanceRepairs = "Equipment Maintenance/Repairs",
  Prizes = "Prizes",
  Security = "Security",
  EmtService = "EMT Service",
  Catering = "Catering",
  Meal = "Meal",
  Banquet = "Banquet",
  Retreat = "Retreat",
  FestivalFairExpense = "Festival/Fair Expense",
  SpecialFunction = "Special Function",
  CollegianAd = "Collegian Ad",
  Banner = "Banner",

  // UPAC FUNDED
  HonorariaSpeaker = "Honoraria - Speaker",
  HonorariaDj = "Honoraria - DJ",
  HonorariaPerformingArtist = "Honoraria - Performing Artist",
  SpeakerArtistTransportation = "Speaker/Artist - Transportation",
  SpeakerArtistLodging = "Speaker/Artist - Lodging",
  SpeakerArtistMeal = "Speaker/Artist - Meal",
  SpeakerArtistParking = "Speaker/Artist - Parking",
  ProgramFacilityRental = "Program - Facility Rental",
  ProgramEquipmentRental = "Program - Equipment Rental",
  ProgramPurchase = "Program - Purchase",
  ProgramSoundSystemRental = "Program - Sound System Rental",
  ProgramMovieRental = "Program - Movie Rental",
  ProgramProjectionist = "Program - Projectionist",
  ProgramProfessionalServices = "Program - Professional Services",
  ProgramPublicity = "Program - Publicity",
  ProgramCopiesFlyersPosters = "Program - Copies/Flyers/Posters",
  ProgramMediaPrintBroadcast = "Program - Media Print/Broadcast",
  ProgramCostume = "Program - Costume",
  ProgramSetConstruction = "Program - Set Construction",
  ProgramProps = "Program - Props",
  ProgramCopyrightLicensing = "Program - Copyright/Licensing",
  GeneralOperations50 = "General Operations ($50)",

  // TRAVEL
  TravelTransportation = "Travel - Transportation",
  TravelLodging = "Travel - Lodging",
  TravelRegistration = "Travel - Registration",
  TravelMeal = "Travel - Meal",
  TravelConference = "Travel - Conference",

  // REFUND
  Refund = "Refund",
}

export const CategoryMap: Record<Category, string> = {
  [Category.TelephoneRental]: "50110",
  [Category.Postage]: "50120",
  [Category.OfficeSupplies]: "50125",
  [Category.Copies]: "50130",
  [Category.EquipmentRental]: "50135",
  [Category.EquipmentPurchase]: "50140",
  [Category.EquipmentMaintenance]: "50145",
  [Category.ProfessionalServices]: "50150",
  [Category.InsurancePremiums]: "50160",
  [Category.Advertising]: "50210",
  [Category.DuesMembership]: "50220",
  [Category.AwardsGifts]: "50225",
  [Category.Photography]: "50235",
  [Category.ClothingUniform]: "50250",
  [Category.RegistrationTournamentFee]: "50251",
  [Category.Instructor]: "50252",
  [Category.RefereesJudges]: "50253",
  [Category.Fine]: "50260",
  [Category.WebHosting]: "50264",
  [Category.BooksSubscription]: "50266",
  [Category.Printing]: "50270",
  [Category.Fundraising]: "50275",
  [Category.Donation]: "50280",
  [Category.CdAndDvd]: "50290",
  [Category.Rush]: "50300",
  [Category.Social]: "50500",
  [Category.FacilityRentalSocial]: "50501",
  [Category.Food]: "50502",
  [Category.MaterialsSupplies]: "50503",
  [Category.Meeting]: "50504",
  [Category.EquipmentMaintenanceRepairs]: "60206",
  [Category.Prizes]: "60252",
  [Category.Security]: "60303",
  [Category.EmtService]: "60305",
  [Category.Catering]: "60350",
  [Category.Meal]: "60351",
  [Category.Banquet]: "60352",
  [Category.Retreat]: "60353",
  [Category.FestivalFairExpense]: "60354",
  [Category.SpecialFunction]: "60355",
  [Category.CollegianAd]: "60520",
  [Category.Banner]: "60540",

  // UPAC FUNDED
  [Category.HonorariaSpeaker]: "60100",
  [Category.HonorariaDj]: "60101",
  [Category.HonorariaPerformingArtist]: "60104",
  [Category.SpeakerArtistTransportation]: "60150",
  [Category.SpeakerArtistLodging]: "60151",
  [Category.SpeakerArtistMeal]: "60152",
  [Category.SpeakerArtistParking]: "60153",
  [Category.ProgramFacilityRental]: "60200",
  [Category.ProgramEquipmentRental]: "60201",
  [Category.ProgramPurchase]: "60202",
  [Category.ProgramSoundSystemRental]: "60203",
  [Category.ProgramMovieRental]: "60205",
  [Category.ProgramProjectionist]: "60301",
  [Category.ProgramProfessionalServices]: "60306",
  [Category.ProgramPublicity]: "60500",
  [Category.ProgramCopiesFlyersPosters]: "60510",
  [Category.ProgramMediaPrintBroadcast]: "60530",
  [Category.ProgramCostume]: "60600",
  [Category.ProgramSetConstruction]: "60610",
  [Category.ProgramProps]: "60620",
  [Category.ProgramCopyrightLicensing]: "60630",
  [Category.GeneralOperations50]: "60641",

  // TRAVEL
  [Category.TravelTransportation]: "70010",
  [Category.TravelLodging]: "70020",
  [Category.TravelRegistration]: "70030",
  [Category.TravelMeal]: "70040",
  [Category.TravelConference]: "70060",

  // REFUND
  [Category.Refund]: "50240",
};

@Table({
  name: "finances",
  relationMappings: {
    users: {
      relation: Entity.BelongsToOneRelation,
      modelClass: "user.entity.js",
      join: {
        from: "finances.submitterId",
        to: "users.id",
      },
    },
    organizers: {
      relation: Entity.BelongsToOneRelation,
      modelClass: "organizer.entity.js",
      join: {
        from: "finances.submitterId",
        to: "organizers.id",
      },
    },
    hackathons: {
      relation: Entity.BelongsToOneRelation,
      modelClass: "hackathon.entity.js",
      join: {
        from: "finances.hackathonId",
        to: "hackathons.id",
      },
    },
  },
})
export class Finance extends Entity {
  @ApiProperty({
    description: "Unique identifier for the finance record",
    example: "a1b2c3d4-e5f6-7890-abcd-1234567890ef",
  })
  @IsString()
  @ID({ type: "string" })
  id: string;

  @ApiProperty({
    description: "Amount to be reimbursed",
    example: 150.75,
  })
  @IsNumber(
    {
      maxDecimalPlaces: 2,
    },
    { each: true },
  )
  @Column({ type: "number" })
  amount: number;

  @ApiProperty({
    description: "Status of the reimbursement request",
    enum: Status,
    example: Status.PENDING,
  })
  @IsEnum(Status)
  @Column({ type: "string" })
  status: Status;

  @ApiProperty({
    description: "Type of the submitter (USER or ORGANIZER)",
    enum: SubmitterType,
    example: SubmitterType.USER,
  })
  @IsEnum(SubmitterType)
  @Column({ type: "string" })
  submitterType: SubmitterType;

  @ApiProperty({
    description: "ID of the submitter (User or Organizer)",
    example: "user123",
  })
  @IsString()
  @Column({ type: "string" })
  submitterId: string;

  @ApiProperty({
    description: "URL to the uploaded receipt",
    example: "https://s3.amazonaws.com/bucket/receipts/a1b2c3d4.pdf",
    required: false,
  })
  @IsString()
  @IsOptional()
  @IsUrl()
  @Column({ type: "string", nullable: true })
  receiptUrl?: string;

  @ApiProperty({
    description: "ID of the related hackathon",
    example: "hack789",
  })
  @IsString()
  @Column({ type: "string" })
  hackathonId: string;

  @ApiProperty({
    description: "Description of the expense",
    example: "Travel expenses for attending the hackathon",
  })
  @IsString()
  @Column({ type: "string" })
  description: string;

  @ApiProperty({
    description: "Category of the expense",
    example: "Travel",
  })
  @IsEnum(Category)
  @Column({ type: "string" })
  category: string;

  @ApiProperty({
    description: "Timestamp when the record was created in milliseconds",
    example: 1620000000000,
  })
  @IsNumber()
  @Column({ type: "integer" })
  createdAt: number;

  @ApiProperty({
    description: "ID of the user who last updated the record",
    example: "user123",
    required: false,
  })
  @IsString()
  @IsOptional()
  @Column({ type: "string", nullable: true })
  updatedBy?: string;

  @ApiProperty({ example: "123 Main St" })
  @IsNotEmpty({ message: "Street address is required" })
  @IsString({ message: "Street address must be a string" })
  @Length(5, 100, {
    message: "Street address must be between 5 and 100 characters",
  })
  @Column({ type: "string" })
  street: string;

  @ApiProperty({ example: "Springfield" })
  @IsNotEmpty({ message: "City is required" })
  @IsString({ message: "City must be a string" })
  @Length(2, 50, { message: "City must be between 2 and 50 characters" })
  @Column({ type: "string" })
  city: string;

  @ApiProperty({ example: "IL" })
  @IsNotEmpty({ message: "State is required" })
  @IsString({ message: "State must be a string" })
  @Length(2, 50, { message: "State must be between 2 and 50 characters" })
  @Column({ type: "string" })
  state: string;

  @ApiProperty({ example: "62704" })
  @IsNotEmpty({ message: "Postal code is required" })
  @IsPostalCode("US", { message: "Postal code must be a valid US postal code" })
  @Column({ type: "string" })
  postalCode: string;
}

export class FinanceEntity extends PickType(Finance, [
  "id",
  "amount",
  "status",
  "submitterType",
  "submitterId",
  "receiptUrl",
  "hackathonId",
  "description",
  "category",
  "createdAt",
  "updatedBy",
  "street",
  "city",
  "state",
  "postalCode",
] as const) {}
