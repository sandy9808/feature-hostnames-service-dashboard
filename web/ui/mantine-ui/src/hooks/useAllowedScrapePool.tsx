// authorization hook function
import { useEffect, useState } from "react";
import keycloak from "../keycloak";
import { Target } from "../api/responseTypes/targets";


// function useAllowedScrapePools returns the list of targets which user is authorized to view.
export function useAllowedScrapePools(activeTargets: Target[]) {
  const [allowedClusters, setAllowedClusters] = useState<string[]>([]);
  const [allowedTargets, setAllowedTargets] = useState<Target[]>([]);
  const [notAuthorized, setNotAuthorized] = useState(false);

  useEffect(() => {
    const fetchRolesAndFilter = async () => {
      try {

        // console.log("running the useffect!!!!");
        const userId = keycloak?.tokenParsed?.sub;
        if (!userId) throw new Error("User ID not found in Keycloak token.");

        // Get admin token to query roles from the roopam tool
        const tokenRes = await fetch(
          `${import.meta.env.VITE_APP_ROLE_API}/api/v1/token`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              accept: "application/json",
            },
            body: JSON.stringify({ username: "abc@email.com", password: "abc" }),
          }
        );

        const { token } = await tokenRes.json();

        // Fetch roles for current user
        const res = await fetch(
          `${import.meta.env.VITE_APP_ROLE_API}/api/v1/getRoles/${userId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!res.ok) throw new Error(`Failed to fetch roles: ${res.status}`);

        const result = await res.json();

        if (!result) {
          setNotAuthorized(true);
          return;
        }

        // containes the roles for a  particular user.
        console.log(result);

        const roles = result.flatMap((entry: any) => entry.roles || []);
        const clusters = result.map((entry: any) => entry.name || "");


        // if the user has the role of SuperAdmincluster
        if (roles.includes("SuperAdminCluster") || roles.includes("SuperViewCluster")) {
          setAllowedTargets(activeTargets);
          setAllowedClusters(
            Array.from(
              new Set(activeTargets.map((t) => t.scrapePool))
            )
          );
          // filter the activetargets according to the roles
        } else {
          const filtered = activeTargets.filter((t) => {
            const jobLabel = t.labels["job"] || "";
            return clusters.some((cluster: string) =>
              jobLabel.startsWith(`${cluster}-`)
            );
          });

          setAllowedTargets(filtered);

          setAllowedClusters(
            Array.from(
              new Set(
                filtered.map((t) => t.scrapePool)
              )
            )
          );
        }
      } catch (err) {
        console.error(err);
        setAllowedClusters([]);
        setAllowedTargets([]);
      }
    };

    fetchRolesAndFilter();
  }, [JSON.stringify(activeTargets)]);

  return { allowedClusters, allowedTargets, notAuthorized };
}
