import {
  Accordion,
  Alert,
  Anchor,
  Group,
  RingProgress,
  Stack,
  Table,
  Text,
} from "@mantine/core";
import { KVSearch } from "@nexucis/kvsearch";
import { IconInfoCircle } from "@tabler/icons-react";
import { useSuspenseAPIQuery } from "../../api/api";
import {
  DroppedTarget,
  Labels,
  Target,
  TargetsResult,
} from "../../api/responseTypes/targets";
import { FC, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../../state/hooks";
import { setCollapsedPools } from "../../state/serviceDiscoveryPageSlice";
import CustomInfiniteScroll from "../../components/CustomInfiniteScroll";
import { useDebouncedValue, useLocalStorage } from "@mantine/hooks";
import { LabelBadges } from "../../components/LabelBadges";
import { useAllowedScrapePools } from "../../hooks/useAllowedScrapePool";

type TargetLabels = {
  discoveredLabels: Labels;
  labels: Labels;
  isDropped: boolean;
};

type ScrapePool = {
  targets: TargetLabels[];
  active: number;
  total: number;
  serverTotal: number;
};

type ScrapePools = {
  [scrapePool: string]: ScrapePool;
};

const activeTargetKVSearch = new KVSearch<Target>({
  shouldSort: true,
  indexedKeys: [
    "labels",
    "discoveredLabels",
    ["discoveredLabels", /.*/],
    ["labels", /.*/],
  ],
});

const droppedTargetKVSearch = new KVSearch<DroppedTarget>({
  shouldSort: true,
  indexedKeys: ["discoveredLabels", ["discoveredLabels", /.*/]],
});

const buildPoolsData = (
  poolNames: string[],
  targetsData: TargetsResult,
  search: string,
  stateFilter: (string | null)[]
): ScrapePools => {
  const { activeTargets, droppedTargets, droppedTargetCounts } = targetsData;
  const pools: ScrapePools = {};

  for (const pn of poolNames) {
    pools[pn] = {
      targets: [],
      active: 0,
      total: 0,
      serverTotal: droppedTargetCounts[pn] || 0,
    };
  }

  for (const target of activeTargets) {
    const pool = pools[target.scrapePool];
    if (!pool) continue;
    pool.active++;
    pool.total++;
    pool.serverTotal++;
  }

  const filteredActiveTargets =
    stateFilter.length !== 0 && !stateFilter.includes("active")
      ? []
      : search === ""
        ? activeTargets
        : activeTargetKVSearch
            .filter(search, activeTargets)
            .map((value) => value.original);

  for (const target of filteredActiveTargets) {
    if (pools[target.scrapePool]) {
      pools[target.scrapePool].targets.push({
        discoveredLabels: target.discoveredLabels,
        labels: target.labels,
        isDropped: false,
      });
    }
  }

  for (const target of droppedTargets) {
    const pool = pools[target.scrapePool];
    if (!pool) continue;
    pool.total++;
  }

  const filteredDroppedTargets =
    stateFilter.length !== 0 && !stateFilter.includes("dropped")
      ? []
      : search === ""
        ? droppedTargets
        : droppedTargetKVSearch
            .filter(search, droppedTargets)
            .map((value) => value.original);

  for (const target of filteredDroppedTargets) {
    if (pools[target.scrapePool]) {
      pools[target.scrapePool].targets.push({
        discoveredLabels: target.discoveredLabels,
        isDropped: true,
        labels: {},
      });
    }
  }

  return pools;
};

type ScrapePoolListProp = {
  poolNames: string[];
  selectedPool: string | null;
  stateFilter: string[];
  searchFilter: string;
};

const ScrapePoolList: FC<ScrapePoolListProp> = ({
  poolNames,
  selectedPool,
  stateFilter,
  searchFilter,
}) => {
  const dispatch = useAppDispatch();
  const [showEmptyPools, setShowEmptyPools] = useLocalStorage<boolean>({
    key: "serviceDiscoveryPage.showEmptyPools",
    defaultValue: false,
  });

  const {
    data: { data: targetsData },
  } = useSuspenseAPIQuery<TargetsResult>({
    path: `/targets`,
    params: {
      scrapePool: selectedPool ?? "",
    },
  });

  const { collapsedPools } = useAppSelector(
    (state) => state.serviceDiscoveryPage
  );

  const [debouncedSearch] = useDebouncedValue<string>(searchFilter, 250);

  // authorization 
  const {
    allowedClusters,
    allowedTargets,
    notAuthorized,
  } = useAllowedScrapePools(targetsData.activeTargets);

  if (notAuthorized) {
    return (
      <Alert title="Access Denied" color="red" icon={<IconInfoCircle />}>
        You are not authorized to view any scrape pools.
      </Alert>
    );
  }

  const filteredTargetsData: TargetsResult = {
    ...targetsData,
    activeTargets: allowedTargets,
    droppedTargets: targetsData.droppedTargets.filter((t) =>
      allowedClusters.includes(t.scrapePool)
    ),
    droppedTargetCounts: Object.fromEntries(
      Object.entries(targetsData.droppedTargetCounts).filter(([pool]) =>
        allowedClusters.includes(pool)
      )
    ),
  };

  const effectivePools = selectedPool
    ? [selectedPool].filter((p) => allowedClusters.includes(p))
    : poolNames.filter((p) => allowedClusters.includes(p));

  const allPools = useMemo(
    () =>
      buildPoolsData(
        effectivePools,
        filteredTargetsData,
        debouncedSearch,
        stateFilter
      ),
    [effectivePools, filteredTargetsData, debouncedSearch, stateFilter]
  );

  const allPoolNames = Object.keys(allPools);
  const shownPoolNames = showEmptyPools
    ? allPoolNames
    : allPoolNames.filter((pn) => allPools[pn].targets.length > 0);

  return (
    <Stack>
      {allPoolNames.length === 0 ? (
        <Alert title="No scrape pools found" icon={<IconInfoCircle />}>
          No scrape pools found.
        </Alert>
      ) : (
        !showEmptyPools &&
        allPoolNames.length !== shownPoolNames.length && (
          <Alert
            title="Hiding pools with no matching targets"
            icon={<IconInfoCircle />}
          >
            Hiding {allPoolNames.length - shownPoolNames.length} empty pools.
            <Anchor ml="md" fz="1em" onClick={() => setShowEmptyPools(true)}>
              Show empty pools
            </Anchor>
          </Alert>
        )
      )}

      <Accordion
        multiple
        variant="separated"
        value={shownPoolNames.filter((p) => !collapsedPools.includes(p))}
        onChange={(value) =>
          dispatch(
            setCollapsedPools(
              shownPoolNames.filter((p) => !value.includes(p))
            )
          )
        }
      >
        {shownPoolNames.map((poolName) => {
          const pool = allPools[poolName];
          return (
            <Accordion.Item key={poolName} value={poolName}>
              <Accordion.Control>
                <Group wrap="nowrap" justify="space-between" mr="lg">
                  <Text>{poolName}</Text>
                  <Group gap="xs">
                    <Text c="gray.6">
                      {pool.active} / {pool.serverTotal}
                    </Text>
                    <RingProgress
                      size={25}
                      thickness={5}
                      sections={
                        pool.serverTotal === 0
                          ? []
                          : [
                              {
                                value: (pool.active / pool.serverTotal) * 100,
                                color: "green.4",
                              },
                              {
                                value:
                                  ((pool.serverTotal - pool.active) /
                                    pool.serverTotal) *
                                  100,
                                color: "blue.6",
                              },
                            ]
                      }
                    />
                  </Group>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                {pool.total !== pool.serverTotal && (
                  <Alert
                    title="Partial dropped targets"
                    icon={<IconInfoCircle />}
                    color="yellow"
                    mb="sm"
                  >
                    {pool.serverTotal - pool.total} dropped targets not shown
                    due to config limits.
                  </Alert>
                )}
                {pool.total === 0 ? (
                  <Alert title="No targets" icon={<IconInfoCircle />}>
                    No targets in this scrape pool.
                    <Anchor
                      ml="md"
                      fz="1em"
                      onClick={() => setShowEmptyPools(false)}
                    >
                      Hide empty pools
                    </Anchor>
                  </Alert>
                ) : pool.targets.length === 0 ? (
                  <Alert title="No matching targets" icon={<IconInfoCircle />}>
                    No targets match your filter criteria.
                    <Anchor
                      ml="md"
                      fz="1em"
                      onClick={() => setShowEmptyPools(false)}
                    >
                      Hide empty pools
                    </Anchor>
                  </Alert>
                ) : (
                  <CustomInfiniteScroll
                    allItems={pool.targets}
                    child={({ items }) => (
                      <Table>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th w="50%">Discovered labels</Table.Th>
                            <Table.Th w="50%">Target labels</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {items.map((target, i) => (
                            <Table.Tr key={i}>
                              <Table.Td py="lg" valign="top">
                                <LabelBadges
                                  labels={target.discoveredLabels}
                                  wrapper={Stack}
                                />
                              </Table.Td>
                              <Table.Td
                                py="lg"
                                valign={target.isDropped ? "middle" : "top"}
                              >
                                {target.isDropped ? (
                                  <Text c="blue.6" fw="bold">
                                    dropped due to relabeling rules
                                  </Text>
                                ) : (
                                  <LabelBadges
                                    labels={target.labels}
                                    wrapper={Stack}
                                  />
                                )}
                              </Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    )}
                  />
                )}
              </Accordion.Panel>
            </Accordion.Item>
          );
        })}
      </Accordion>
    </Stack>
  );
};

export default ScrapePoolList;
