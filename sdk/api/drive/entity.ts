export interface DrivePermission {
	id: string;
	emailAddress?: string;
	role: "owner" | "writer" | "commenter" | "reader";
	type: string;
}

export interface DriveFolderInfo {
	id: string;
	name: string;
	permissions: DrivePermission[];
}

export interface DriveSubfolder {
	id: string;
	name: string;
	permissions: DrivePermission[];
}

export interface DriveCreateFolderRequest {
	name: string;
	parentId?: string;
}

export interface DriveShareFolderRequest {
	emailAddress: string;
	role: "owner" | "writer" | "commenter" | "reader";
	sendNotificationEmail?: boolean;
}

export interface DriveCreateFolderStructureRequest {
	folderStructure: string[];
	parentId?: string;
}

export interface DriveShareMultipleRequest {
	shares: Array<{
		emailAddress: string;
		role: "owner" | "writer" | "commenter" | "reader";
	}>;
}
