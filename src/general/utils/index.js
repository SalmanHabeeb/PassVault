const generatePassword = require("./generatePassword");

const showHelp = (id) => {
  const tooltip = document.getElementById(id);
  if (tooltip) {
    tooltip.style.display = "block";
  }
};

const hideHelp = (id) => {
  const tooltip = document.getElementById(id);
  if (tooltip) {
    tooltip.style.display = "none";
  }
};

module.exports = {
  generatePassword,
  showHelp,
  hideHelp,
};
