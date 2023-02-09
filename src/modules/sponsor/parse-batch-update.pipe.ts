import { Injectable, PipeTransform } from "@nestjs/common";

@Injectable()
export class ParseBatchUpdatePipe implements PipeTransform {
  constructor(private readonly omit: string[]) {}

  transform(value: Record<string, any>[]): any {
    value.forEach((val) => {
      this.omit.forEach((prop) => {
        if (prop in val) {
          delete val[prop];
        }
      });
    });

    return value;
  }
}
