import {
  ActionIcon,
  Box,
  Group,
  Select,
  Skeleton,
  TextInput,
} from "@mantine/core";
import {
  IconLayoutNavbarCollapse,
  IconLayoutNavbarExpand,
  IconSearch,
} from "@tabler/icons-react";
import { Suspense } from "react";
import { useAppDispatch, useAppSelector } from "../../state/hooks";

import {
  ArrayParam,
  StringParam,
  useQueryParam,
  withDefault,
} from "use-query-params";
import ErrorBoundary from "../../components/ErrorBoundary";
import ScrapePoolList from "./ServiceDiscoveryPoolsList";
import { useSuspenseAPIQuery } from "../../api/api";
import { TargetsResult } from "../../api/responseTypes/targets";
import {
  setCollapsedPools,
  setShowLimitAlert,
} from "../../state/serviceDiscoveryPageSlice";
import { StateMultiSelect } from "../../components/StateMultiSelect";
import badgeClasses from "../../Badge.module.css";
import { expandIconStyle, inputIconStyle } from "../../styles";

import { useAllowedScrapePools } from "../../hooks/useAllowedScrapePool";

export const targetPoolDisplayLimit = 20;

export default function ServiceDiscoveryPage() {
  const dispatch = useAppDispatch();

  const [scrapePool, setScrapePool] = useQueryParam("pool", StringParam);
  const [stateFilter, setStateFilter] = useQueryParam(
    "state",
    withDefault(ArrayParam, [])
  );
  const [searchFilter, setSearchFilter] = useQueryParam(
    "search",
    withDefault(StringParam, "")
  );

  const { collapsedPools, showLimitAlert } = useAppSelector(
    (state) => state.serviceDiscoveryPage
  );

  // Load all active targets
  const {
    data: {
      data: { activeTargets },
    },
  } = useSuspenseAPIQuery<TargetsResult>({
    path: `/targets`,
    params: { state: "active" },
  });

  // Filter allowed scrape pools based on role
  const {
    allowedClusters: filteredScrapePools,
  } = useAllowedScrapePools(activeTargets);

  const limited =
    filteredScrapePools.length > targetPoolDisplayLimit &&
    scrapePool === undefined;

  if (limited) {
    setScrapePool(filteredScrapePools[0]);
    dispatch(setShowLimitAlert(true));
  }

  return (
    <>
      <Group mb="md" mt="xs">
        <Select
          placeholder="Select scrape pool"
          data={[
            { label: "All pools", value: "" },
            ...filteredScrapePools.map((pool) => ({
              label: pool,
              value: pool,
            })),
          ]}
          value={(limited && filteredScrapePools[0]) || scrapePool || null}
          onChange={(value) => {
            setScrapePool(value);
            if (showLimitAlert) {
              dispatch(setShowLimitAlert(false));
            }
          }}
          searchable
        />
        <StateMultiSelect
          options={["active", "dropped"]}
          optionClass={(o) =>
            o === "active" ? badgeClasses.healthOk : badgeClasses.healthInfo
          }
          placeholder="Filter by state"
          values={(stateFilter?.filter((v) => v !== null) as string[]) || []}
          onChange={(values) => setStateFilter(values)}
        />
        <TextInput
          flex={1}
          leftSection={<IconSearch style={inputIconStyle} />}
          placeholder="Filter by labels"
          value={searchFilter || ""}
          onChange={(event) => setSearchFilter(event.currentTarget.value)}
        />
        <ActionIcon
          size="input-sm"
          title={
            collapsedPools.length > 0
              ? "Expand all pools"
              : "Collapse all pools"
          }
          variant="light"
          onClick={() =>
            dispatch(
              setCollapsedPools(
                collapsedPools.length > 0 ? [] : filteredScrapePools
              )
            )
          }
        >
          {collapsedPools.length > 0 ? (
            <IconLayoutNavbarExpand style={expandIconStyle} />
          ) : (
            <IconLayoutNavbarCollapse style={expandIconStyle} />
          )}
        </ActionIcon>
      </Group>

      <ErrorBoundary key={location.pathname} title="Error showing target pools">
        <Suspense
          fallback={
            <Box mt="lg">
              {Array.from(Array(10), (_, i) => (
                <Skeleton key={i} height={40} mb={15} width={1000} mx="auto" />
              ))}
            </Box>
          }
        >
          <ScrapePoolList
            poolNames={filteredScrapePools}
            selectedPool={(limited && filteredScrapePools[0]) || scrapePool || null}
            stateFilter={stateFilter as string[]}
            searchFilter={searchFilter}
          />
        </Suspense>
      </ErrorBoundary>
    </>
  );
}
