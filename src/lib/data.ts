import { isDemoMode } from "@/lib/config";
import * as demo from "@/lib/demo/store";
import * as live from "@/lib/supabase/repository";
import type { DashboardFilter } from "@/lib/types";

export async function getCurrentUser() {
  return isDemoMode() ? demo.getCurrentUser() : live.getCurrentUser();
}

export async function getCurrentMember() {
  return isDemoMode() ? demo.getCurrentMember() : live.getCurrentMember();
}

export async function getHomeContext() {
  return isDemoMode() ? demo.getHomeContext() : live.getHomeContext();
}

export async function getFamilyAdmin() {
  return isDemoMode() ? demo.getFamilyAdmin() : live.getFamilyAdmin();
}

export async function listFamilySessions() {
  return isDemoMode() ? demo.listFamilySessions() : live.listFamilySessions();
}

export async function listFamilyAssignments() {
  return isDemoMode() ? demo.listFamilyAssignments() : live.listFamilyAssignments();
}

export async function getLibrary() {
  return isDemoMode() ? demo.getLibrary() : live.getLibrary();
}

export async function getDashboard(filter: DashboardFilter) {
  return isDemoMode() ? demo.getDashboard(filter) : live.getDashboard(filter);
}

export async function getSessionDetail(sessionId: string) {
  return isDemoMode() ? demo.getSessionDetail(sessionId) : live.getSessionDetail(sessionId);
}

export async function createFamily(name: string) {
  return isDemoMode() ? demo.createFamily(name) : live.createFamily(name);
}

export async function joinFamily(code: string) {
  return isDemoMode() ? demo.joinFamily(code) : live.joinFamily(code);
}

export async function addKid(name: string, age: number) {
  return isDemoMode() ? demo.addKid(name, age) : live.addKid(name, age);
}

export async function createInviteCode() {
  return isDemoMode() ? demo.createInviteCode() : live.createInviteCode();
}

export async function addBookFromSearch(input: {
  title: string;
  authors: string[];
  openLibraryKey: string | null;
  coverUrl: string | null;
  isbn: string | null;
}) {
  return isDemoMode() ? demo.addBookFromSearch(input) : live.addBookFromSearch(input);
}

export async function saveSchedule(input: {
  readerRotationMemberIds: string[];
  startDate: string;
  timeLocal: string;
  timezone: string;
  bookTiming: "ahead" | "after";
}) {
  return isDemoMode() ? demo.saveSchedule(input) : live.saveSchedule(input);
}

export async function cancelSession(sessionId: string) {
  return isDemoMode() ? demo.cancelSession(sessionId) : live.cancelSession(sessionId);
}

export async function updateSession(input: {
  sessionId: string;
  memberIds: string[];
  bookIds: string[];
  freeformTitles: string[];
  notes: string | null;
  status: "scheduled" | "completed" | "cancelled";
  reason?: string;
}) {
  return isDemoMode() ? demo.updateSession(input) : live.updateSession(input);
}

export async function ensureUpcomingSessions(daysAhead = 14) {
  return isDemoMode()
    ? demo.ensureUpcomingSessions(daysAhead)
    : live.ensureAllUpcomingSessions(daysAhead);
}

export function countOutboundEmails(): number {
  return isDemoMode() ? demo.getDemoState().outboundEmails.length : 0;
}
