"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { TripProvider } from "@/lib/trip";
import { LoadingScreen } from "@/components/ui/screen-state";

/**
 * Everything behind the PIN. One fetch of the current trip is shared by all the
 * screens in this group — nothing is cached to the device, so leaving and
 * coming back always asks the server what is true now.
 */
export default function DriverLayout({ children }: LayoutProps<"/">) {
  const router = useRouter();
  const { driver, loading } = useAuth();

  useEffect(() => {
    if (!loading && !driver) router.replace("/login");
  }, [loading, driver, router]);

  if (loading || !driver) return <LoadingScreen />;

  return <TripProvider>{children}</TripProvider>;
}
