import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import store from "./state/store.ts";
import { Provider } from "react-redux";
import "./fonts/codicon.ttf";
import "./promql.css";
import keycloak from "./keycloak.tsx";
import { ReactKeycloakProvider } from "@react-keycloak/web";
import LoginWrapper from "./LoginWrapper.tsx";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
     <ReactKeycloakProvider
      authClient={keycloak}
      initOptions={{
        onLoad: "login-required", // check silently if session exists
        pkceMethod: "S256",
        checkLoginIframe: false,
        // silentCheckSsoRedirectUri: import.meta.env.VITE_KEYCLOAK_SILENT_REDIRECT_URI,
        redirectUri: import.meta.env.VITE_KEYCLOAK_REDIRECT_URI, // post-login redirect
      }} 
       onEvent={(event, error) => { 
        console.log("[Keycloak event]", event); 
         if (error) { 
        console.error("[Keycloak error]", error); 
        } 
       }}
      onTokens={(tokens) => { 
       console.log("[Keycloak tokens]", tokens); 
       }} 
      >
      <Provider store={store}>
        <LoginWrapper> 
          <App />
         </LoginWrapper> 
      </Provider>
    </ReactKeycloakProvider>
  </React.StrictMode>
);
