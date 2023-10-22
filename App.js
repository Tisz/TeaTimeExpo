import React, {useState} from 'react';

import User from './Interfaces/User';

//context
import { AuthContext} from './context/AuthContext';

import { AppNav } from './navigators/AppNav'

export default function App() {
  const [authState, setAuthState] = useState({
    id:'',
    token:'',
    signedIn:false
  });

  return (
    <>
      <AuthContext.Provider value={[authState, setAuthState]}>
        <AppNav/>
      </AuthContext.Provider>
    </>
  );
}