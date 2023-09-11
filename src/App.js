import React, { useState } from "react";
import logo from "./logo.svg";
import "./App.css";
import { useSelector } from "react-redux";

import HomePage from "./pages/home/home";
import LoginPage from "./pages/login/login";

function App() {
  let isLoggedIn = useSelector((state) => state.login.isLoggedIn);
  return isLoggedIn ? <HomePage /> : <LoginPage />;
}

export default App;
