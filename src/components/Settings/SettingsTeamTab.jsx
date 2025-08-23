import { useEffect, useState } from "react";
import { Button, Form, Modal } from "react-bootstrap";
import { getTeamsFromStore, getUsersFromStore, setTeamsInStore } from "../../services/utils";

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
        setSelectedUsers(prevSelected => {
            const isUserSelected = prevSelected.some(u => u.id === user.id);
            if (isUserSelected) {
                return prevSelected.filter(u => u.id !== user.id);
            } else {
                return [...prevSelected, user];
            }
        });
        setFilteredUsers(users);
        setSearchValue('');
    };

    const handleDeleteTeam = async (teamToDelete) => {
        const updatedTeams = teams.filter(team => team.id !== teamToDelete.id);
        setTeams(updatedTeams);
        await setTeamsInStore(updatedTeams);
    };

    const handleUploadJson = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const json = JSON.parse(e.target.result);
                const newTeams = json.map((team, index) => {
                    const teamUsers = team.users.map(email => users.find(user => user.email.toLowerCase() === email.toLowerCase())).filter(Boolean);
                    return { id: `${Date.now()}_${index}`, name: team.name, users: teamUsers };
                });

                const allTeams = [...teams, ...newTeams];

                const uniqueTeams = allTeams.filter(newTeam => !teams.some(existingTeam => existingTeam.name.toLowerCase() === newTeam.name.toLowerCase()));
                if (uniqueTeams.length !== allTeams.length) {
                    alert("Some teams were not added because they have duplicate names.");
                }

                setTeams(uniqueTeams);
                await setTeamsInStore(uniqueTeams);
            } catch (error) {
                alert("Invalid JSON format.");
            }
        };
        reader.readAsText(file);
    };

    const handleDeleteAllTeams = async () => {
        if (window.confirm("Are you sure you want to delete all teams?")) {
            setTeams([]);
            await setTeamsInStore([]);
        }
    };

    const handleExportJson = () => {
        const exportData = teams.map(team => ({
            name: team.name,
            users: team.users.map(user => user.email.toLowerCase())
        }));
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'teams.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="mt-4">
            <div className="mb-4">
                <Button onClick={() => setShowModal(true)}>Create Team</Button>
                <input type="file" accept=".json" onChange={handleUploadJson} style={{ display: 'none' }} id="upload-json" />
                <Button variant="secondary" onClick={() => document.getElementById('upload-json').click()} className="ms-2">Upload JSON</Button>
                <Button variant="outline-secondary" onClick={handleExportJson} className="ms-2">Export JSON</Button>
                {
                    teams.length > 0 && (<Button variant="danger" onClick={handleDeleteAllTeams} className="ms-2">Delete All Teams</Button>)
                }
            </div>

            <div className="teams-list">
                {teams.map((team, index) => (
                    <div key={index} className="card mb-3">
                        <div className="card-body">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h5 className="card-title m-0">{team.name}</h5>
                                <div>
                                    <Button
                                        variant="outline-primary"
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
                                    <Button
                                        variant="outline-danger"
                                        size="sm"
                                        className="ms-2"
                                        onClick={() => handleDeleteTeam(team)}
                                    >
                                        Delete
                                    </Button>
                                </div>
                            </div>
                            <div className="user-chips">
                                {team.users.map(user => (
                                    <span key={user.id} className="badge bg-light text-dark me-2 mb-2"
                                        style={{
                                            padding: '8px 12px',
                                            borderRadius: '20px',
                                            border: '1px solid #dee2e6',
                                            fontSize: '0.9em'
                                        }}>
                                        {user.name}
                                        <span className="text-muted ms-1" style={{ fontSize: '0.9em' }}>
                                            @{user.username}
                                        </span>
                                    </span>
                                ))}
                            </div>
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
                                    .filter(user => !selectedUsers.find(u => u.email.toLowerCase() === user.email.toLowerCase()))
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
            <p>&nbsp;</p>
        </div>
    );
}
export default SettingsTeamTab