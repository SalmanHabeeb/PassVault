import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface LoginState {
  isLoggedIn: boolean;
  settings: boolean;
}

const initialState: LoginState = {
  isLoggedIn: sessionStorage.getItem("isLoggedIn") ? true : false,
  settings: sessionStorage.getItem("settings") ? true : false,
};

const loginSlice = createSlice({
  name: "login",
  initialState,
  reducers: {
    setIsLoggedIn: (state, action: PayloadAction<boolean>) => {
      state.isLoggedIn = action.payload;
    },
    setSettings: (state, action: PayloadAction<boolean>) => {
      state.settings = action.payload;
    },
  },
});

export const loginActions = loginSlice.actions;

export default loginSlice.reducer;
