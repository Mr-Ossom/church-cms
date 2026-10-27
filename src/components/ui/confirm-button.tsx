"use client";

import { Button, type ButtonProps } from "@/components/ui/button";

export function ConfirmButton({
  message = "Are you sure? This cannot be undone.",
  ...props
}: ButtonProps & { message?: string }) {
  return (
    <Button
      type="submit"
      onClick={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
      {...props}
    />
  );
}
