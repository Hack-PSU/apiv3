import { applyDecorators, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';

// Define basic file filter and limits (optional, can be expanded)
const imageFileFilter = (req, file, callback) => {
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
    return callback(new Error('Only image files are allowed!'), false);
  }
  callback(null, true);
};

const limits = {
  fileSize: 1024 * 1024 * 5, // 5 MB
};

export function UploadedProductPhoto(fieldName: string = 'photo') {
  return applyDecorators(
    UseInterceptors(FileInterceptor(fieldName, { fileFilter: imageFileFilter, limits })),
    ApiConsumes('multipart/form-data'), // Ensures Swagger UI knows this endpoint consumes multipart/form-data
    ApiBody({ // Describes the expected file part in Swagger
      schema: {
        type: 'object',
        properties: {
          [fieldName]: {
            type: 'string',
            format: 'binary',
            description: 'The product photo file (jpg, jpeg, png, gif allowed, max 5MB)',
          },
        },
      },
    }),
    // The @UploadedFile() decorator is usually applied directly in the controller's parameter list.
    // This custom decorator sets up the interceptor and Swagger metadata.
    // The actual file will still be accessed via @UploadedFile(fieldName) or a more specific param decorator
    // if we were to create one (e.g., @ProductPhotoFile()).
    // For now, this decorator focuses on the interceptor and Swagger setup.
    // The controller will continue to use @UploadedFile() to get the file from the request.
    // This approach provides a named decorator for the setup part.
  );
}

// If we wanted a parameter decorator to replace @UploadedFile('photo') directly:
// import { createParamDecorator, ExecutionContext } from '@nestjs/common';
// export const ProductPhotoFile = createParamDecorator(
//   (data: unknown, ctx: ExecutionContext) => {
//     const request = ctx.switchToHttp().getRequest();
//     return request.file;
//   },
// );
// Then in controller: @UploadedProductPhoto() and then @ProductPhotoFile() photo: Express.Multer.File
