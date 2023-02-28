import { applyDecorators } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiBodyOptions,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiParamOptions,
  ApiQuery,
  ApiQueryOptions,
  ApiResponse,
  ApiResponseOptions,
} from "@nestjs/swagger";
import { Role } from "common/gcp";
import { ApiAuth } from "common/docs/api-auth.decorator";
import { BadRequestExceptionResponse } from "common/docs/exception-response.entity";

type EndpointOptions = {
  summary: string;
  params?: ApiParamOptions[];
  query?: ApiQueryOptions[];
  request?: {
    mimeTypes?: string[];
    body?: ApiBodyOptions;
    validate?: boolean;
  };
  response: {
    noContent?: boolean;
    ok?: ApiResponseOptions;
    created?: ApiResponseOptions;
    custom?: ApiResponseOptions[];
  };
  auth?: Role;
  restricted?: boolean;
};

function resolveApiRequest(options: EndpointOptions["request"]) {
  const requestDecorators = [];

  if (options.mimeTypes) {
    requestDecorators.push(ApiConsumes(...options.mimeTypes));
  }

  if (options.body) {
    requestDecorators.push(ApiBody(options.body));
  }

  if (options.validate) {
    requestDecorators.push(
      ApiBadRequestResponse({
        description: "Bad Request",
        type: BadRequestExceptionResponse,
      }),
    );
  }

  return requestDecorators;
}

function resolveApiResponse(options: EndpointOptions["response"]) {
  const responseDecorators = [];

  if (options.noContent) {
    responseDecorators.push(ApiNoContentResponse());
  }

  if (options.ok) {
    responseDecorators.push(ApiOkResponse(options.ok));
  }

  if (options.created) {
    responseDecorators.push(ApiCreatedResponse(options.created));
  }

  if (options.custom) {
    options.custom.forEach((option) =>
      responseDecorators.push(ApiResponse(option)),
    );
  }

  return responseDecorators;
}

function resolveApiParams(params?: EndpointOptions["params"]) {
  return params ? params.map((param) => ApiParam(param)) : [];
}

function resolveApiQuery(query?: EndpointOptions["query"]) {
  return query ? query.map((q) => ApiQuery(q)) : [];
}

export function ApiDoc(options: EndpointOptions) {
  const requestDecorators = resolveApiRequest(options.request ?? {});
  const responseDecorators = resolveApiResponse(options.response ?? {});
  const paramsDecorators = resolveApiParams(options.params);
  const queryDecorators = resolveApiQuery(options.query);

  return applyDecorators(
    ApiOperation({ summary: options.summary }),
    ...requestDecorators,
    ...responseDecorators,
    ...paramsDecorators,
    ...queryDecorators,
    ...(options.auth !== undefined
      ? [ApiAuth(options.auth, options.restricted ?? false)]
      : []),
  );
}
