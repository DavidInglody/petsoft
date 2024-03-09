"use client";
import { useFormStatus } from "react-dom";
import { Button } from "./ui/button";

export default function AuthFormBtn({
  children,
}: {
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  return <Button disabled={pending}>{children}</Button>;
}
