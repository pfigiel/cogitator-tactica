import { CalculatorProvider } from "@/features/calculator/context/CalculatorContext";

type Props = {
  children: React.ReactNode;
};

const CalculatorLayout = ({ children }: Props) => (
  <CalculatorProvider>{children}</CalculatorProvider>
);

export default CalculatorLayout;
