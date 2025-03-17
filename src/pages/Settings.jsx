import { useState, useEffect } from "react";
import { Container, Tab, Tabs } from "react-bootstrap";
import DataTable from "react-data-table-component";
import { Button, Modal, Form } from "react-bootstrap";
import db, { STORES, teamsStore, userStore } from "../services/idb";

function UserForm({ user, onSubmit, onClose }) {
  const [formData, setFormData] = useState({
    name: user?.name || "",
    username: user?.username || "",
    email: user?.email || "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Form.Group className="mb-3">
        <Form.Label>Name</Form.Label>
        <Form.Control
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label>GitHub Username</Form.Label>
        <Form.Control
          type="text"
          value={formData.username}
          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          required
        />
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label>Email</Form.Label>
        <Form.Control
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />
      </Form.Group>

      <div className="d-flex justify-content-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" type="submit">
          Save
        </Button>
      </div>
    </Form>
  );
}

function UsersTab() {
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);

  useEffect(() => {
    const loadUsers = async () => {
      const storedUsers = await userStore.getData('usersList')
      if (storedUsers) {
        setUsers(storedUsers);
      }
    };
    loadUsers();
  }, []);

  const handleDeleteUser = async (user) => {
    const updatedUsers = users.filter((u) => u.username !== user.username);
    setUsers(updatedUsers);
    await userStore.setData("usersList", updatedUsers);
    setShowDeleteModal(false);
    setSelectedUser(null);
  };

  const handleDeleteAllUsers = async () => {
    setUsers([]);
    await userStore.setData("usersList", []);
    setShowDeleteAllModal(false);
  };

  const columns = [
    {
      name: "Name",
      selector: (row) => row.name,
      sortable: true,
    },
    {
      name: "GitHub Username",
      selector: (row) => row.username,
      sortable: true,
    },
    {
      name: "Email",
      selector: (row) => row.email,
      sortable: true,
    },
    {
      name: "Actions",
      cell: (row) => (
        <div className="d-flex gap-2">
          <Button
            size="sm"
            variant="light"
            onClick={() => {
              setSelectedUser(row);
              setShowModal(true);
            }}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => {
              setSelectedUser(row);
              setShowDeleteModal(true);
            }}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const uploadedUsers = JSON.parse(e.target.result);
          const updatedUsers = [...users, ...uploadedUsers];
          await userStore.setData("usersList", updatedUsers);
          setUsers(updatedUsers);
        } catch (error) {
          console.error("Error parsing JSON:", error);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleUserSubmit = async (userData) => {
    const updatedUsers = selectedUser
      ? users.map((u) => (u.username === selectedUser.username ? userData : u))
      : [...users, userData];

    setUsers(updatedUsers);
    await userStore.setData("usersList", updatedUsers);
    setShowModal(false);
    setSelectedUser(null);
  };

  return (
    <div className="mt-4">
      <div className="d-flex justify-content-between mb-4">
        <Button
          variant="danger"
          onClick={() => setShowDeleteAllModal(true)}
          disabled={users.length === 0}
        >
          Delete All Users
        </Button>
        <div className="d-flex gap-3">
          <div>
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              style={{ display: "none" }}
              id="fileUpload"
            />
            <label htmlFor="fileUpload" className="btn btn-outline-primary">
              Upload Users
            </label>
          </div>
          <Button onClick={() => setShowModal(true)}>Add User</Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={users}
        pagination
        highlightOnHover
        searchable
        subHeader
        subHeaderComponent={
          <input
            type="text"
            placeholder="Search users..."
            className="form-control w-25"
            onChange={(e) => {
              // Implement search functionality
            }}
          />
        }
      />

      <Modal show={showModal} onHide={() => {
        setShowModal(false);
        setSelectedUser(null);
      }}>
        <Modal.Header closeButton>
          <Modal.Title>{selectedUser ? "Edit User" : "Add User"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <UserForm
            user={selectedUser}
            onSubmit={handleUserSubmit}
            onClose={() => {
              setShowModal(false);
              setSelectedUser(null);
            }}
          />
        </Modal.Body>
      </Modal>

      <Modal show={showDeleteModal} onHide={() => {
        setShowDeleteModal(false);
        setSelectedUser(null);
      }}>
        <Modal.Header closeButton>
          <Modal.Title>Delete User</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete user {selectedUser?.name}?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => {
            setShowDeleteModal(false);
            setSelectedUser(null);
          }}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => handleDeleteUser(selectedUser)}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showDeleteAllModal} onHide={() => setShowDeleteAllModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Delete All Users</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete all users? This action cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteAllModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteAllUsers}>
            Delete All
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

function TeamsTab() {
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    const loadTeams = async () => {
      const storedTeams = await teamsStore.getData("teamsList");
      if (storedTeams) {
        setTeams(storedTeams);
      }
    };
    loadTeams();
  }, []);
  const [showModal, setShowModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamName, setTeamName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);

  const handleCreateTeam = async () => {
    const updatedTeams = selectedTeam
      ? teams.map((t) =>
        t.name === selectedTeam.name
          ? { name: teamName, users: selectedUsers }
          : t
      )
      : [...teams, { name: teamName, users: selectedUsers }];

    setTeams(updatedTeams);
    await teamsStore.setData("teamsList", updatedTeams);
    setShowModal(false);
    setSelectedTeam(null);
    setTeamName("");
    setSelectedUsers([]);
  };

  return (
    <div className="mt-4">
      <div className="mb-4">
        <Button onClick={() => setShowModal(true)}>Create Team</Button>
      </div>

      <div className="teams-list">
        {teams.map((team, index) => (
          <div key={index} className="card mb-3">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="card-title">{team.name}</h5>
                <Button
                  variant="light"
                  size="sm"
                  onClick={() => {
                    setSelectedTeam(team);
                    setTeamName(team.name);
                    setSelectedUsers(team.users);
                    setShowModal(true);
                  }}
                >
                  Edit
                </Button>
              </div>
              <p className="card-text">
                {team.users.length} members
              </p>
            </div>
          </div>
        ))}
      </div>

      <Modal show={showModal} onHide={() => {
        setShowModal(false);
        setSelectedTeam(null);
        setTeamName("");
        setSelectedUsers([]);
      }}>
        <Modal.Header closeButton>
          <Modal.Title>{selectedTeam ? "Edit Team" : "Create Team"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Team Name</Form.Label>
              <Form.Control
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Select Users</Form.Label>
              {/* Implement user search and multi-select */}
            </Form.Group>

            <div className="d-flex justify-content-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowModal(false);
                  setSelectedTeam(null);
                  setTeamName("");
                  setSelectedUsers([]);
                }}
              >
                Cancel
              </Button>
              <Button variant="primary" onClick={handleCreateTeam}>
                {selectedTeam ? "Update" : "Create"}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
}

function Settings() {
  return (
    <Container>
      <h2 className="mb-4">Settings</h2>
      <Tabs defaultActiveKey="users" className="mb-3">
        <Tab eventKey="users" title="Users">
          <UsersTab />
        </Tab>
        <Tab eventKey="teams" title="Teams">
          <TeamsTab />
        </Tab>
      </Tabs>
    </Container>
  );
}

export default Settings;