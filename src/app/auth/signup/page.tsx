import { Suspense } from "react";
import SignupPage from "@/frontend/auth/SignupPage";

export default function Page() {
  return (
    <Suspense>
      <SignupPage />
    </Suspense>
  );
}
