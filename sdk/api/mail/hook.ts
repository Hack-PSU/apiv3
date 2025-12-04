import { useQuery, useMutation } from "@tanstack/react-query";
import {
	sendMail,
	sendBatchMail,
	uploadTemplate,
	getTemplateMetadata,
	getTemplatePreview,
} from "./provider";
import {
	SendMailRequest,
	SendBatchMailRequest,
	UploadTemplateRequest,
	TemplateMetadata,
	PreviewMailRequest,
	PreviewMailResponse,
} from "./entity";

export const mailQueryKeys = {
	templateMetadata: (templateId: string) =>
		["mail", "template", templateId, "metadata"] as const,
};

export function useSendMail() {
	return useMutation({
		mutationFn: (data: SendMailRequest) => sendMail(data),
	});
}

export function useSendBatchMail() {
	return useMutation({
		mutationFn: (data: SendBatchMailRequest) => sendBatchMail(data),
	});
}

export function useUploadTemplate() {
	return useMutation({
		mutationFn: ({ data, file }: { data: UploadTemplateRequest; file: File }) =>
			uploadTemplate(data, file),
	});
}

export function useTemplateMetadata(templateId: string) {
	return useQuery<TemplateMetadata>({
		queryKey: mailQueryKeys.templateMetadata(templateId),
		queryFn: () => getTemplateMetadata(templateId),
		enabled: Boolean(templateId),
	});
}

export function useTemplatePreview() {
	return useMutation({
		mutationFn: ({
			templateId,
			data,
		}: {
			templateId: string;
			data: PreviewMailRequest;
		}) => getTemplatePreview(templateId, data),
	});
}
