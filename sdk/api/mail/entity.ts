export interface SendMailRequest {
	to: string[];
	template: string;
	subject: string;
	data: Record<string, any>;
	from?: string;
}

export interface SendBatchReceiver {
	email: string;
	data: Record<string, any>;
}

export interface SendBatchMailRequest {
	to: SendBatchReceiver[];
	template: string;
	subject: string;
	from?: string;
}

export interface UploadTemplateRequest {
	name: string;
	previewText?: string;
}

export interface TemplateMetadata {
	name: string;
	context: string[];
}

export interface PreviewMailRequest {
	data: Record<string, any>;
}

export interface PreviewMailResponse {
	html: string;
}
