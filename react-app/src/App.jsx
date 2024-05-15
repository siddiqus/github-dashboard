import Home from "./pages/Home";
import UserProfile from "./pages/UserProfile";

import { Container } from "react-bootstrap";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

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
  function goToHomePage() {
    router.navigate('/');
  }

  return (
    <Container>
      <br />
      <h1 style={{ cursor: "pointer" }} onClick={() => goToHomePage()}>
        Github Stats
      </h1>
      <hr />
      <RouterProvider router={router} />
    </Container>
  );
}

export default App;
