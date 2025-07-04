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
import { StateMultiSelect } from "../../components/StateMultiSelect";
import { Suspense } from "react";
import badgeClasses from "../../Badge.module.css";
import { useAppDispatch, useAppSelector } from "../../state/hooks";
import {
  setCollapsedPools,
  setShowLimitAlert,
} from "../../state/targetsPageSlice";
import {
  ArrayParam,
  StringParam,
  useQueryParam,
  withDefault,
} from "use-query-params";
import ErrorBoundary from "../../components/ErrorBoundary";
import ScrapePoolList from "./ScrapePoolsList";
import { useSuspenseAPIQuery } from "../../api/api";
import { TargetsResult } from "../../api/responseTypes/targets";
import { expandIconStyle, inputIconStyle } from "../../styles";
import { useDebouncedValue } from "@mantine/hooks";

// using auth hook here
import { useAllowedScrapePools } from "../../hooks/useAllowedScrapePool";

export const targetPoolDisplayLimit = 20;

const emptyHealthFilter: string[] = [];

export default function TargetsPage() {
  const dispatch = useAppDispatch();

  const [scrapePool, setScrapePool] = useQueryParam("pool", StringParam);
  const [healthFilter, setHealthFilter] = useQueryParam(
    "health",
    withDefault(ArrayParam, emptyHealthFilter)
  );
  const [searchFilter, setSearchFilter] = useQueryParam(
    "search",
    withDefault(StringParam, "")
  );
  const [debouncedSearch] = useDebouncedValue<string>(searchFilter.trim(), 250);

  const { collapsedPools, showLimitAlert } = useAppSelector(
    (state) => state.targetsPage
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

  // Role-based filtering of scrape pools 
  const {
    allowedClusters: filteredScrapePools,
    // using useAllowedScrapePools hook
  } = useAllowedScrapePools(activeTargets);

  const limited =
    filteredScrapePools.length > targetPoolDisplayLimit && scrapePool === undefined;
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
          options={["unknown", "up", "down"]}
          optionClass={(o) =>
            o === "unknown"
              ? badgeClasses.healthUnknown
              : o === "up"
              ? badgeClasses.healthOk
              : badgeClasses.healthErr
          }
          placeholder="Filter by target health"
          values={(healthFilter?.filter((v) => v !== null) as string[]) || []}
          onChange={(values) => setHealthFilter(values)}
        />
        <TextInput
          flex={1}
          leftSection={<IconSearch style={inputIconStyle} />}
          placeholder="Filter by endpoint or labels"
          value={searchFilter || ""}
          onChange={(event) =>
            setSearchFilter(event.currentTarget.value || null)
          }
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
            healthFilter={healthFilter as string[]}
            searchFilter={debouncedSearch}
          />
        </Suspense>
      </ErrorBoundary>
    </>
  );
}
