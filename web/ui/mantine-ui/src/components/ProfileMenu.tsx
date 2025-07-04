// import React from "react";
import { Menu, Avatar, Text, Group } from "@mantine/core";
import { IconLogout, IconUserCircle } from "@tabler/icons-react";
import { useKeycloak } from "@react-keycloak/web";

const ProfileMenu = () => {
  const { keycloak } = useKeycloak();

  if (!keycloak.authenticated || !keycloak.tokenParsed) {
    return null;
  }

  const username = keycloak.tokenParsed.preferred_username || "User";
  const fullName =
    keycloak.tokenParsed.name || keycloak.tokenParsed.given_name || username;

  const handleLogout = () => {
    keycloak.logout({
      redirectUri: window.location.origin,
    });
  };

  return (
    <Menu shadow="md" width={200} position="bottom-end">
      <Menu.Target>
        <Avatar
          radius="xl"
          size="md"
          color="blue"
          style={{ cursor: "pointer" }}
        >
          {fullName[0].toUpperCase()}
        </Avatar>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>Signed in as</Menu.Label>
        <Menu.Item disabled>
          <Group gap="xs">
            <IconUserCircle size={16} />
            <Text size="sm">{fullName}</Text>
          </Group>
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item leftSection={<IconLogout size={16} />} onClick={handleLogout}>
          Sign Out
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};

export default ProfileMenu;
