import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MainLayout } from '../components/Layout/MainLayout';
import { AssetsPage } from '../components/Pages/AssetsPage';
import { DashboardPage } from '../components/Pages/DashboardPage';
import { ExpensesPage } from '../components/Pages/ExpensesPage';
import { LoansPage } from '../components/Pages/LoansPage';

export function MainContainer() {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine current tab based on route
  const getCurrentTab = () => {
    switch (location.pathname) {
      case '/':
      case '/dashboard':
        return 0;
      case '/assets':
        return 1;
      case '/loans':
        return 2;
      case '/expenses':
        return 3;
      default:
        return 0;
    }
  };

  const [currentTab, setCurrentTab] = useState(getCurrentTab());
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleTabChange = (newValue: number) => {
    setCurrentTab(newValue);

    // Navigate to corresponding route
    switch (newValue) {
      case 0:
        navigate('/dashboard');
        break;
      case 1:
        navigate('/assets');
        break;
      case 2:
        navigate('/loans');
        break;
      case 3:
        navigate('/expenses');
        break;
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSettingsClick = () => {
    handleMenuClose();
    navigate('/settings');
  };

  const handleAssetTypesClick = () => {
    handleMenuClose();
    navigate('/asset-types');
  };

  // Render appropriate page content based on current tab
  const renderPageContent = () => {
    switch (currentTab) {
      case 0:
        return <DashboardPage />;
      case 1:
        return <AssetsPage />;
      case 2:
        return <LoansPage />;
      case 3:
        return <ExpensesPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <MainLayout
      currentTab={currentTab}
      onTabChange={handleTabChange}
      anchorEl={anchorEl}
      onMenuOpen={handleMenuOpen}
      onMenuClose={handleMenuClose}
      onSettingsClick={handleSettingsClick}
      onAssetTypesClick={handleAssetTypesClick}
    >
      {renderPageContent()}
    </MainLayout>
  );
}
