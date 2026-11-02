"use client";
import { useEffect, useState } from "react";
import { del, get, isLive, post } from "./api";

/** Imported OpenAPI specs (live mode): each operation is a tool `api.<slug>.<operation>`. */
export interface CustomApi {
  id: string;
  name: string;
  slug: string;
  baseUrl: string;
  authType: "none" | "bearer" | "header" | "query" | "basic";
  authName: string | null;
  hasSecret: boolean;
  enabled: boolean;
  operations: { id: string; method: string; path: string; summary: string; sideEffect: string; enabled: boolean; action: string }[];
}

export interface SpecPreview {
  title: string;
  baseUrl: string | null;
  auth: { type: CustomApi["authType"]; name?: string };
  operations: { id: string; method: string; path: string; summary: string; sideEffect: string }[];
}

const listeners = new Set<(l: CustomApi[]) => void>();
let cache: CustomApi[] = [];

export async function reloadCustomApis() {
  cache = (await get<{ data: CustomApi[] }>("/custom-apis")).data;
  for (const l of listeners) l(cache);
  return cache;
}

export function useCustomApis(): CustomApi[] {
  const [list, setList] = useState<CustomApi[]>(cache);
  useEffect(() => {
    if (!isLive()) return;
    listeners.add(setList);
    void reloadCustomApis().catch(() => {});
    return () => void listeners.delete(setList);
  }, []);
  return list;
}

export const previewSpec = (body: { spec?: string; specUrl?: string }) => post<SpecPreview>("/custom-apis/preview", body);

export async function importSpec(body: { spec?: string; specUrl?: string; name?: string; baseUrl?: string; authType?: string; authName?: string; secret?: string }) {
  const api = await post<CustomApi>("/custom-apis", body);
  await reloadCustomApis();
  return api;
}

export async function removeCustomApi(id: string) {
  await del(`/custom-apis/${id}`);
  await reloadCustomApis();
}
