import { Container, Tab, Tabs } from "react-bootstrap";
import SettingsTeamTab from "../components/Settings/SettingsTeamTab";
import SettingsUsersTab from "../components/Settings/SettingsUsersTab";

function Settings() {
  return (
    <Container>
      <Tabs defaultActiveKey="users" className="mb-3">
        <Tab eventKey="users" title="Users">
          <SettingsUsersTab />
        </Tab>
        <Tab eventKey="teams" title="Teams">
          <SettingsTeamTab />
        </Tab>
      </Tabs>
    </Container>
  );
}

export default Settings;