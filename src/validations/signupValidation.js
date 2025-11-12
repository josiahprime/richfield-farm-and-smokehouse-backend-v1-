import Joi from "joi";

const signupSchema = Joi.object({
  username: Joi.string()
    .min(3)
    .max(30)
    .pattern(/^\S+$/) // ✅ no spaces allowed
    .required()
    .messages({
      "string.pattern.base": "Username cannot contain spaces.",
    }),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
});

export default signupSchema;
