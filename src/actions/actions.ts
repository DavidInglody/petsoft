"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { authSchema, petFormSchema, petIdSchema } from "@/lib/validations";
import { signIn, signOut } from "@/lib/auth-no-edge";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { checkAuth, getPetByPetId } from "@/lib/server-utils";
import { sleep } from "@/lib/utils";
import { Prisma } from "@prisma/client";
import { AuthError } from "next-auth";

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// --- user actions ---

export async function logIn(prevState: unknown, formData: unknown) {
  if (!(formData instanceof FormData)) {
    return {
      message: "Invalid form data.",
    };
  }

  try {
    await signIn("credentials", formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin": {
          return {
            message: "Invalid credentials.",
          };
        }
        default: {
          return {
            message: "could not log in.",
          };
        }
      }
    }
    throw error; // nextjs redirects thros error, so we need to rethrow it
  }
}

export async function logOut() {
  await signOut({ redirectTo: "/" });
}

export async function signUp(prevState: unknown, formData: unknown) {
  // check if formData is a FormData type
  if (!(formData instanceof FormData)) {
    return {
      message: "Invalid form data.",
    };
  }

  // convert formData to object
  const formDataObject = Object.fromEntries(formData.entries());

  // validate
  const validatedFormDataObject = authSchema.safeParse(formDataObject);
  if (!validatedFormDataObject.success) {
    return {
      message: "Invalid form data.",
    };
  }

  const { email, password } = validatedFormDataObject.data;
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    await prisma.user.create({
      data: {
        email,
        hashedPassword,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return {
          message: "Email already exists.",
        };
      }
    }
    return {
      message: "could not create account.",
    };
  }

  await signIn("credentials", formData);
}

// --- pet actions ---
export async function addPet(pet: unknown) {
  const session = await checkAuth();

  const validatedPet = petFormSchema.safeParse(pet);
  if (!validatedPet.success) {
    return {
      message: "Invalid pet data.",
    };
  }
  try {
    await prisma.pet.create({
      data: {
        ...validatedPet.data,
        user: {
          connect: {
            id: session.user.id,
          },
        },
      },
    });
  } catch (error) {
    return {
      message: "could not add pet.",
    };
  }

  revalidatePath("/app", "layout");
}

export async function editPet(petId: unknown, newPetData: unknown) {
  const session = await checkAuth();

  const validatedPetId = petIdSchema.safeParse(petId);
  const validatedPet = petFormSchema.safeParse(newPetData);
  if (!validatedPetId.success || !validatedPet.success) {
    return {
      message: "Invalid pet data.",
    };
  }

  const pet = await getPetByPetId(validatedPetId.data);

  if (!pet) {
    return {
      message: "Pet not found.",
    };
  }

  if (pet.userId !== session.user.id) {
    return {
      message: "Unauthorized.",
    };
  }

  try {
    await prisma.pet.update({
      where: { id: validatedPetId.data },
      data: validatedPet.data,
    });
  } catch (error) {
    return {
      message: "could not edit pet.",
    };
  }
  revalidatePath("/app", "layout");
}

export async function checkoutPet(petId: unknown) {
  // auth check
  const session = await checkAuth();

  // validation
  const validatePetId = petIdSchema.safeParse(petId);
  if (!validatePetId.success) {
    return {
      message: "Invalid pet data.",
    };
  }

  // authorization check (user owns pet)
  const pet = await getPetByPetId(validatePetId.data);

  if (!pet) {
    return {
      message: "Pet not found.",
    };
  }

  if (pet.userId !== session.user?.id) {
    return {
      message: "Unauthorized.",
    };
  }

  // database mutation
  try {
    await prisma.pet.delete({
      where: { id: validatePetId.data },
    });
  } catch (error) {
    return {
      message: "could not checkout pet.",
    };
  }
  revalidatePath("/app", "layout");
}

// --- payment actions ---

export async function createCheckoutSession() {
  // auth check
  const session = await checkAuth();

  const checkoutSession = await stripe.checkout.sessions.create({
    customer_email: session.user.email,
    line_items: [
      {
        price: "price_1OrliwFbwrLuWs2XSFGpgHFm",
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${process.env.CANONICAL_URL}/payment?success=true`,
    cancel_url: `${process.env.CANONICAL_URL}/payment?canceled=true`,
  });

  //redirect user to stripe checkout
  redirect(checkoutSession.url);
}
