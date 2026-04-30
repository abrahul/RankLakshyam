import React from "react";
import { Redirect } from "expo-router";
import { useAuth } from "../src/auth/auth-provider";
import Loading from "../src/components/ui/Loading";

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <Loading />;
  if (isAuthenticated) return <Redirect href="/(tabs)/home" />;
  return <Redirect href="/login" />;
}
