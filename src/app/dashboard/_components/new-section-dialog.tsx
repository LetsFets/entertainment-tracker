"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldContent,
  FieldError,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectValue,
  SelectLabel,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { IconPlus } from "@tabler/icons-react";
import { useActionState, useEffect, useState } from "react";
import { createSection } from "@/actions/create-section";
import { Loader2Icon } from "lucide-react";

export function NewSectionDialog({ children }: { children: React.ReactNode }) {
  const [state, formAction, pending] = useActionState(createSection, {});
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!pending && !state?.error) {
      setOpen(false);
    }
  }, [pending, state?.error]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent showCloseButton={!pending}>
        <DialogHeader>
          <DialogTitle>Add new section</DialogTitle>
        </DialogHeader>

        <form action={formAction} id="new-section-form">
          <FieldGroup>
            <Field>
              <FieldContent>
                <FieldLabel htmlFor="header-input">Header</FieldLabel>
              </FieldContent>
              <Input name="header" id="header-input" minLength={3} />
            </Field>

            <Field orientation="responsive">
              <FieldContent>
                <FieldLabel htmlFor="type-input">Type</FieldLabel>
                <FieldDescription>The type of the new section</FieldDescription>
              </FieldContent>

              <Select name="type">
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent id="type-input">
                  <SelectGroup>
                    <SelectLabel>Section types</SelectLabel>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            <FieldError
              errors={state?.error?.split("\n").map((err) => ({
                message: err,
              }))}
            />
          </FieldGroup>

          <Input name="status" id="status-input" value="In Process" hidden />
          <Input
            name="target"
            id="status-input"
            value="5"
            type="number"
            hidden
          />
          <Input
            name="limit"
            id="limit-input"
            value="10"
            type="number"
            hidden
          />
          <Input
            name="reviewer"
            id="reviewer-input"
            value="Assign reviewer"
            hidden
          />
        </form>

        <DialogFooter>
          <Button type="submit" disabled={pending} form="new-section-form">
            {pending ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <IconPlus />
            )}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
