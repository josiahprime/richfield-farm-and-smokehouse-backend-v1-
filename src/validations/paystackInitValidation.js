// /validators/paystackInitSchema.ts
import Joi from "joi";

export const paystackInitSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  phone: Joi.string().required(),

  deliveryType: Joi.string().valid("home", "pickup").required(),

  address: Joi.string().when("deliveryType", {
    is: "home",
    then: Joi.required(),
    otherwise: Joi.optional().allow("")
  }),

  state: Joi.string().when("deliveryType", {
    is: "home",
    then: Joi.required(),
    otherwise: Joi.optional().allow("")
  }),

  city: Joi.string().when("deliveryType", {
    is: "home",
    then: Joi.required(),
    otherwise: Joi.optional().allow("")
  }),

  postalCode: Joi.string().when("deliveryType", {
    is: "home",
    then: Joi.required(),
    otherwise: Joi.optional().allow("")
  }),

  landmark: Joi.string().optional().allow(""),
  extraInstructions: Joi.string().optional().allow(""),
  pickupStation: Joi.string().optional().allow(""),


  items: Joi.array()
  .items(
    Joi.object({
      productId: Joi.string().uuid().required(),
      quantity: Joi.number().integer().min(1).required(),
      discountId: Joi.string().optional().allow(""),
    })
  )
  .required(),

});
