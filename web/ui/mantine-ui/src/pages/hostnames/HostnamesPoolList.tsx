import {
  Alert,
  Badge,
  Group,
  Stack,
  Table,
  Card,
  Title,
//   Center,
//   Loader,
} from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { FC, useMemo } from "react";

interface SiteHostnameInfo {
  sitePath: string;
  hostnames: string[];
}

type HostnamePool = {
  sitePath: string;
  hostnames: string[];
  upCount: number;
  downCount: number;
};

type HostnamePools = HostnamePool[];

type HostnamesPoolListProps = {
  poolNames: string[];
  selectedPool: string | null;
  searchFilter: string;
  hostStates: SiteHostnameInfo[];
};

const HostnamesPoolList: FC<HostnamesPoolListProps> = ({
//   poolNames,
  selectedPool,
  searchFilter,
  hostStates,
}) => {
  // Filter and group hostnames by sitePath
  const pools: HostnamePools = useMemo(() => {
    const trimmedSearch = searchFilter.trim().toLowerCase();
    return hostStates
      .filter((s) =>
        (!selectedPool || s.sitePath === selectedPool) &&
        (trimmedSearch === "" ||
          s.sitePath.toLowerCase().includes(trimmedSearch) ||
          s.hostnames.some((h) => h.toLowerCase().includes(trimmedSearch)))
      )
      .map((s) => ({
        sitePath: s.sitePath,
        hostnames: s.hostnames,
        upCount: s.hostnames.length,
        downCount: 0, // No explicit down state in data
      }));
  }, [hostStates, selectedPool, searchFilter]);

  const totalCount = pools.reduce((acc, p) => acc + p.hostnames.length, 0);
  const upCount = totalCount;
  const downCount = 0;

  return (
    <Stack>
      <Card withBorder padding="md" radius="md">
        <Group justify="space-between">
          <Title order={5}>Summary</Title>
          <Group gap="md">
            <Badge color="blue">TOTAL: {totalCount}</Badge>
            <Badge color="green">UP: {upCount}</Badge>
            <Badge color="red">DOWN: {downCount}</Badge>
          </Group>
        </Group>
      </Card>
      {pools.length === 0 ? (
        <Alert title="No hostnames" icon={<IconInfoCircle />}>
          No hostnames found.
        </Alert>
      ) : (
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th w="30%">Site Path</Table.Th>
              <Table.Th>Hostnames</Table.Th>
              <Table.Th w={100}>State</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {pools.map((pool, i) =>
              pool.hostnames.length > 0 ? (
                pool.hostnames.map((hostname, j) => (
                  <Table.Tr key={`${i}-${j}`}>
                    <Table.Td valign="top">{pool.sitePath}</Table.Td>
                    <Table.Td valign="top">{hostname}</Table.Td>
                    <Table.Td valign="top">
                      <Badge color="green">UP</Badge>
                    </Table.Td>
                  </Table.Tr>
                ))
              ) : (
                <Table.Tr key={i}>
                  <Table.Td valign="top">{pool.sitePath}</Table.Td>
                  <Table.Td valign="top" colSpan={2} style={{ color: "red" }}>
                    No hostnames found
                  </Table.Td>
                </Table.Tr>
              )
            )}
          </Table.Tbody>
        </Table>
      )}
    </Stack>
  );
};

export default HostnamesPoolList; 