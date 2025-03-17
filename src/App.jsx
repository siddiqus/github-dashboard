import Home from "./pages/Home";
import UserProfile from "./pages/UserProfile";
import Settings from "./pages/Settings";

import { Container, Button } from "react-bootstrap";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/users/:username",
    element: <UserProfile />,
  },
  {
    path: "/settings",
    element: <Settings />,
  },
]);

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Initialize state from localStorage
    return localStorage.getItem("gh_stats_app_isAuthenticated") === "true";
  });

  // const authenticate = useCallback(() => {
  //   // If already authenticated, don't show prompts
  //   if (localStorage.getItem("gh_stats_app_isAuthenticated") === "true") {
  //     setIsAuthenticated(true);
  //     return;
  //   }

  //   const username = prompt("Username:");
  //   if (username === null) return;

  //   const password = prompt("Password:");
  //   if (password === null) return;

  //   if (
  //     username === import.meta.env.VITE_AUTH_USERNAME &&
  //     password === import.meta.env.VITE_AUTH_PASSWORD
  //   ) {
  //     setIsAuthenticated(true);
  //     localStorage.setItem("gh_stats_app_isAuthenticated", "true");
  //   } else {
  //     alert("Invalid credentials");
  //     authenticate();
  //   }
  // }, []);

  useEffect(() => {
    // if (!isAuthenticated) {
    //   authenticate();
    // }
    setIsAuthenticated(true)
  }, []); // Remove isAuthenticated from dependencies

  function goToHomePage() {
    router.navigate("/");
  }

  if (!isAuthenticated) {
    return <div>Not Authenticated</div>;
  }

  return (
    <Container style={{ minHeight: "100vh" }}>
      <div className="d-flex justify-content-between align-items-center" style={{ paddingTop: "20px" }}>
        <h2
          style={{
            cursor: "pointer",
          }}
          onClick={() => goToHomePage()}
        >
          Github Stats
        </h2>
        <Button variant="light" onClick={() => router.navigate("/settings")}>
          Settings
        </Button>
      </div>
      <hr />
      <RouterProvider router={router} />
    </Container>
  );
}

export default App;
