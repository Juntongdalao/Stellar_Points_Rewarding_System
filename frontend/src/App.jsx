import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import { ApiActivityIndicator, ApiToaster } from "./components/feedback";
import { AuthGate } from "./components/auth";

import LoginPage from "./pages/LoginPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import MyPointsPage from "./pages/MyPointsPage.jsx";
import MyTransactionsPage from "./pages/MyTransactionsPage.jsx";
import CashierDashboardPage from "./pages/CashierDashboardPage.jsx";
import ManagerUsersPage from "./pages/ManagerUsersPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import UserQrPage from "./pages/UserQrPage.jsx";
import UserPromotionsPage from "./pages/UserPromotionsPage.jsx";
import UserEventsPage from "./pages/UserEventsPage.jsx";
import EventDetailPage from "./pages/EventDetailPage.jsx";
import UserTransferPage from "./pages/UserTransferPage.jsx";
import UserRedeemPage from "./pages/UserRedeemPage";
import UserRedemptionQrPage from "./pages/UserRedemptionQrPage";
import ManagerTransactionsPage from "./pages/ManagerTransactionsPage.jsx";
import ManagerPromotionsPage from "./pages/ManagerPromotionsPage.jsx";
import ManagerTransactionDetailPage from "./pages/ManagerTransactionDetailPage.jsx";
import ManagerEventsPage from "./pages/ManagerEventsPage.jsx";
import OrganizerEventsPage from "./pages/OrganizerEventsPage.jsx";
import OrganizerEventDetailPage from "./pages/OrganizerEventDetailPage.jsx";

export default function App() {
  return (
    <div>
      <ApiActivityIndicator />
      <ApiToaster />
      <Navbar />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        {/* Regular user views */}
        <Route
            path="/me"
            element={
              <AuthGate minRole="regular">
                <DashboardPage />
              </AuthGate>
            }
        />
        <Route
            path="/me/profile"
            element={
              <AuthGate minRole="regular">
                <ProfilePage />
              </AuthGate>
            }
        />
        <Route
            path="/me/qr"
            element={
              <AuthGate minRole="regular">
                <UserQrPage />
              </AuthGate>
            }
        />
        <Route 
          path="/me/points"
          element={
            <AuthGate minRole="regular">
              <MyPointsPage />
            </AuthGate>
          }
        />
        <Route
          path="/me/transactions"
          element={
            <AuthGate minRole="regular">
              <MyTransactionsPage />
            </AuthGate>
          }
        />
        <Route
          path="/me/transfer"
          element={
            <AuthGate minRole="regular">
              <UserTransferPage />
            </AuthGate>
          }
        />
        <Route
            path="/me/promotions"
            element={
              <AuthGate minRole="regular">
                <UserPromotionsPage />
              </AuthGate>
            }
        />
        <Route
            path="/events"
            element={
              <AuthGate minRole="regular">
                <UserEventsPage />
              </AuthGate>
            }
        />
        <Route
            path="/events/:eventId"
            element={
              <AuthGate minRole="regular">
                <EventDetailPage />
              </AuthGate>
            }
        />
        <Route 
          path="/me/redeem" 
          element={
            <AuthGate minRole="regular">
              <UserRedeemPage />
            </AuthGate>
          }
        />
        <Route 
          path="/me/redemptions/:transactionId" 
          element={
            <AuthGate minRole="regular">
              <UserRedemptionQrPage />
            </AuthGate>
          } 
        />
        
        {/* Cashier */}
        <Route
            path="/cashier"
            element={
              <AuthGate minRole="cashier">
                <CashierDashboardPage />
              </AuthGate>
            }
        />
        <Route path="/cashier/transactions/new" element={<Navigate to="/cashier" replace />} />
        <Route path="/cashier/redemptions/process" element={<Navigate to="/cashier" replace />} />

        {/* Manager */}
        <Route
            path="/manager/users"
            element={
              <AuthGate minRole="manager">
                <ManagerUsersPage />
              </AuthGate>
            }
        />
        <Route
            path="/manager/transactions"
            element={
              <AuthGate minRole="manager">
                <ManagerTransactionsPage />
              </AuthGate>
            }
        />
        <Route
            path="/manager/promotions"
            element={
              <AuthGate minRole="manager">
                <ManagerPromotionsPage />
              </AuthGate>
            }
        />
        <Route
            path="/manager/transactions/:transactionId"
            element={
              <AuthGate minRole="manager">
                <ManagerTransactionDetailPage />
              </AuthGate>
            }
        />
        <Route
            path="/manager/events"
            element={
              <AuthGate minRole="manager">
                <ManagerEventsPage />
              </AuthGate>
            }
        />
        <Route
            path="/organizer/events"
            element={
              <AuthGate minRole="regular" requireRoles={["organizer"]}>
                <OrganizerEventsPage />
              </AuthGate>
            }
        />
        <Route
            path="/organizer/events/:eventId"
            element={
              <AuthGate minRole="regular" requireRoles={["organizer"]}>
                <OrganizerEventDetailPage />
              </AuthGate>
            }
        />
        {/* Default */}
        <Route path="/" element={<Navigate to="/me" replace />} />
        <Route path="*" element={<div>404 Not Found</div>} />
      </Routes>
    </div>
  );
}
