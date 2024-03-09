"use client";
import { usePetContext } from "@/lib/hooks";

export default function Stats() {
  const { petsTotal } = usePetContext();
  return (
    <section className="text-center">
      <p className="text-2xl font-bol leading-6">{petsTotal}</p>
      <p className="opacity-80">current guests</p>
    </section>
  );
}
