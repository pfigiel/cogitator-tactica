import { useState } from "react";
import {
  Select as MantineSelect,
  SelectProps,
  ElementProps,
} from "@mantine/core";

export type SelectDataItem = { value: string; label: string };

export const filterDataBySearchLength = (
  data: SelectDataItem[],
  searchValue: string,
  minSearchLength: number | undefined,
  selectedValue: string | null,
): SelectDataItem[] => {
  if (minSearchLength === undefined) return data;
  if (searchValue.length < minSearchLength) {
    if (selectedValue === null) return [];
    return data.filter((item) => item.value === selectedValue);
  }

  return data.filter(
    (item) =>
      item.value === selectedValue ||
      item.label.toLowerCase().includes(searchValue.toLowerCase()),
  );
};

type SearchProps =
  | { searchable: true; minSearchLength?: number }
  | { searchable?: false | undefined; minSearchLength?: never };

type Props = Omit<
  SelectProps & ElementProps<"input", keyof SelectProps>,
  "searchable"
> &
  SearchProps;

export const Select = ({
  minSearchLength,
  searchable,
  data,
  value,
  onChange,
  ...rest
}: Props) => {
  const [searchValue, setSearchValue] = useState("");

  const filteredData =
    minSearchLength !== undefined && Array.isArray(data)
      ? filterDataBySearchLength(
          data as SelectDataItem[],
          searchValue,
          minSearchLength,
          value ?? null,
        )
      : data;

  return (
    <MantineSelect
      {...rest}
      searchable={searchable}
      data={filteredData}
      value={value}
      onChange={onChange}
      searchValue={minSearchLength !== undefined ? searchValue : undefined}
      onSearchChange={
        minSearchLength !== undefined ? setSearchValue : undefined
      }
      onDropdownClose={
        minSearchLength !== undefined ? () => setSearchValue("") : undefined
      }
    />
  );
};
