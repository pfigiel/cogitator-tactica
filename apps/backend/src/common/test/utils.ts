import { Type } from "@nestjs/common";
import { mockDeep, MockProxy } from "vitest-mock-extended";

export const getMockProvider = <T>(
  token: Type<T>,
): { provide: Type<T>; useValue: MockProxy<T> } => ({
  provide: token,
  useValue: mockDeep<T>(),
});
