import { Group as MantineGroup, GroupProps, ElementProps } from "@mantine/core";

export const Group = (props: GroupProps & ElementProps<"div", keyof GroupProps>) => {
  return <MantineGroup {...props} />;
};
