import { useEffect, useState } from "react";
import { Button, Container, Form, Modal, Tab, Tabs } from "react-bootstrap";
import DataTable from "react-data-table-component";
import SettingsTeamTab from "../components/SettingsTeamTab";
import { getUsersFromStore, setUsersInStore } from "../services/utils";

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
  const [originalUsers, setOriginalUsers] = useState([]);
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);

  useEffect(() => {
    const loadUsers = async () => {
      const storedUsers = await getUsersFromStore()
      if (storedUsers && storedUsers.length > 0) {
        setUsers(storedUsers);
        setOriginalUsers(storedUsers);
      }
    };
    loadUsers();
  }, []);

  const handleDeleteUser = async (user) => {
    const updatedUsers = users.filter((u) => u.username !== user.username);
    setUsers(updatedUsers);
    setOriginalUsers(updatedUsers);

    await setUsersInStore(updatedUsers);
    setShowDeleteModal(false);
    setSelectedUser(null);
  };

  const handleDeleteAllUsers = async () => {
    setUsers([]);
    setOriginalUsers([]);
    await setUsersInStore([]);
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
          const updatedUsers = [...users, ...uploadedUsers].filter((user, index, self) =>
            index === self.findIndex((u) => u.email === user.email)
          ).map((u, index) => {
            const id = `${Date.now()}_${index}`;
            return {
              ...u,
              id
            }
          });
          await setUsersInStore(updatedUsers)
          setUsers(updatedUsers);
          setOriginalUsers(updatedUsers);
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
    setOriginalUsers(updatedUsers);
    await setUsersInStore(updatedUsers)
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
              const searchTerm = e.target.value.toLowerCase();
              const filteredUsers = originalUsers.filter(user =>
                user.name.toLowerCase().includes(searchTerm) ||
                user.username.toLowerCase().includes(searchTerm) ||
                user.email.toLowerCase().includes(searchTerm)
              );
              setUsers(filteredUsers);
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



function Settings() {
  return (
    <Container>
      <h2 className="mb-4">Settings</h2>
      <Tabs defaultActiveKey="users" className="mb-3">
        <Tab eventKey="users" title="Users">
          <UsersTab />
        </Tab>
        <Tab eventKey="teams" title="Teams">
          <SettingsTeamTab />
        </Tab>
      </Tabs>
    </Container>
  );
}

export default Settings;