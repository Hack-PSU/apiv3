export enum DefaultTopic {
  ALL = "ALL",
  ORGANIZER = "ORGANIZER",
}

export type MessageEntity = {
  userPin?: string;
  title: string;
  body: string;
  scheduleTime?: number;
  broadcast?: DefaultTopic;
  topic?: string;
  metadata?: Record<string, any>;
};

export type Payload = {
  title: string;
  body: string;
  data?: Record<string, string>;
  scheduleTime?: number;
  isClickable?: boolean;
};
