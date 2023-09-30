import { configureStore } from "@reduxjs/toolkit";
import loginReducer from "./loginSlice";
import homeReducer from "../pages/home/state/homeSlice";

const store = configureStore({
  reducer: {
    login: loginReducer,
    home: homeReducer,
  },
});

export default store;
