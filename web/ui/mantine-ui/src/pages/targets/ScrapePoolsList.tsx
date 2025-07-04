import {
  Alert,
  Badge,
  Group,
  Stack,
  Table,
  Tooltip,
  Anchor,
  Button,
  Card,
  Title,
  Center,
  Loader,
} from "@mantine/core";
import {
  IconHourglass,
  IconInfoCircle,
  IconRefresh,
} from "@tabler/icons-react";
import { useSuspenseAPIQuery } from "../../api/api";
import { Target, TargetsResult } from "../../api/responseTypes/targets";
import { FC, useMemo, useEffect, useState } from "react";
import { showNotification } from "@mantine/notifications";
import {
  humanizeDurationRelative,
  humanizeDuration,
  now,
} from "../../lib/formatTime";
import badgeClasses from "../../Badge.module.css";
import TargetLabels from "./TargetLabels";
import { badgeIconStyle } from "../../styles";
import keycloak from "../../keycloak";

type ScrapePool = {
  targets: Target[];
  count: number;
  upCount: number;
  downCount: number;
  unknownCount: number;
};

type ScrapePools = {
  [scrapePool: string]: ScrapePool;
};

const handleRequestError = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "An unknown error occurred";
};

const healthBadgeClass = (state: string) => {
  switch (state.toLowerCase()) {
    case "up":
      return badgeClasses.healthOk;
    case "down":
      return badgeClasses.healthErr;
    case "unknown":
      return badgeClasses.healthUnknown;
    default:
      return badgeClasses.healthWarn;
  }
};

const buildPoolsData = (
  poolNames: string[],
  targets: Target[],
  search: string,
  healthFilter: (string | null)[]
): ScrapePools => {
  const pools: ScrapePools = {};
  const trimmedSearch = search.trim().toLowerCase();

  for (const pn of poolNames) {
    pools[pn] = {
      targets: [],
      count: 0,
      upCount: 0,
      downCount: 0,
      unknownCount: 0,
    };
  }

  for (const target of targets) {
    if (!pools[target.scrapePool]) continue;

    pools[target.scrapePool].count++;

    switch (target.health.toLowerCase()) {
      case "up":
        pools[target.scrapePool].upCount++;
        break;
      case "down":
        pools[target.scrapePool].downCount++;
        break;
      case "unknown":
        pools[target.scrapePool].unknownCount++;
        break;
    }
  }

  const filteredTargets = targets.filter((target) => {
    const matchesSearch =
      trimmedSearch === "" ||
      Object.values(target.labels || {}).some((val) =>
        val.toLowerCase().includes(trimmedSearch)
      );
    const matchesHealth =
      healthFilter.length === 0 || healthFilter.includes(target.health);
    return matchesSearch && matchesHealth;
  });

  for (const target of filteredTargets) {
    if (pools[target.scrapePool]) {
      pools[target.scrapePool].targets.push(target);
    }
  }

  return pools;
};

type ScrapePoolListProp = {
  poolNames: string[];
  selectedPool: string | null;
  healthFilter: string[];
  searchFilter: string;
};

const ScrapePoolList: FC<ScrapePoolListProp> = ({
  poolNames,
  selectedPool,
  healthFilter,
  searchFilter,
}) => {
  const {
    data: {
      data: { activeTargets },
    },
  } = useSuspenseAPIQuery<TargetsResult>({
    path: `/targets`,
    params: {
      state: "active",
      scrapePool: selectedPool === null ? "" : selectedPool,
    },
  });

  const [allowedTargets, setAllowedTargets] = useState<Target[]>([]);
  const [notAuthorized, setNotAuthorized] = useState(false);

  // used for waiting until the allowedtargets variable 
  const [loading, setLoading] = useState(true);

  async function getToken(username: string, password: string): Promise<string> {
    const response = await fetch(
      `${import.meta.env.VITE_APP_ROLE_API}/api/v1/token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({ username, password }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to get token");
    }

    const data = await response.json();
    return data.token;
  }


  useEffect(() => {
    const fetchRolesAndFilter = async () => {
      setLoading(true);
      try {
        const userId = keycloak?.tokenParsed?.sub;
        if (!userId) throw new Error("User ID not found in Keycloak token.");

        const token = await getToken("abc@email.com", "abc");

        const res = await fetch(
          `${import.meta.env.VITE_APP_ROLE_API}/api/v1/getRoles/${userId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!res.ok) throw new Error(`Failed to fetch roles: ${res.status}`);

        const result = await res.json();
        if (!result) {
          setNotAuthorized(true);
          return;
        }

        const roles = result.flatMap((entry: any) => entry.roles || []);
        const clusters = result.map((entry: any) => entry.name || "");

        if (
          roles.includes("SuperAdminCluster") ||
          roles.includes("SuperViewCluster")
        ) {
          setAllowedTargets(activeTargets);
        } else {
          const filtered = activeTargets.filter((t) => {
            const jobLabel = t.labels["job"] || "";
            return clusters.some((cluster: string) =>
              jobLabel.startsWith(`${cluster}-`)
            );
          });
          setAllowedTargets(filtered);
        }
      } catch (error) {
        showNotification({
          title: "Error",
          message: handleRequestError(error),
          color: "red",
        });
        setAllowedTargets([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRolesAndFilter();
  }, [JSON.stringify(activeTargets)]);

  const allPools = useMemo(
    () =>
      buildPoolsData(
        selectedPool ? [selectedPool] : poolNames,
        allowedTargets,
        searchFilter,
        healthFilter
      ),
    [selectedPool, poolNames, allowedTargets, searchFilter, healthFilter]
  );

  const TotalCount = Object.values(allPools).reduce(
    (acc, pool) => acc + pool.count,
    0
  );
  const upCount = Object.values(allPools).reduce(
    (acc, pool) => acc + pool.upCount,
    0
  );
  const downCount = Object.values(allPools).reduce(
    (acc, pool) => acc + pool.downCount,
    0
  );

  return (
    <Stack>
      <Card withBorder padding="md" radius="md">
        <Group justify="space-between">
          <Title order={5}>Summary</Title>
          <Group gap="md">
            <Badge color="blue">TOTAL: {TotalCount}</Badge>
            <Badge color="green">UP: {upCount}</Badge>
            <Badge color="red">DOWN: {downCount}</Badge>
          </Group>
        </Group>
      </Card>

        {/* // loading screen logic */}
      {loading ? (
        <Center>
          <Loader size="md" />
        </Center>
      ) : notAuthorized ? (
        <Alert title="Access Denied" icon={<IconInfoCircle />} color="red">
          Not authorized to view the services.
        </Alert>
      ) : allowedTargets.length === 0 ? (
        <></>
      ) : (Object.values(allPools) as ScrapePool[]).every(
          (pool) => pool.targets.length === 0
        ) ? (
        <Alert title="No targets" icon={<IconInfoCircle />}>
          No active targets found.
        </Alert>
      ) : (
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th w="10%">Endpoint</Table.Th>
              <Table.Th w="10%">Summary</Table.Th>
              <Table.Th>Labels</Table.Th>
              <Table.Th w={230}>Last scrape</Table.Th>
              <Table.Th w={100}>State</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(Object.values(allPools) as ScrapePool[]).flatMap((pool) =>
              pool.targets.map((target, i) => {
                const clusterName = target.labels["job"] || "N/A";
                // console.log(clusterName)
                // let targetUrl = target.scrapeUrl;
                // try {
                //   const parsedUrl = new URL(targetUrl);
                //   targetUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;
                // } catch {
                //   targetUrl = "#";
                // }

                return (
                  <Table.Tr key={i}>
                    <Table.Td valign="top">
                    <Anchor
                    size="sm"
                    href={
                      target.labels["instance"]?.startsWith("console-openshift")
                        ? `https://${target.labels["instance"]}`
                        : target.labels["instance"] || "#"
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    >
                      {clusterName}
                    </Anchor>
                    </Table.Td>
                    <Table.Td valign="top">
                      <Button
                        size="xs"
                        variant="light"
                        onClick={async () => {
                          const reportURL = `${import.meta.env.VITE_VIEW_URL}/openshift/cluster/name/${clusterName}/report`;
                          // console.log("The view URL : ",reportURL);
                          try {
                            const response = await fetch(reportURL);
                            if (!response.ok) {
                              throw new Error(
                                `Failed to fetch data: ${response.status}`
                              );
                            }

                            const html = await response.text();
                            const blob = new Blob([html], { type: "text/html" });
                            const url = window.URL.createObjectURL(blob);
                            const link = document.createElement("a");
                            link.href = url;
                            link.target = "_blank";
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          } catch (error) {
                            showNotification({
                              title: "Error",
                              message: "Failed to fetch cluster report.",
                              color: "red",
                            });
                          }
                        }}
                      >
                        view
                      </Button>
                    </Table.Td>

                    <Table.Td valign="top">
                      <TargetLabels
                        labels={target.labels}
                        discoveredLabels={target.discoveredLabels}
                      />
                    </Table.Td>
                    <Table.Td valign="top">
                      <Group gap="xs" wrap="wrap">
                        <Tooltip label="Last target scrape" withArrow>
                          <Badge
                            variant="light"
                            className={badgeClasses.statsBadge}
                            styles={{ label: { textTransform: "none" } }}
                            leftSection={<IconRefresh style={badgeIconStyle} />}
                          >
                            {humanizeDurationRelative(
                              target.lastScrape,
                              now()
                            )}
                          </Badge>
                        </Tooltip>
                        <Tooltip
                          label="Duration of last target scrape"
                          withArrow
                        >
                          <Badge
                            variant="light"
                            className={badgeClasses.statsBadge}
                            styles={{ label: { textTransform: "none" } }}
                            leftSection={
                              <IconHourglass style={badgeIconStyle} />
                            }
                          >
                            {humanizeDuration(
                              target.lastScrapeDuration * 1000
                            )}
                          </Badge>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                    <Table.Td valign="top">
                      <Badge className={healthBadgeClass(target.health)}>
                        {target.health}
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                );
              })
            )}
          </Table.Tbody>
        </Table>
      )}
    </Stack>
  );
};

export default ScrapePoolList;
