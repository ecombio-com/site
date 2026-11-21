import { logout } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <form action={logout}>
      <Button className="w-full" size="sm" type="submit" variant="outline">
        Sign out
      </Button>
    </form>
  );
}
