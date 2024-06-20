import { Form, Row, Button, Alert, Col } from "react-bootstrap";
import { useState } from "react";
import ReactDatePicker from "react-datepicker";
import { formatDate } from "../../services/utils";
import userList from "../../../cmp-users.json";
import { TEAMS, TEAM_MEMBERS } from "../../constants";
import { resetUserDataCache } from "../../services/index";

import "./UserPicker.css";

function getDefaultDates() {
  const localStorageStartDate = localStorage.getItem("opti-gh-startDate");
  const localStorageEndDate = localStorage.getItem("opti-gh-endDate");

  let defaultEndDate = new Date();
  if (localStorageEndDate) {
    defaultEndDate = new Date(localStorageEndDate);
  } else {
    defaultEndDate.setDate(-1);
  }

  let defaultStartDate = new Date(
    defaultEndDate.getTime() - 6 * 30 * 24 * 60 * 60 * 1000
  );
  if (localStorageStartDate) {
    defaultStartDate = new Date(localStorageStartDate);
  } else {
    defaultStartDate.setDate(1);
  }

  return {
    defaultStartDate,
    defaultEndDate,
  };
}

function UserPicker({ onSubmit, onReset }) {
  const [usernames, setUsernames] = useState(
    JSON.parse(localStorage.getItem("opti-gh-userlist") || "[]")
  );

  const { defaultStartDate, defaultEndDate } = getDefaultDates();

  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);

  const [isLoading, setIsLoading] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  function setNewValueInUsernamesInputList(e) {
    const value = e.target.value;

    if (!value.trim()) return;

    let newNames;

    const selectedTeam = Object.values(TEAMS).find((v) => v === value);

    if (selectedTeam) {
      newNames = TEAM_MEMBERS[selectedTeam] || [];
    } else {
      newNames = value.split(",").map((v) => v.trim());
    }

    const names = Array.from(new Set([...usernames, ...newNames]));
    localStorage.setItem("opti-gh-userlist", JSON.stringify(names));
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
    localStorage.setItem("opti-gh-userlist", JSON.stringify(newUsernames));
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
    localStorage.setItem("opti-gh-userlist", JSON.stringify([]));
    setStartDate(null);
    setEndDate(null);
    onReset();
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
          // autocomplete="on"
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
