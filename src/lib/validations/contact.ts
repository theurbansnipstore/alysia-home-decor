import { z } from "zod";

export const contactFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().toLowerCase().min(1, "Email is required").email("Enter a valid email address"),
  subject: z.string().trim().max(150).optional(),
  message: z.string().trim().min(1, "Message is required").max(2000),
});
export type ContactFormInput = z.infer<typeof contactFormSchema>;
