import { createContext, useContext } from "react";

const AuthContext = createContext(
{ 
    authState: 
    {
        id:"", 
        token:"", 
        signedIn:false
    }, 
    setAuthState: () => {} 
});

export { AuthContext };