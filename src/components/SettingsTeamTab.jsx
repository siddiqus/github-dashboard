import { useEffect, useState } from "react";
import { Button, Form, Modal } from "react-bootstrap";
import { getTeamsFromStore, getUsersFromStore, setTeamsInStore } from "../services/utils";

function SettingsTeamTab() {
    const [teams, setTeams] = useState([]);
    const [users, setUsers] = useState([]); // State to hold all users
    const [filteredUsers, setFilteredUsers] = useState([]); // State to hold filtered users

    useEffect(() => {
        const loadTeams = async () => {
            const storedTeams = await getTeamsFromStore();
            if (storedTeams) {
                setTeams(storedTeams);
            }
        };
        loadTeams();
    }, []);

    useEffect(() => {
        const loadUsers = async () => {
            const storedUsers = await getUsersFromStore();
            if (storedUsers) {
                setUsers(storedUsers);
                setFilteredUsers(storedUsers);
            }
        };
        loadUsers();
    }, []);

    const [showModal, setShowModal] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [teamName, setTeamName] = useState("");
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [searchValue, setSearchValue] = useState('');

    const handleCreateTeam = async () => {
        if (!teamName.trim() || selectedUsers.length === 0) {
            alert("Team name and at least one user selection are mandatory.");
            return;
        }
        if (teams.some(team => team.name.toLowerCase() === teamName.trim().toLowerCase() && (!selectedTeam || selectedTeam.name.toLowerCase() !== teamName.trim().toLowerCase()))) {
            alert("A team with the same name already exists.");
            return;
        }
        const id = Date.now();
        const newTeam = { id, name: teamName, users: selectedUsers }
        const updatedTeams = selectedTeam
            ? teams.map((t) =>
                t.name === selectedTeam.name
                    ? newTeam
                    : t
            )
            : [...teams, newTeam];

        setTeams(updatedTeams);
        await setTeamsInStore(updatedTeams);
        setShowModal(false);
        setSelectedTeam(null);
        setTeamName("");
        setSelectedUsers([]);
    };

    const handleUserSearch = (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filtered = users.filter(user => user.name.toLowerCase().includes(searchTerm));
        setFilteredUsers(filtered);
        setSearchValue(searchTerm);
    };

    const handleUserSelect = (user) => {
        if (selectedUsers.find(u => u.id === user.id)) {
            return;
        }
        setSelectedUsers(prevSelected => {
            if (prevSelected.includes(user)) {
                return prevSelected.filter(u => u !== user);
            } else {
                return [...prevSelected, user];
            }
        });
        setFilteredUsers(users);
        setSearchValue('');
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
                                {team.users.map(u => `${u.name} (${u.username})`).join(', ')}
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
                            <Form.Control
                                type="text"
                                placeholder="Search users..."
                                onChange={handleUserSearch}
                                value={searchValue}
                            />
                            <div className="user-list mt-2" style={{ border: '1px solid lightgray', padding: '10px', maxHeight: '200px', overflowY: 'auto' }}>
                                {filteredUsers
                                    .filter(user => !selectedUsers.includes(user))
                                    .map(user => (
                                        <div
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#eaeaea'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                            style={{ cursor: 'pointer', borderBottom: '1px solid lightgray', padding: '10px' }} key={user.id} onClick={() => handleUserSelect(user)}>
                                            {user.name}
                                        </div>
                                    ))}
                            </div>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label><b>Selected Users</b></Form.Label>
                            <div className="selected-user-list mt-2" style={{ paddingLeft: '20px', paddingRight: '20px', maxHeight: '200px', overflowY: 'auto' }}>
                                {selectedUsers.map(user => (
                                    <Form.Check
                                        key={user.id}
                                        type="checkbox"
                                        label={user.name}
                                        checked={true}
                                        onChange={() => handleUserSelect(user)}
                                    />
                                ))}
                            </div>
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
                            <Button variant="primary" onClick={handleCreateTeam} disabled={!teamName.trim() || selectedUsers.length === 0}>
                                {selectedTeam ? "Update" : "Create"}
                            </Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>
        </div>
    );
}
export default SettingsTeamTab