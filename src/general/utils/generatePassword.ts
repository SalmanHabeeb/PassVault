const generateRandomPassword = (): string => {
  let buffer = new Uint32Array(1);
  window.crypto.getRandomValues(buffer);
  const length = (buffer[0] % 9) + 8;
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";
  let password = [];
  buffer = new Uint32Array(length);

  window.crypto.getRandomValues(buffer);

  for (let i = 0; i < length; i++) {
    password.push(charset[buffer[i] % charset.length]);
  }
  console.log(password);

  return password.join("");
};

export {
  generateRandomPassword,
};
