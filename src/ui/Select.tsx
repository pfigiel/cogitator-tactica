import { Select as MantineSelect, SelectProps, ElementProps } from "@mantine/core";

export type SelectDataItem = { value: string; label: string };

export function filterDataBySearchLength(
  data: SelectDataItem[],
  searchValue: string,
  minSearchLength: number | undefined,
  selectedValue: string | null
): SelectDataItem[] {
  if (minSearchLength === undefined || searchValue.length >= minSearchLength) {
    return data;
  }
  if (selectedValue === null) return [];
  return data.filter((item) => item.value === selectedValue);
}

export function Select(props: SelectProps & ElementProps<"input", keyof SelectProps>) {
  return <MantineSelect {...props} />;
}
