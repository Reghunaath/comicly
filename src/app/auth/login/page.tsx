import { Suspense } from "react";
import LoginPage from "@/frontend/auth/LoginPage";

export default function Page() {
  return (
    <Suspense>
      <LoginPage />
    </Suspense>
  );
}
