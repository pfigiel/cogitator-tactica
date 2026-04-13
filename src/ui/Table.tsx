import { Table as MantineTable, TableProps, ElementProps } from "@mantine/core";

type Props = TableProps & ElementProps<"table", keyof TableProps>;

export const Table = (props: Props) => {
  return <MantineTable {...props} />;
};

Table.Thead = MantineTable.Thead;
Table.Tbody = MantineTable.Tbody;
Table.Tr = MantineTable.Tr;
Table.Th = MantineTable.Th;
Table.Td = MantineTable.Td;
