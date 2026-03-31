import Header from "./components/Header";
import Body from "./components/Body";
import Footer from "./components/Footer";
import { useAuthContext } from "@asgardeo/auth-react";
import "./index.css";

function App() {
  const { state, signIn, signOut, getAccessToken } = useAuthContext();

  return (
    <>
      <Header />

      <div style={{ textAlign: "center", margin: "20px 0" }}>
        {!state?.isAuthenticated ? (
          <button onClick={() => signIn()}>Login</button>
        ) : (
          <button onClick={() => signOut()}>Logout</button>
        )}
      </div>

      {state?.isAuthenticated && <Body getAccessToken={getAccessToken} />}

      <Footer />
    </>
  );
}

export default App;