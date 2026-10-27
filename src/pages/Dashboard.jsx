import React from "react";
import { useAuth } from "../auth/AuthProvider";
import DashboardGerencial from "./dashboards/DashboardGerencial";
import DashboardTecnico from "./dashboards/DashboardTecnico";

// SUPER ADMIN (y el rol legacy "Administrador") administra usuarios, roles y bitácora:
// ve el Dashboard Técnico. El resto de roles con acceso al dashboard ve el Gerencial.
const isRolTecnico = (role) => {
  const normalized = String(role || "").toUpperCase().trim();
  return normalized.includes("SUPER ADMIN") || normalized === "ADMINISTRADOR";
};

export default function Dashboard() {
  const { role } = useAuth();
  return isRolTecnico(role) ? <DashboardTecnico /> : <DashboardGerencial />;
}
