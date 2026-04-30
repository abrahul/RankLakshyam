import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { GOOGLE_WEB_CLIENT_ID } from "../utils/config";

WebBrowser.maybeCompleteAuthSession();

export function useGoogleAuth() {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID,
  });

  return {
    request,
    response,
    promptAsync,
    idToken: response?.type === "success" ? response.params.id_token : null,
  };
}
