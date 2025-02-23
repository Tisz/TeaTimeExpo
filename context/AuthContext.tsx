import { createContext, Dispatch, SetStateAction, useContext } from "react";

const AuthContext = createContext(
{ 
    authState: 
    {
        id:"", 
        token:"", 
        signedIn:false
    }, 
    setAuthState: {} as Dispatch<SetStateAction<{ id: string; token: string; signedIn: boolean; }>> 
});

export { AuthContext };