const showHelp = (id: string): void => {
  const tooltip = document.getElementById(id);
  if (tooltip) {
    tooltip.style.display = "block";
  }
};

const hideHelp = (id: string): void => {
  const tooltip = document.getElementById(id);
  if (tooltip) {
    tooltip.style.display = "none";
  }
};

export {
  showHelp,
  hideHelp,
};
