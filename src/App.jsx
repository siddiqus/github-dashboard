import { Button, Container, Navbar } from "react-bootstrap";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Home from "./pages/Home";
import Settings from "./pages/Settings";
import UserProfile from "./pages/UserProfile";

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
  function goToHomePage() {
    router.navigate("/");
  }

  return (
    <Container style={{ minHeight: "100vh", paddingTop: "80px" }}>
      <Navbar
        bg="light"
        variant="light"
        className="px-3"
        fixed="top"
        style={{
          width: "100%",
          borderBottom: "1px solid lightgray",
        }}
      >
        <Container>
          <Navbar.Brand
            style={{ cursor: "pointer" }}
            onClick={() => goToHomePage()}
          >
            Github Stats
          </Navbar.Brand>
          <Navbar.Collapse className="justify-content-end">
            <Button
              variant="outline-secondary"
              onClick={() => router.navigate("/settings")}
            >
              Settings
            </Button>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <RouterProvider router={router} />
    </Container>
  );
}

export default App;
