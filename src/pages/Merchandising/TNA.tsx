import { Navigate } from "react-router";

/**
 * Merchandising > TNA redirects to the full Planning TNA module
 * which already has TNA Templates, Calendar, and Tracker pages.
 */
export default function TNA() {
  return <Navigate to="/planning/tna-calendar" replace />;
}
