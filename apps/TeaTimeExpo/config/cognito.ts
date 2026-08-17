import { Amplify } from "aws-amplify";
const region = "ap-southeast-2";
const userPoolId = "ap-southeast-2_7xMoJ8i4B";
const userPoolClientId = "3k7m534msd10a7cjmlbsc3caf9";

if (!region || !userPoolId || !userPoolClientId) {
  throw new Error("Missing Cognito config.");
}

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId,
      userPoolClientId,
      loginWith: {
        email: true,
      },
    },
  },
});
