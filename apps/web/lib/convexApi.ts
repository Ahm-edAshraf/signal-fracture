import { makeFunctionReference } from "convex/server";

export const dashboardPublicState = makeFunctionReference<
  "query",
  { publicCode: string },
  unknown
>("dashboard:publicState");

export const createDemoSession = makeFunctionReference<
  "mutation",
  {
    operatorSecret: string;
    demoTenant: string;
    publicCode: string;
    roleCodes: {
      roleKey: "field" | "control" | "director";
      joinCodeHash: string;
      joinCodeExpiresAt: number;
    }[];
    now: number;
  },
  string
>("sessions:createDemo");

export const startDemoSession = makeFunctionReference<
  "mutation",
  { operatorSecret: string; sessionId: string; now: number },
  { status: "running" }
>("sessions:start");

export const controlDemoSession = makeFunctionReference<
  "mutation",
  {
    operatorSecret: string;
    sessionId: string;
    action: "pause" | "resume" | "abort";
    now: number;
  },
  { status?: "paused" | "running" | "resolving"; aborted?: boolean }
>("sessions:control");

export const resetDemoTenant = makeFunctionReference<
  "mutation",
  { operatorSecret: string; demoTenant: string },
  { deletedSessions: number; deletedDocuments: number }
>("reset:demoTenant");

export const currentOperatorSession = makeFunctionReference<
  "query",
  { operatorSecret: string; demoTenant: string },
  null | {
    sessionId: string;
    publicCode: string;
    status: string;
    pauseReason: "operator" | "delivery_failure" | "deadline" | null;
    roles: { roleKey: "field" | "control" | "director"; status: string }[];
  }
>("sessions:operatorCurrent");
