import { useEffect, useState, useRef } from "react";
import {
  Box,
  Group,
  Select,
  TextInput,
  ActionIcon,
  Loader,
} from "@mantine/core";
import {
  IconLayoutNavbarCollapse,
  IconLayoutNavbarExpand,
  IconSearch,
} from "@tabler/icons-react";
import HostnamesPoolList from "./hostnames/HostnamesPoolList";
import { useDebouncedValue } from "@mantine/hooks";

interface SiteHostnameInfo {
  sitePath: string;
  hostnames: string[];
}

export default function HostnamesPage() {
  const [hostStates, setHostStates] = useState<SiteHostnameInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState("");
  const [selectedPool, setSelectedPool] = useState<string | null>(null);
  const [collapsedPools, setCollapsedPools] = useState<string[]>([]);
  const [debouncedSearch] = useDebouncedValue<string>(searchFilter.trim(), 250);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const eventSource = new EventSource("/api/v1/hostnames");
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      const data: SiteHostnameInfo = JSON.parse(event.data);
      setHostStates((prev) => [...prev, data]);
    };
    eventSource.onerror = () => {
      setLoading(false);
      eventSource.close();
    };
    return () => {
      eventSource.close();
    };
  }, []);

  useEffect(() => {
    if (hostStates.length > 0) setLoading(false);
  }, [hostStates]);

  // Get unique site paths for the Select
  const poolNames = Array.from(new Set(hostStates.map((s) => s.sitePath)));

  return (
    <Box mt="xs">
      <Group mb="md" mt="xs">
        <Select
          placeholder="Select site path"
          data={[
            { label: "All sites", value: "" },
            ...poolNames.map((pool) => ({ label: pool, value: pool })),
          ]}
          value={selectedPool || ""}
          onChange={(value) => setSelectedPool(value || null)}
          searchable
        />
        <TextInput
          flex={1}
          leftSection={<IconSearch />}
          placeholder="Filter by site or hostname"
          value={searchFilter}
          onChange={(event) => setSearchFilter(event.currentTarget.value)}
        />
        <ActionIcon
          size="input-sm"
          title={
            collapsedPools.length > 0 ? "Expand all pools" : "Collapse all pools"
          }
          variant="light"
          onClick={() =>
            setCollapsedPools(
              collapsedPools.length > 0 ? [] : poolNames
            )
          }
        >
          {collapsedPools.length > 0 ? (
            <IconLayoutNavbarExpand />
          ) : (
            <IconLayoutNavbarCollapse />
          )}
        </ActionIcon>
      </Group>
      {loading ? (
        <Loader size="md" />
      ) : (
        <HostnamesPoolList
          poolNames={poolNames}
          selectedPool={selectedPool}
          searchFilter={debouncedSearch}
          hostStates={hostStates}
        />
      )}
    </Box>
  );
} 