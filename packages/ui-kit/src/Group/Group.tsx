import { Group as MantineGroup, GroupProps, ElementProps } from "@mantine/core";

type Props = GroupProps & ElementProps<"div", keyof GroupProps>;

export const Group = (props: Props) => <MantineGroup {...props} />;
