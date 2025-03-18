import { useState, useEffect } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import DataTable from "react-data-table-component";
import { getTeamsFromStore, getUsersFromStore, setTeamsInStore, setUsersInStore } from "../../services/utils";


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


function SettingsUsersTab() {
    const [originalUsers, setOriginalUsers] = useState([]);
    const [users, setUsers] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
    const [showTeamModal, setShowTeamModal] = useState(false);
    const [availableTeams, setAvailableTeams] = useState([]);
    const [selectedTeams, setSelectedTeams] = useState([]);
    const [teamSearchValue, setTeamSearchValue] = useState('');
    const [filteredTeams, setFilteredTeams] = useState([]);

    useEffect(() => {
        const loadUsers = async () => {
            const storedUsers = await getUsersFromStore()
            const teams = await getTeamsFromStore();

            for (const user of storedUsers) {
                const userTeams = teams.filter(team => {
                    return !!team.users.find(u => u.username === user.username)
                })
                user.teams = userTeams;
            }

            if (storedUsers && storedUsers.length > 0) {
                setUsers(storedUsers);
                setOriginalUsers(storedUsers);
            }
        };
        loadUsers();
    }, []);

    useEffect(() => {
        const loadTeams = async () => {
            const teams = await getTeamsFromStore();
            setAvailableTeams(teams || []);
            setFilteredTeams(teams || []);
        };
        loadTeams();
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

    const handleTeamSearch = (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filtered = availableTeams.filter(team =>
            team.name.toLowerCase().includes(searchTerm)
        );
        setFilteredTeams(filtered);
        setTeamSearchValue(searchTerm);
    };

    const handleTeamSelect = (team) => {
        setSelectedTeams(prev => {
            if (prev.find(t => t.id === team.id)) {
                return prev.filter(t => t.id !== team.id);
            }
            return [...prev, team];
        });
    };

    const handleTeamAssignment = async () => {
        const updatedTeams = availableTeams.map(team => ({
            ...team,
            users: team.users.filter(u => u.username !== selectedUser.username)
        }));

        selectedTeams.forEach(team => {
            const teamToUpdate = updatedTeams.find(t => t.id === team.id);
            if (teamToUpdate && !teamToUpdate.users.find(u => u.username === selectedUser.username)) {
                teamToUpdate.users.push(selectedUser);
            }
        });

        await setTeamsInStore(updatedTeams);
        setAvailableTeams(updatedTeams);
        setShowTeamModal(false);
        setSelectedUser(null);
        setSelectedTeams([]);

        // Refresh users to show updated team assignments
        const storedUsers = await getUsersFromStore();
        setUsers(storedUsers);
        setOriginalUsers(storedUsers);
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
            name: "Teams",
            selector: (row) => row.teams?.map(t => t.name).join(", ") || "-",
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
                        variant="primary"
                        onClick={() => {
                            setSelectedUser(row);
                            const userTeams = availableTeams.filter(team =>
                                team.users.some(u => u.username === row.username)
                            );
                            setSelectedTeams(userTeams);
                            setShowTeamModal(true);
                        }}
                    >
                        Teams
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
            <div className="d-flex justify-content-between align-items-center mb-4">
                <input
                    type="text"
                    placeholder="Search users..."
                    className="form-control w-25"
                    onChange={(e) => {
                        const searchTerm = e.target.value.toLowerCase();
                        const filteredUsers = originalUsers.filter(user =>
                            user.name.toLowerCase().includes(searchTerm) ||
                            user.username.toLowerCase().includes(searchTerm) ||
                            user.email.toLowerCase().includes(searchTerm) ||
                            user.teams?.map(t => t.name).some(t => t.toLowerCase().includes(searchTerm))
                        );
                        setUsers(filteredUsers);
                    }}
                />
                <div className="d-flex gap-2">
                    <Button onClick={() => setShowModal(true)}>Add User</Button>
                    <div>
                        <input
                            type="file"
                            accept=".json"
                            onChange={handleFileUpload}
                            style={{ display: "none" }}
                            id="fileUpload"
                        />
                        <label htmlFor="fileUpload" className="btn btn-outline-primary mb-0">
                            Upload Users
                        </label>
                    </div>
                    <Button
                        variant="danger"
                        onClick={() => setShowDeleteAllModal(true)}
                        disabled={users.length === 0}
                    >
                        Delete All Users
                    </Button>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={users}
                pagination
                highlightOnHover
                searchable
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

            <Modal show={showTeamModal} onHide={() => {
                setShowTeamModal(false);
                setSelectedUser(null);
                setSelectedTeams([]);
                setTeamSearchValue('');
            }}>
                <Modal.Header closeButton>
                    <Modal.Title>Assign Teams - {selectedUser?.name}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Search Teams</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Search teams..."
                                onChange={handleTeamSearch}
                                value={teamSearchValue}
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Available Teams</Form.Label>
                            <div className="user-list mt-2" style={{ border: '1px solid lightgray', borderRadius: '4px', padding: '10px', maxHeight: '200px', overflowY: 'auto' }}>
                                {filteredTeams.map(team => (
                                    <Form.Check
                                        key={team.id}
                                        type="checkbox"
                                        label={team.name}
                                        checked={selectedTeams.some(t => t.id === team.id)}
                                        onChange={() => handleTeamSelect(team)}
                                    />
                                ))}
                            </div>
                        </Form.Group>

                        <div className="d-flex justify-content-end gap-2">
                            <Button variant="secondary" onClick={() => {
                                setShowTeamModal(false);
                                setSelectedUser(null);
                                setSelectedTeams([]);
                            }}>
                                Cancel
                            </Button>
                            <Button variant="primary" onClick={handleTeamAssignment}>
                                Save
                            </Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>
        </div>
    );
}

export default SettingsUsersTab;