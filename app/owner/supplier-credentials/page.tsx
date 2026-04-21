import { redirect } from "next/navigation";

/**
 * Credential management is now inline on the Suppliers page.
 */
export default function SupplierCredentialsRedirectPage() {
  redirect("/owner/suppliers");
}
