import { createSlice } from "@reduxjs/toolkit";
// import { RootState } from "./store";

export const loginSlice = createSlice({
  name: "login",
  initialState: {
    isLoggedIn: sessionStorage.getItem("isLoggedIn") ? true : false,
  },
  reducers: {
    setIsLoggedIn: (state, action) => {
      state.isLoggedIn = action.payload;
    },
  },
});

export const loginActions = loginSlice.actions;

export default loginSlice.reducer;
