import { useKeycloak } from '@react-keycloak/web';
import React, { useEffect } from 'react';
import Spinner from './spinner';
// import { useNavigate } from 'react-router-dom';

const AppWrapper = ({ children }: { children: React.ReactNode }) => {
  const { keycloak, initialized } = useKeycloak();
//   const navigate = useNavigate();

  // console.log('App wrapper started');

  useEffect(() => {
    // Listen to the Keycloak event onAuthSuccess
    const handleAuthSuccess = () => {
      // Store the token and other auth information in sessionStorage
      if (keycloak?.token) {
        sessionStorage.setItem('keycloakToken', keycloak.token);
        sessionStorage.setItem('keycloakUser', JSON.stringify(keycloak.tokenParsed));
        // console.log('Auth info stored in sessionStorage');
      }

      // Redirect to /targets page after authentication success
    //   navigate('/targets', { replace: true });
    };

    // Handle Keycloak events
    if (initialized && keycloak.authenticated) {
      // If authentication is successful, handle the auth success
      handleAuthSuccess();
    }
  }, [initialized, keycloak]);

  if (!initialized) {
    // console.log('Keycloak is not initialized');
    // return <div>Initializing Keycloak...</div>;
     return <Spinner />;    // keeps spinning
  }

  if (!keycloak.authenticated) {
    // console.log('User is not authenticated, redirecting to login...');
    keycloak.login(); // Trigger login to the keycloak login page
    return <div>Redirecting to login...</div>;
  }

  // If everything is fine, render the children (app components)
  return <>{children}</>;
};

export default AppWrapper;