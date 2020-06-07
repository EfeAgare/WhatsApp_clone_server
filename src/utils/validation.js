export const validatePassword = (ctx, str) => {
  if (typeof str !== 'string') {
    throw TypeError(`${ctx} must be a string`);
  }

  validateLength(ctx, str, 6, 30);

  if (!/[a-zA-Z]+/.test(str)) {
    throw TypeError(`${ctx} must contain english letters`);
  }

  if (!/\d+/.test(str)) {
    throw TypeError(`${ctx} must contain numbers`);
  }

  // if (!/[^\da-zA-Z]+/.test(str)) {
  //   throw TypeError(`${ctx} must contain special charachters`);
  // }
};

export const validateLength = (ctx, str, ...args) => {
  let min, max;

  if (args.length === 1) {
    min = 0;
    max = args[0];
  } else {
    min = args[0];
    max = args[1];
  }

  if (typeof str !== 'string') {
    throw TypeError(`${ctx} must be a string`);
  }

  if (str.length < min) {
    throw TypeError(`${ctx} must be at least ${min} chars long`);
  }

  if (str.length > max) {
    throw TypeError(`${ctx} must contain ${max} chars at most`);
  }
};
