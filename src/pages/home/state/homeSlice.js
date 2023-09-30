import { createSlice } from "@reduxjs/toolkit";

export const homeSlice = createSlice({
  name: "home",
  initialState: {
    prevOp: null,
    prevOpArgs: [],
  },
  reducers: {
    setPrevOp: (state, action) => {
      state.prevOp = action.payload;
    },
    setPrevOpArgs: (state, action) => {
      state.prevOp = action.payload;
    },
  },
});

export const homeActions = homeSlice.actions;

export default homeSlice.reducer;
