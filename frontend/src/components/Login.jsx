// src/components/Login.jsx
import { useEffect } from "react";
import { auth } from "../app/lib/firebase";
import "firebaseui/dist/firebaseui.css";

function Login() {
  useEffect(() => {
    // Dynamically import firebaseui only on client-side to avoid SSR issues
    import("firebaseui").then((firebaseui) => {
      const ui =
        firebaseui.auth.AuthUI.getInstance() ||
        new firebaseui.auth.AuthUI(auth);

      const uiConfig = {
        signInFlow: "popup", // Use popup instead of redirect
        signInOptions: [
          "google.com", // Only Google sign-in
        ],
        callbacks: {
          signInSuccessWithAuthResult: () => {
            // Return false to avoid redirect, let React handle the state change
            return false;
          },
        },
      };

      ui.start("#firebaseui-auth-container", uiConfig);
    });
  }, []);

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h2>Sign in to PromptDeck</h2>
      <div id="firebaseui-auth-container"></div>
    </div>
  );
}

export default Login;
