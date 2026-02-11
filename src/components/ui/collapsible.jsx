import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
import { cn } from "../../lib/utils";

const Collapsible = CollapsiblePrimitive.Root;

const CollapsibleTrigger = ({ className, ...props }) => (
  <CollapsiblePrimitive.Trigger
    className={cn(
      "collapsible-trigger flex w-full items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm font-semibold text-neutral-900 transition hover:border-neutral-300",
      className
    )}
    {...props}
  />
);

const CollapsibleContent = ({ className, ...props }) => (
  <CollapsiblePrimitive.Content
    className={cn("collapsible-content mt-3 space-y-4", className)}
    {...props}
  />
);

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
