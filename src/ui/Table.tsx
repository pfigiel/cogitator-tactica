import { Table as MantineTable, TableProps } from "@mantine/core";

export function Table(props: TableProps) {
  return <MantineTable {...props} />;
}

Table.Thead = MantineTable.Thead;
Table.Tbody = MantineTable.Tbody;
Table.Tr = MantineTable.Tr;
Table.Th = MantineTable.Th;
Table.Td = MantineTable.Td;
