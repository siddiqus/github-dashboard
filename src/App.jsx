import Home from "./pages/Home";
import UserProfile from "./pages/UserProfile";

import { Container } from "react-bootstrap";
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
]);

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Initialize state from localStorage
    return localStorage.getItem("gh_stats_app_isAuthenticated") === "true";
  });

  const authenticate = useCallback(() => {
    // If already authenticated, don't show prompts
    if (localStorage.getItem("gh_stats_app_isAuthenticated") === "true") {
      setIsAuthenticated(true);
      return;
    }

    const username = prompt("Username:");
    if (username === null) return;

    const password = prompt("Password:");
    if (password === null) return;

    if (
      username === import.meta.env.VITE_AUTH_USERNAME &&
      password === import.meta.env.VITE_AUTH_PASSWORD
    ) {
      setIsAuthenticated(true);
      localStorage.setItem("gh_stats_app_isAuthenticated", "true");
    } else {
      alert("Invalid credentials");
      authenticate();
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      authenticate();
    }
  }, []); // Remove isAuthenticated from dependencies

  function goToHomePage() {
    router.navigate("/");
  }

  if (!isAuthenticated) {
    return <div>Not Authenticated</div>;
  }

  return (
    <Container style={{ minHeight: "100vh" }}>
      <h2
        style={{
          paddingTop: "20px",
          cursor: "pointer",
        }}
        onClick={() => goToHomePage()}
      >
        Github Stats
      </h2>
      <hr />
      <RouterProvider router={router} />
    </Container>
  );
}

export default App;
