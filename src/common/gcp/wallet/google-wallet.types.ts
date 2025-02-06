export interface HackathonPassData {
  eventName: string;
  issuerName: string;
  homepageUri?: string;
  logoUrl?: string;
  startDateTime: string;
  endDateTime: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  ticketHolderName?: string;
  ticketNumber?: string;
}
