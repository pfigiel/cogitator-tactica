import { Table as MantineTable, TableProps, ElementProps } from "@mantine/core";

export const Table = (props: TableProps & ElementProps<"table", keyof TableProps>) => {
  return <MantineTable {...props} />;
};

Table.Thead = MantineTable.Thead;
Table.Tbody = MantineTable.Tbody;
Table.Tr = MantineTable.Tr;
Table.Th = MantineTable.Th;
Table.Td = MantineTable.Td;
