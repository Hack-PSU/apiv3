import { apiFetch } from "../apiClient";
import {
	SendMailRequest,
	SendBatchMailRequest,
	UploadTemplateRequest,
	TemplateMetadata,
	PreviewMailRequest,
	PreviewMailResponse,
} from "./entity";

export async function sendMail(data: SendMailRequest): Promise<void> {
	return apiFetch<void>("/mail/send", {
		method: "POST",
		body: JSON.stringify(data),
	});
}

export async function sendBatchMail(data: SendBatchMailRequest): Promise<void> {
	return apiFetch<void>("/mail/send/batch", {
		method: "POST",
		body: JSON.stringify(data),
	});
}

export async function uploadTemplate(
	data: UploadTemplateRequest,
	file: File
): Promise<void> {
	const formData = new FormData();
	formData.append("name", data.name);
	if (data.previewText) {
		formData.append("previewText", data.previewText);
	}
	formData.append("template", file);

	return apiFetch<void>("/mail/template", {
		method: "POST",
		body: formData,
	});
}

export async function getTemplateMetadata(
	templateId: string
): Promise<TemplateMetadata> {
	return apiFetch<TemplateMetadata>(
		`/mail/template/${templateId}/metadata`,
		{ method: "GET" }
	);
}

export async function getTemplatePreview(
	templateId: string,
	data: PreviewMailRequest
): Promise<PreviewMailResponse> {
	return apiFetch<PreviewMailResponse>(
		`/mail/template/${templateId}/preview`,
		{
			method: "POST",
			body: JSON.stringify(data),
		}
	);
}
