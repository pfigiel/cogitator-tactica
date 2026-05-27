import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";

export const DICE_EXPRESSION_REGEX = /^(\d+)?D(3|6)([+-]\d+)?$/i;

@ValidatorConstraint({ name: "isDiceExpression" })
class IsDiceExpressionConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value === "number") return Number.isInteger(value) && value > 0;
    if (typeof value === "string") return DICE_EXPRESSION_REGEX.test(value);
    return false;
  }

  defaultMessage(): string {
    return "$property must be a positive integer or a dice expression (e.g. D6, 2D3, D6+1)";
  }
}

export const IsDiceExpression =
  (options?: ValidationOptions) => (object: object, propertyName: string) =>
    registerDecorator({
      target: object.constructor,
      propertyName,
      options,
      validator: IsDiceExpressionConstraint,
    });
