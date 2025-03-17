import { useEffect, useState } from "react";
import { Alert, Button, Col, Form, Row, Dropdown } from "react-bootstrap";
import ReactDatePicker from "react-datepicker";
import { TEAM_MEMBERS } from "../../constants";
import { resetUserDataCache } from "../../services/index";
import { formatDate, getUsersFromStore } from "../../services/utils";

import "./UserPicker.css";
import { dbStore } from "../../services/idb";

function getDefaultDates() {
  const startDateFromStorage = localStorage.getItem("opti-gh-startDate");
  const endDateFromStorage = localStorage.getItem("opti-gh-endDate");

  const defaultEndDate = endDateFromStorage
    ? new Date(endDateFromStorage)
    : new Date();

  const sixMonthsInMs = 6 * 30 * 24 * 60 * 60 * 1000;
  const defaultStartDate = startDateFromStorage
    ? new Date(startDateFromStorage)
    : new Date(defaultEndDate.getTime() - sixMonthsInMs).setDate(1);

  return {
    defaultStartDate: new Date(defaultStartDate),
    defaultEndDate: new Date(defaultEndDate),
  };
}

function TeamModeSelectionDropdown({ chooseUsers }) {
  const [selected, setSelected] = useState();
  const teams = Object.keys(TEAM_MEMBERS);
  return (
    <Dropdown
      onSelect={(e) => {
        if (e === "manual") {
          setSelected("Choose manually");
          chooseUsers([]);
        } else {
          chooseUsers(TEAM_MEMBERS[e]);
          setSelected(e);
        }
      }}
    >
      <Dropdown.Toggle>{selected || "Select team"} </Dropdown.Toggle>

      <Dropdown.Menu>
        {teams.sort().map((t, index) => (
          <Dropdown.Item eventKey={t} key={index}>
            {t}
          </Dropdown.Item>
        ))}
        <Dropdown.Item eventKey={"manual"}>Choose manually</Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  );
}

function UserPicker({ onSubmit, onReset }) {
  const [usernames, setUsernames] = useState([]);
  const [userList, setUserList] = useState([]);

  useEffect(() => {
    if (!usernames.length) {
      dbStore.getData("opti-gh-userlist").then((d) => setUsernames(d || []));
    }

    getUsersFromStore().then((users) => {
      setUserList(users);
    });
  }, []);

  const { defaultStartDate, defaultEndDate } = getDefaultDates();

  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);

  const [isLoading, setIsLoading] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  function setNewValueInUsernamesInputList(e) {
    const value = e.target.value;

    if (!value.trim()) return;

    let newNames;

    const selectedTeam = Object.keys(TEAM_MEMBERS).find((v) => v === value);

    if (selectedTeam) {
      newNames = TEAM_MEMBERS[selectedTeam] || [];
    } else {
      newNames = value.split(",").map((v) => v.trim());
    }

    const names = Array.from(new Set([...usernames, ...newNames]));
    dbStore.setData("opti-gh-userlist", names);

    setUsernames(names);
    e.target.value = "";
  }

  function handleKeyDown(e) {
    if (e.key !== "Enter") return;
    setNewValueInUsernamesInputList(e);
  }

  function removeTag(index) {
    const newUsernames = usernames.filter((el, i) => i !== index);
    setUsernames(newUsernames);
    dbStore.setData("opti-gh-userlist", newUsernames);
  }

  function handleUserPicketInputChange(event) {
    if (!event.target.value && ["Backspace", "Delete"].includes(event.key)) {
      setUsernames([...usernames.slice(0, -1)]);
      return;
    }
  }

  function clearUsernames() {
    setUsernames([]);
  }

  async function handleSubmit() {
    setErrorMessage("");

    if (!startDate || !endDate || !usernames.length) {
      setErrorMessage("StartDate, End Date and Usernames required");
      return;
    }
    const startDateFormatted = formatDate(startDate);
    const endDateFormatted = formatDate(endDate);

    setIsLoading(true);
    await onSubmit({
      startDate: startDateFormatted,
      endDate: endDateFormatted,
      usernames,
    });
    setIsLoading(false);
  }

  function resetForm() {
    setUsernames([]);
    dbStore.setData("opti-gh-userlist", []);
    setStartDate(null);
    setEndDate(null);
    onReset();
  }

  function setUsernamesAndCache(usernames) {
    if (!usernames.length) {
      return;
    }

    setUsernames(usernames);
    dbStore.setData("opti-gh-userlist", usernames);
  }

  function resetDataCache() {
    if (!usernames.length) {
      return;
    }
    // author, startDate, endDate
    const startDateFormatted = formatDate(startDate);
    const endDateFormatted = formatDate(endDate);

    const resetCacheDataList = usernames.map((u) => {
      return {
        author: u,
        startDate: startDateFormatted,
        endDate: endDateFormatted,
      };
    });
    resetUserDataCache(resetCacheDataList)
      .then(() => handleSubmit())
      .catch((e) => {
        setErrorMessage(e.message);
      });
  }

  return (
    <div style={{ opacity: `${isLoading ? 60 : 100}%` }}>
      <div>
        <TeamModeSelectionDropdown
          chooseUsers={(users) => setUsernamesAndCache(users)}
        />
        <div className="tags-input-container">
          {usernames.map((tag, index) => (
            <div className="tag-item" key={index}>
              <span className="text">{tag}</span>
              <span className="close" onClick={() => removeTag(index)}>
                &times;
              </span>
            </div>
          ))}

          <input
            onKeyDown={handleKeyDown}
            onKeyDownCapture={handleUserPicketInputChange}
            type="text"
            className="tags-input"
            placeholder="Type in Github usernames"
            disabled={isLoading}
            onBlur={setNewValueInUsernamesInputList}
            list="userSuggestions"
          />

          <datalist id="userSuggestions">
            {userList.map((user, index) => {
              return (
                <option
                  value={user.username}
                  key={index}
                >{`${user.name} (${user.username})`}</option>
              );
            })}
          </datalist>

          {usernames.length ? (
            <Button
              disabled={isLoading}
              size="sm"
              variant="light"
              onClick={clearUsernames}
            >
              {" "}
              Clear All{" "}
            </Button>
          ) : (
            <></>
          )}
        </div>
      </div>

      <Form style={{ paddingTop: "10px" }}>
        <Row style={{ display: "inline-flex" }}>
          <div style={{ flex: 1 }}>
            <ReactDatePicker
              selected={startDate}
              onChange={(date) => {
                setStartDate(date);
                localStorage.setItem("opti-gh-startDate", date.toISOString());
              }}
              dateFormat="dd MMMM yyyy"
              placeholderText="Start Date"
              disabled={isLoading}
            />
          </div>

          <div style={{ flex: 1 }}>
            <ReactDatePicker
              selected={endDate}
              onChange={(date) => {
                setEndDate(date);
                localStorage.setItem("opti-gh-endDate", date.toISOString());
              }}
              dateFormat="dd MMMM yyyy"
              placeholderText="End Date"
              disabled={isLoading}
            />
          </div>
          <div style={{ flex: 3 }}>
            <Button disabled={isLoading} onClick={handleSubmit}>
              Submit
            </Button>
            <Button
              style={{ marginLeft: "20px" }}
              className="btn btn-light"
              disabled={isLoading}
              onClick={resetForm}
            >
              Reset Form
            </Button>
            <Button
              style={{ marginLeft: "20px" }}
              className="btn btn-light"
              disabled={isLoading}
              onClick={resetDataCache}
            >
              Refresh Cache
            </Button>
          </div>
        </Row>
        <Row style={{ marginTop: "1em" }}>
          <Col>
            {errorMessage ? (
              <Alert variant="danger">{errorMessage}</Alert>
            ) : (
              <></>
            )}
          </Col>
        </Row>
      </Form>
    </div>
  );
}

export default UserPicker;
