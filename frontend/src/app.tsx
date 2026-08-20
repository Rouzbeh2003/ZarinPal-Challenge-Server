import { useCallback } from "react";
import { useLocation, useNavigate, useRoutes } from "react-router-dom";
import { appRoutes } from "@/lib/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { OverviewPage } from "@/pages/overview-page";
import { PaymentHealthPage } from "@/pages/payment-health-page";
import { RetryAnalysisPage } from "@/pages/retry-analysis-page";
import { InsightsPage } from "@/pages/insights-page";
import { InsightDetailPage } from "@/pages/insight-detail-page";
import { AdvisorPage } from "@/pages/advisor-page";
import { TracePage } from "@/pages/trace-page";
import { DesignPage } from "@/pages/design-page";

export function App() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const handleNavigate = useCallback(
    (path: string) => {
      navigate(path);
      window.scrollTo(0, 0);
    },
    [navigate],
  );

  const routes = useRoutes([
    { path: appRoutes.overview, element: <OverviewPage /> },
    { path: appRoutes.paymentHealth, element: <PaymentHealthPage /> },
    { path: appRoutes.retryAnalysis, element: <RetryAnalysisPage /> },
    { path: appRoutes.insights, element: <InsightsPage /> },
    { path: "/insights/:insightId", element: <InsightDetailPage /> },
    { path: appRoutes.trace, element: <TracePage /> },
    { path: "/insights/:insightId/trace", element: <TracePage /> },
    { path: appRoutes.advisor, element: <AdvisorPage /> },
    { path: appRoutes.design, element: <DesignPage /> },
    { path: "*", element: <OverviewPage /> },
  ]);

  return (
    <AppShell currentPath={pathname} onNavigate={handleNavigate}>
      {routes}
    </AppShell>
  );
}