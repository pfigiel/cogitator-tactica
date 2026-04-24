import { Accordion as MantineAccordion, AccordionProps } from "@mantine/core";
import styles from "./Accordion.module.css";

const AccordionRoot = ({ classNames, ...props }: AccordionProps) => (
  <MantineAccordion
    classNames={{
      item: styles.item,
      control: styles.control,
      ...classNames,
    }}
    {...props}
  />
);

export const Accordion = Object.assign(AccordionRoot, {
  Item: MantineAccordion.Item,
  Control: MantineAccordion.Control,
  Panel: MantineAccordion.Panel,
  Chevron: MantineAccordion.Chevron,
});
