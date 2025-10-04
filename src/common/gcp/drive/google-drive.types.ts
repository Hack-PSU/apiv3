export interface DrivePermission {
  id: string;
  type: "user" | "group" | "domain" | "anyone";
  role:
    | "owner"
    | "organizer"
    | "fileOrganizer"
    | "writer"
    | "commenter"
    | "reader";
  emailAddress?: string;
  displayName?: string;
  domain?: string;
  deleted?: boolean;
}

export interface DriveFolderInfo {
  id: string;
  name: string;
  mimeType: string;
  parents?: string[];
  permissions: DrivePermission[];
}

export interface CreateFolderOptions {
  name: string;
  parentId?: string;
}

export interface ShareFolderOptions {
  folderId: string;
  emailAddress: string;
  role: "owner" | "writer" | "commenter" | "reader";
  sendNotificationEmail?: boolean;
}
