import React from "react";
import ReactDOM from "react-dom/client";

import "bootstrap/dist/css/bootstrap.css";
import "./index.css";

import "react-datepicker/dist/react-datepicker.css";

import App from "./App";

import userList from "../../cmp-users.json";
import { TEAMS } from "./constants";

for (const key of Object.keys(TEAMS)) {
  userList.push({ username: TEAMS[key], name: TEAMS[key] });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
