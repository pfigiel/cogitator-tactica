import { Type } from "@nestjs/common";
import { mock, MockProxy } from "vitest-mock-extended";

export const getMockProvider = <T>(
  token: Type<T>,
): { provide: Type<T>; useValue: MockProxy<T> } => ({
  provide: token,
  useValue: mock<T>(),
});
