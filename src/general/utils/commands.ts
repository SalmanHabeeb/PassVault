import { invoke } from "@tauri-apps/api";

const authenticate = async (password: string) => {
  try {
    let response = await invoke("authenticate", {
      masterPassword: password,
    });
    return response;
  } catch (error) {
    console.error(error);
    return false;
  }
};

const getAppConfig = async () => {
  try {
    let response = await invoke("start_app", {});
    return response;
  } catch (error) {
    console.error(error);
  }
};

export { authenticate, getAppConfig };
